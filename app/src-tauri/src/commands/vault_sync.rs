use crate::commands::utils::resolve_peer;
use crate::crypto::state::CryptoState;
use crate::db::DbConnection;
use crate::TelegramState;
use grammers_client::types::InputMessage;
use grammers_tl_types as tl;
use serde::{Deserialize, Serialize};
use tauri::{AppHandle, Emitter, State};
use zeroize::Zeroize;

pub const VAULT_MESSAGE_PREFIX: &str = "TDVAULT2:";

/// Fallback scan limit — only used when Telegram Search API returns nothing.
/// In normal usage the search-based fast-path finds the vault instantly.
const MESSAGE_SCAN_LIMIT: usize = 1_000;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CloudVaultEnvelope {
    pub version: u8,
    pub updated_at: i64,
    pub bundle_base64: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CloudVaultStatus {
    pub available: bool,
    pub updated_at: Option<i64>,
}

async fn client_and_peer(
    state: &TelegramState,
) -> Result<(grammers_client::Client, grammers_client::types::Peer), String> {
    let client = state
        .client
        .lock()
        .await
        .clone()
        .ok_or_else(|| "Connect to Telegram before syncing vault".to_string())?;
    let peer = resolve_peer(&client, None, &state.peer_cache).await?;
    Ok((client, peer))
}

/// Convert a grammers Peer to a TL InputPeer for raw TL function calls.
/// Matches the pattern used in api_routes.rs.
fn peer_to_input_peer(peer: &grammers_client::types::Peer) -> Result<tl::enums::InputPeer, String> {
    use grammers_client::types::Peer;
    match peer {
        Peer::User(u) => {
            let (id, access_hash) = match &u.raw {
                tl::enums::User::User(usr) => (usr.id, usr.access_hash.unwrap_or(0)),
                tl::enums::User::Empty(usr) => (usr.id, 0),
            };
            Ok(tl::enums::InputPeer::User(tl::types::InputPeerUser {
                user_id: id,
                access_hash,
            }))
        }
        Peer::Channel(c) => Ok(tl::enums::InputPeer::Channel(
            tl::types::InputPeerChannel {
                channel_id: c.raw.id,
                access_hash: c.raw.access_hash.ok_or("No access hash for channel")?,
            },
        )),
        _ => Err("Unsupported peer type for vault sync".to_string()),
    }
}

/// Fast-path: use Telegram's own Search API to find vault message by text prefix.
/// This works regardless of how many other messages exist in Saved Messages —
/// even 1,000,000 image uploads won't bury the key.
async fn search_vault_message(
    client: &grammers_client::Client,
    peer: &grammers_client::types::Peer,
) -> Option<(i32, String)> {
    let input_peer = match peer_to_input_peer(peer) {
        Ok(p) => p,
        Err(e) => {
            log::warn!("vault search: peer conversion failed: {e}");
            return None;
        }
    };

    let result = client
        .invoke(&tl::functions::messages::Search {
            peer: input_peer,
            q: VAULT_MESSAGE_PREFIX.to_string(),
            from_id: None,
            saved_peer_id: None,
            saved_reaction: None,
            top_msg_id: None,
            filter: tl::enums::MessagesFilter::InputMessagesFilterEmpty,
            min_date: 0,
            max_date: 0,
            offset_id: 0,
            add_offset: 0,
            limit: 10, // we only ever have 1, but grab a few for cleanup
            max_id: 0,
            min_id: 0,
            hash: 0,
        })
        .await;

    let messages = match result {
        Ok(tl::enums::messages::Messages::Messages(m)) => m.messages,
        Ok(tl::enums::messages::Messages::Slice(m)) => m.messages,
        Ok(tl::enums::messages::Messages::ChannelMessages(m)) => m.messages,
        _ => return None,
    };

    for raw_msg in messages {
        if let tl::enums::Message::Message(msg) = raw_msg {
            if msg.message.starts_with(VAULT_MESSAGE_PREFIX) {
                return Some((msg.id, msg.message));
            }
        }
    }
    None
}

/// Slow fallback: scan last MESSAGE_SCAN_LIMIT messages for a vault prefix.
/// Used only when the search fast-path returns nothing (e.g. Telegram search
/// index not yet updated for a brand-new message).
async fn vault_messages_scan(
    client: &grammers_client::Client,
    peer: &grammers_client::types::Peer,
) -> Result<Vec<(i32, String)>, String> {
    let mut messages = client.iter_messages(peer).limit(MESSAGE_SCAN_LIMIT);
    let mut found = Vec::new();
    while let Some(message) = messages.next().await.map_err(|error| error.to_string())? {
        if message.text().starts_with(VAULT_MESSAGE_PREFIX) {
            found.push((message.id(), message.text().to_string()));
        }
    }
    Ok(found)
}

/// Find the best available vault message: Search API first, then scan fallback.
async fn find_vault_message(
    client: &grammers_client::Client,
    peer: &grammers_client::types::Peer,
) -> Result<Option<(i32, String)>, String> {
    // Fast path — Telegram Search API (works with any number of messages)
    if let Some(found) = search_vault_message(client, peer).await {
        return Ok(Some(found));
    }
    // Slow fallback — linear scan of last 1000 messages
    let found = vault_messages_scan(client, peer).await?;
    Ok(found.into_iter().next())
}

/// Pin the vault message in Saved Messages so it is visible at the top and
/// cannot get buried under image uploads.
/// Errors are non-fatal — the vault is still usable via search even if pinning fails.
async fn pin_vault_message(
    client: &grammers_client::Client,
    peer: &grammers_client::types::Peer,
    message_id: i32,
) {
    let input_peer = match peer_to_input_peer(peer) {
        Ok(p) => p,
        Err(e) => {
            log::warn!("Could not convert peer for pinning vault (non-fatal): {e}");
            return;
        }
    };

    if let Err(e) = client
        .invoke(&tl::functions::messages::UpdatePinnedMessage {
            silent: true,       // no "pinned message" service notification
            unpin: false,
            pm_oneside: true,   // one-sided pin (Saved Messages is always one-sided)
            peer: input_peer,
            id: message_id,
        })
        .await
    {
        log::warn!("Could not pin vault message (non-fatal): {e}");
    } else {
        log::info!("Vault message pinned in Saved Messages (id={message_id})");
    }
}

fn parse_vault_message(message: &str) -> Result<CloudVaultEnvelope, String> {
    let payload = if let Some(p) = message.strip_prefix(VAULT_MESSAGE_PREFIX) {
        p
    } else if let Some(idx) = message.find(VAULT_MESSAGE_PREFIX) {
        &message[idx + VAULT_MESSAGE_PREFIX.len()..]
    } else if let Some(idx) = message.find("TDVAULT:") {
        &message[idx + "TDVAULT:".len()..]
    } else {
        return Err("Not a Telegram Drive vault message".to_string());
    };

    let trimmed = payload.trim();
    if trimmed.starts_with('{') {
        serde_json::from_str::<CloudVaultEnvelope>(trimmed)
            .map_err(|e| format!("Malformed cloud vault envelope: {e}"))
    } else {
        // Fallback for legacy / direct base64
        Ok(CloudVaultEnvelope {
            version: 2,
            updated_at: 0,
            bundle_base64: trimmed.to_string(),
        })
    }
}

pub async fn upload_vault_bundle_to_saved_messages(
    state: &TelegramState,
    bundle: Vec<u8>,
) -> Result<CloudVaultStatus, String> {
    let (client, peer) = client_and_peer(state).await?;

    // Collect all old vault message IDs to delete after the new one is sent.
    // Use both search (fast) and scan (thorough) to ensure nothing is missed.
    let mut old_ids: Vec<i32> = Vec::new();
    if let Some((id, _)) = search_vault_message(&client, &peer).await {
        old_ids.push(id);
    }
    let scanned = vault_messages_scan(&client, &peer).await.unwrap_or_default();
    for (id, _) in scanned {
        if !old_ids.contains(&id) {
            old_ids.push(id);
        }
    }

    let bundle_base64 = base64::Engine::encode(
        &base64::engine::general_purpose::STANDARD,
        &bundle,
    );
    let now = chrono::Utc::now().timestamp();
    let envelope = CloudVaultEnvelope {
        version: 2,
        updated_at: now,
        bundle_base64,
    };
    let json_str = serde_json::to_string(&envelope).map_err(|e| e.to_string())?;
    let message_text = format!("{VAULT_MESSAGE_PREFIX}{json_str}");

    let sent = client
        .send_message(&peer, InputMessage::new().text(message_text))
        .await
        .map_err(|e| format!("Failed to send cloud vault to Telegram: {e}"))?;

    // Pin the new vault message so it is always findable regardless of
    // how many images are uploaded afterwards.
    pin_vault_message(&client, &peer, sent.id()).await;

    // Retain historical vault messages for disaster recovery instead of deleting them all.
    // Only prune if more than 5 old messages exist to prevent excessive message buildup.
    if old_ids.len() > 5 {
        for chunk in old_ids[5..].chunks(100) {
            if let Err(error) = client.delete_messages(&peer, chunk).await {
                log::warn!("Unable to remove superseded vault sync messages: {error}");
            }
        }
    }

    log::info!("Cloud vault successfully updated and pinned in Telegram Saved Messages");
    Ok(CloudVaultStatus {
        available: true,
        updated_at: Some(now),
    })
}

pub async fn get_cloud_vault_status_internal(
    state: &TelegramState,
) -> Result<CloudVaultStatus, String> {
    let Ok((client, peer)) = client_and_peer(state).await else {
        return Ok(CloudVaultStatus {
            available: false,
            updated_at: None,
        });
    };

    if let Ok(Some((_, message))) = find_vault_message(&client, &peer).await {
        if let Ok(env) = parse_vault_message(&message) {
            return Ok(CloudVaultStatus {
                available: true,
                updated_at: if env.updated_at > 0 {
                    Some(env.updated_at)
                } else {
                    None
                },
            });
        }
    }

    Ok(CloudVaultStatus {
        available: false,
        updated_at: None,
    })
}

#[tauri::command]
pub async fn cmd_get_cloud_vault_status(
    state: State<'_, TelegramState>,
) -> Result<CloudVaultStatus, String> {
    get_cloud_vault_status_internal(state.inner()).await
}

#[tauri::command]
pub async fn cmd_backup_vault_to_cloud(
    state: State<'_, TelegramState>,
    crypto_state: State<'_, CryptoState>,
    mut passphrase: String,
) -> Result<CloudVaultStatus, String> {
    if !crypto_state.get_features().core_available {
        passphrase.zeroize();
        return Err("[VAULT_UNAVAILABLE] Encryption core is not ready".to_string());
    }
    if !crypto_state.vault_exists() {
        passphrase.zeroize();
        return Err("No local vault exists to back up".to_string());
    }

    let bundle = crypto_state
        .export_recovery(passphrase.as_bytes())
        .map_err(|e| {
            passphrase.zeroize();
            format!("Failed to export vault recovery bundle: {e}")
        })?;
    passphrase.zeroize();

    upload_vault_bundle_to_saved_messages(state.inner(), bundle).await
}

#[tauri::command]
pub async fn cmd_restore_vault_from_cloud(
    state: State<'_, TelegramState>,
    crypto_state: State<'_, CryptoState>,
    db_pool: State<'_, DbConnection>,
    app_handle: AppHandle,
    mut passphrase: String,
) -> Result<(), String> {
    if !crypto_state.get_features().core_available {
        passphrase.zeroize();
        return Err("[VAULT_UNAVAILABLE] Encryption core is not ready".to_string());
    }

    let (client, peer) = client_and_peer(state.inner()).await?;
    let (_, message) = find_vault_message(&client, &peer)
        .await?
        .ok_or_else(|| "No cloud vault backup found in Saved Messages".to_string())?;

    let env = parse_vault_message(&message)?;
    let mut bundle = base64::Engine::decode(
        &base64::engine::general_purpose::STANDARD,
        &env.bundle_base64,
    )
    .map_err(|e| format!("Invalid cloud vault bundle encoding: {e}"))?;

    let result = crypto_state
        .import_recovery(&bundle, passphrase.as_bytes())
        .map_err(|e| {
            let err_str = e.to_string();
            if err_str.contains("WrongKeyOrCorrupt")
                || err_str.contains("auth_failed")
                || err_str.contains("WRONG_KEY")
            {
                "Incorrect passphrase. Please try again.".to_string()
            } else {
                err_str
            }
        });

    bundle.zeroize();
    passphrase.zeroize();

    if result.is_ok() {
        if let Ok(wrapping_key) = crypto_state.get_current_wrapping_key() {
            let pool = db_pool.inner().clone();
            let _ = crate::commands::fs::sync_decrypted_file_inventory(pool, &wrapping_key).await;
        }
        let _ = app_handle.emit("vault-unlocked", ());
        log::info!("Vault successfully restored from Telegram cloud backup!");
    }

    result
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DeepVaultScanResult {
    pub success: bool,
    pub restored: bool,
    pub candidates_found: usize,
    pub message: String,
}

#[tauri::command]
pub async fn cmd_deep_scan_and_recover_vault(
    state: State<'_, TelegramState>,
    crypto_state: State<'_, CryptoState>,
    db_pool: State<'_, DbConnection>,
    app_handle: AppHandle,
    mut passphrase: String,
) -> Result<DeepVaultScanResult, String> {
    if !crypto_state.get_features().core_available {
        passphrase.zeroize();
        return Err("[VAULT_UNAVAILABLE] Encryption core is not ready".to_string());
    }

    let (client, peer) = client_and_peer(state.inner()).await?;

    // 1. Collect all candidate messages from Search API (up to 50) and linear scan
    let mut candidate_messages: Vec<String> = Vec::new();

    // Fast-path search
    if let Ok(input_peer) = peer_to_input_peer(&peer) {
        let search_result = client
            .invoke(&tl::functions::messages::Search {
                peer: input_peer,
                q: "TDVAULT".to_string(),
                from_id: None,
                saved_peer_id: None,
                saved_reaction: None,
                top_msg_id: None,
                filter: tl::enums::MessagesFilter::InputMessagesFilterEmpty,
                min_date: 0,
                max_date: 0,
                offset_id: 0,
                add_offset: 0,
                limit: 50,
                max_id: 0,
                min_id: 0,
                hash: 0,
            })
            .await;

        let messages = match search_result {
            Ok(tl::enums::messages::Messages::Messages(m)) => m.messages,
            Ok(tl::enums::messages::Messages::Slice(m)) => m.messages,
            Ok(tl::enums::messages::Messages::ChannelMessages(m)) => m.messages,
            _ => Vec::new(),
        };

        for raw_msg in messages {
            if let tl::enums::Message::Message(msg) = raw_msg {
                if msg.message.contains("TDVAULT") && !candidate_messages.contains(&msg.message) {
                    candidate_messages.push(msg.message);
                }
            }
        }
    }

    // Also scan recent messages in Saved Messages for any TDVAULT prefix
    let scanned = vault_messages_scan(&client, &peer).await.unwrap_or_default();
    for (_, text) in scanned {
        if !candidate_messages.contains(&text) {
            candidate_messages.push(text);
        }
    }

    let candidates_count = candidate_messages.len();
    if candidate_messages.is_empty() {
        passphrase.zeroize();
        return Ok(DeepVaultScanResult {
            success: false,
            restored: false,
            candidates_found: 0,
            message: "No vault backups found in Telegram Saved Messages.".to_string(),
        });
    }

    // 2. Iterate through each candidate message, parse bundle, and attempt import_recovery
    for message in &candidate_messages {
        let Ok(env) = parse_vault_message(message) else {
            continue;
        };
        let Ok(mut bundle) = base64::Engine::decode(
            &base64::engine::general_purpose::STANDARD,
            &env.bundle_base64,
        ) else {
            continue;
        };

        let result = crypto_state.import_recovery(&bundle, passphrase.as_bytes());
        bundle.zeroize();

        if result.is_ok() {
            passphrase.zeroize();
            if let Ok(wrapping_key) = crypto_state.get_current_wrapping_key() {
                let pool = db_pool.inner().clone();
                let _ = crate::commands::fs::sync_decrypted_file_inventory(pool, &wrapping_key).await;
            }
            let _ = app_handle.emit("vault-unlocked", ());
            log::info!("Deep scan successfully recovered and restored vault from Telegram cloud backup!");
            return Ok(DeepVaultScanResult {
                success: true,
                restored: true,
                candidates_found: candidates_count,
                message: format!(
                    "Successfully recovered vault from Telegram cloud backup (tested against {candidates_count} candidates)!"
                ),
            });
        }
    }

    passphrase.zeroize();
    Ok(DeepVaultScanResult {
        success: false,
        restored: false,
        candidates_found: candidates_count,
        message: format!(
            "Found {candidates_count} vault backup candidate(s) in Saved Messages, but your passphrase did not match any of them."
        ),
    })
}

