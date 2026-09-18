use crate::{
    db::DbConnection,
    sync_engine::{
        config::{self, SyncPair, SyncSettings},
        restart_sync_engine, SyncEngine, SyncStatus,
    },
};
use serde::Serialize;
use sqlite::State as SqliteState;
use std::path::Path;
use tauri::{Emitter, Manager, State};

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SyncLogEntry {
    pub id: i64,
    pub pair_id: Option<i64>,
    pub action: String,
    pub relative_path: Option<String>,
    pub detail: Option<String>,
    pub created_at: i64,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SyncConflict {
    pub pair_id: i64,
    pub relative_path: String,
    pub local_path: String,
    pub label: Option<String>,
}

#[allow(dead_code)]
fn sync_paths_overlap(left: &Path, right: &Path) -> bool {
    #[cfg(any(target_os = "windows", target_os = "macos"))]
    {
        let components = |path: &Path| {
            path.components()
                .map(|component| component.as_os_str().to_string_lossy().to_lowercase())
                .collect::<Vec<_>>()
        };
        let left = components(left);
        let right = components(right);
        left.starts_with(&right) || right.starts_with(&left)
    }
    #[cfg(not(any(target_os = "windows", target_os = "macos")))]
    {
        left.starts_with(right) || right.starts_with(left)
    }
}

#[tauri::command]
pub async fn cmd_get_sync_settings(db: State<'_, DbConnection>) -> Result<SyncSettings, String> {
    config::load_settings(db.inner().clone()).await
}

#[tauri::command]
pub async fn cmd_toggle_sync(
    app: tauri::AppHandle,
    db: State<'_, DbConnection>,
    enabled: bool,
) -> Result<SyncSettings, String> {
    app.state::<SyncEngine>().shutdown_and_wait().await?;

    config::set_setting(
        db.inner().clone(),
        "sync_enabled".to_string(),
        if enabled { "true" } else { "false" }.to_string(),
    )
    .await?;

    if enabled {
        app.state::<SyncEngine>().start().await?;
    } else {
        {
            let engine = app.state::<SyncEngine>();
            let mut current = engine.status.write().await;
            current.running = false;
            current.enabled = false;
            current.active_pairs = 0;
            current.pending_ops = 0;
            let snapshot = current.clone();
            let _ = app.emit("sync-status-changed", snapshot);
        }
        let _ = app.emit("sync-progress", &crate::sync_engine::executor::SyncProgressPayload::idle());
        crate::upload_service::stop_foreground_service(None, None, None);
    }

    let settings = config::load_settings(db.inner().clone()).await?;
    notify_android_auto_backup(enabled, settings.wifi_only, settings.charging_only);
    Ok(settings)
}

#[tauri::command]
pub async fn cmd_add_sync_pair(
    app: tauri::AppHandle,
    db: State<'_, DbConnection>,
    local_path: String,
    channel_id: i64,
    label: Option<String>,
    sync_direction: Option<String>,
    encryption: Option<String>,
) -> Result<SyncPair, String> {
    if !Path::new(&local_path).exists() {
        let _ = std::fs::create_dir_all(&local_path);
    }
    let canonical = crate::sync_engine::safe_canonicalize_root(Path::new(&local_path))
        .map_err(|error| format!("Folder is unavailable: {error}"))?;
    if !canonical.is_dir() {
        return Err("Sync path must be an existing directory".to_string());
    }
    let direction = sync_direction.unwrap_or_else(|| "bidirectional".to_string());
    if !matches!(
        direction.as_str(),
        "bidirectional" | "upload_only" | "download_only"
    ) {
        return Err("Invalid sync direction".to_string());
    }
    let enc = encryption.unwrap_or_else(|| "inherit".to_string());
    let local_path = canonical.to_string_lossy().into_owned();
    let created_at = chrono::Utc::now().timestamp();
    let folder_key = channel_id.to_string();
    let canonical_for_check = canonical.clone();
    let local_path_for_db = local_path.clone();
    let folder_key_for_db = folder_key.clone();
    let label_for_db = label.clone();
    let direction_for_db = direction.clone();
    let enc_for_db = enc.clone();
    let (id, fallback_label) = crate::db::with_connection(db.inner().clone(), move |connection| {
        let mut existing_pairs = connection
            .prepare("SELECT id, local_path, channel_id FROM sync_pairs")
            .map_err(|error| error.to_string())?;
        let mut existing_matching_id: Option<i64> = None;
        while existing_pairs.next().map_err(|error| error.to_string())? == SqliteState::Row {
            let existing_id: i64 =
                existing_pairs.read(0).map_err(|error| error.to_string())?;
            let existing_path: String =
                existing_pairs.read(1).map_err(|error| error.to_string())?;
            let existing_channel: i64 =
                existing_pairs.read(2).map_err(|error| error.to_string())?;

            let is_same_path = canonical_for_check == Path::new(&existing_path)
                || local_path_for_db == existing_path
                || crate::sync_engine::safe_canonicalize_root(Path::new(&existing_path))
                    .map(|p| p == canonical_for_check)
                    .unwrap_or(false);

            if is_same_path {
                existing_matching_id = Some(existing_id);
                continue;
            }

            if existing_channel == channel_id {
                return Err("A Telegram channel can be mapped to only one local folder".to_string());
            }
        }
        drop(existing_pairs);

        let mut channel = connection
            .prepare("SELECT name FROM folder_metadata WHERE channel_id = ?")
            .map_err(|error| error.to_string())?;
        channel
            .bind((1, channel_id))
            .map_err(|error| error.to_string())?;
        if channel.next().map_err(|error| error.to_string())? != SqliteState::Row {
            return Err("Selected Telegram channel is not in the folder list".to_string());
        }
        let fallback_label = channel.read::<String, _>(0).ok();
        drop(channel);

        if let Some(existing_id) = existing_matching_id {
            let mut statement = connection.prepare(
                "UPDATE sync_pairs SET channel_id = ?, folder_key = ?, label = ?, sync_direction = ?, is_active = 1, encryption = ? WHERE id = ?"
            ).map_err(|error| error.to_string())?;
            statement.bind((1, channel_id)).map_err(|error| error.to_string())?;
            statement.bind((2, folder_key_for_db.as_str())).map_err(|error| error.to_string())?;
            statement.bind::<(usize, Option<&str>)>((3, label_for_db.as_deref().or(fallback_label.as_deref()))).map_err(|error| error.to_string())?;
            statement.bind((4, direction_for_db.as_str())).map_err(|error| error.to_string())?;
            statement.bind((5, enc_for_db.as_str())).map_err(|error| error.to_string())?;
            statement.bind((6, existing_id)).map_err(|error| error.to_string())?;
            statement.next().map_err(|error| error.to_string())?;
            return Ok((existing_id, fallback_label));
        }

        let mut statement = connection.prepare(
            "INSERT INTO sync_pairs (local_path, channel_id, folder_key, label, sync_direction, is_active, created_at, encryption) VALUES (?, ?, ?, ?, ?, 1, ?, ?)",
        ).map_err(|error| error.to_string())?;
        statement
            .bind((1, local_path_for_db.as_str()))
            .map_err(|error| error.to_string())?;
        statement
            .bind((2, channel_id))
            .map_err(|error| error.to_string())?;
        statement
            .bind((3, folder_key_for_db.as_str()))
            .map_err(|error| error.to_string())?;
        statement
            .bind::<(usize, Option<&str>)>((4, label_for_db.as_deref().or(fallback_label.as_deref())))
            .map_err(|error| error.to_string())?;
        statement
            .bind((5, direction_for_db.as_str()))
            .map_err(|error| error.to_string())?;
        statement
            .bind((6, created_at))
            .map_err(|error| error.to_string())?;
        statement
            .bind((7, enc_for_db.as_str()))
            .map_err(|error| error.to_string())?;
        statement.next().map_err(|error| error.to_string())?;
        drop(statement);
        let mut id_statement = connection
            .prepare("SELECT last_insert_rowid()")
            .map_err(|error| error.to_string())?;
        id_statement.next().map_err(|error| error.to_string())?;
        let id = id_statement
            .read::<i64, _>(0)
            .map_err(|error| error.to_string())?;
        Ok((id, fallback_label))
    }).await?;
    // When a folder is added, auto-enable master backup
    config::set_setting(
        db.inner().clone(),
        "sync_enabled".to_string(),
        "true".to_string(),
    )
    .await?;
    restart_sync_engine(&app).await?;
    Ok(SyncPair {
        id,
        local_path,
        channel_id,
        folder_key,
        label: label.or(fallback_label),
        sync_direction: direction,
        is_active: true,
        created_at,
        encryption: Some(enc),
    })
}

#[cfg(test)]
mod tests {
    use super::sync_paths_overlap;
    use std::path::Path;

    #[test]
    fn rejects_nested_sync_roots_without_rejecting_siblings() {
        let root = Path::new("/sync/root");
        assert!(sync_paths_overlap(root, Path::new("/sync/root/nested")));
        assert!(sync_paths_overlap(root, root));
        assert!(!sync_paths_overlap(root, Path::new("/sync/root-two")));
    }
}

#[tauri::command]
pub async fn cmd_get_sync_pairs(db: State<'_, DbConnection>) -> Result<Vec<SyncPair>, String> {
    config::load_pairs(db.inner().clone(), false).await
}

#[tauri::command]
pub async fn cmd_remove_sync_pair(
    app: tauri::AppHandle,
    db: State<'_, DbConnection>,
    pair_id: i64,
) -> Result<(), String> {
    app.state::<SyncEngine>().shutdown_and_wait().await?;
    let remaining_active: i64 = crate::db::with_connection(db.inner().clone(), move |connection| {
        connection
            .execute("BEGIN IMMEDIATE TRANSACTION")
            .map_err(|error| error.to_string())?;
        let deletion = (|| {
            let mut statement = connection
                .prepare("DELETE FROM sync_state WHERE pair_id = ?")
                .map_err(|error| error.to_string())?;
            statement
                .bind((1, pair_id))
                .map_err(|error| error.to_string())?;
            statement.next().map_err(|error| error.to_string())?;
            drop(statement);
            let mut statement = connection
                .prepare("DELETE FROM sync_pairs WHERE id = ?")
                .map_err(|error| error.to_string())?;
            statement
                .bind((1, pair_id))
                .map_err(|error| error.to_string())?;
            statement.next().map_err(|error| error.to_string())?;
            Ok::<(), String>(())
        })();
        match deletion {
            Ok(()) => connection
                .execute("COMMIT")
                .map_err(|error| error.to_string())?,
            Err(error) => {
                let _ = connection.execute("ROLLBACK");
                return Err(error);
            }
        }
        let mut count_stmt = connection
            .prepare("SELECT COUNT(*) FROM sync_pairs WHERE is_active = 1")
            .map_err(|error| error.to_string())?;
        count_stmt.next().map_err(|error| error.to_string())?;
        let count = count_stmt.read::<i64, _>(0).unwrap_or(0);
        Ok(count)
    })
    .await?;

    if remaining_active == 0 {
        config::set_setting(
            db.inner().clone(),
            "sync_enabled".to_string(),
            "false".to_string(),
        )
        .await?;
        {
            let engine = app.state::<SyncEngine>();
            let mut current = engine.status.write().await;
            current.running = false;
            current.enabled = false;
            current.active_pairs = 0;
            current.pending_ops = 0;
            let snapshot = current.clone();
            let _ = app.emit("sync-status-changed", snapshot);
        }
        let _ = app.emit("sync-progress", &crate::sync_engine::executor::SyncProgressPayload::idle());
        Ok(())
    } else {
        app.state::<SyncEngine>().start().await
    }
}

#[tauri::command]
pub async fn cmd_toggle_sync_pair(
    app: tauri::AppHandle,
    db: State<'_, DbConnection>,
    pair_id: i64,
    is_active: bool,
) -> Result<Vec<SyncPair>, String> {
    let active_count: i64 = crate::db::with_connection(db.inner().clone(), move |connection| {
        let mut statement = connection
            .prepare("UPDATE sync_pairs SET is_active = ? WHERE id = ?")
            .map_err(|error| error.to_string())?;
        statement
            .bind((1, if is_active { 1 } else { 0 }))
            .map_err(|error| error.to_string())?;
        statement
            .bind((2, pair_id))
            .map_err(|error| error.to_string())?;
        statement.next().map_err(|error| error.to_string())?;
        drop(statement);

        let mut count_stmt = connection
            .prepare("SELECT COUNT(*) FROM sync_pairs WHERE is_active = 1")
            .map_err(|error| error.to_string())?;
        count_stmt.next().map_err(|error| error.to_string())?;
        let count = count_stmt.read::<i64, _>(0).unwrap_or(0);
        Ok(count)
    })
    .await?;

    app.state::<SyncEngine>().shutdown_and_wait().await?;

    if active_count > 0 {
        config::set_setting(
            db.inner().clone(),
            "sync_enabled".to_string(),
            "true".to_string(),
        )
        .await?;
        app.state::<SyncEngine>().start().await?;
    } else {
        config::set_setting(
            db.inner().clone(),
            "sync_enabled".to_string(),
            "false".to_string(),
        )
        .await?;
        {
            let engine = app.state::<SyncEngine>();
            let mut current = engine.status.write().await;
            current.running = false;
            current.enabled = false;
            current.active_pairs = 0;
            current.pending_ops = 0;
            let snapshot = current.clone();
            let _ = app.emit("sync-status-changed", snapshot);
        }
        let _ = app.emit("sync-progress", &crate::sync_engine::executor::SyncProgressPayload::idle());
    }

    let settings = config::load_settings(db.inner().clone()).await?;
    notify_android_auto_backup(active_count > 0, settings.wifi_only, settings.charging_only);
    config::load_pairs(db.inner().clone(), false).await
}

#[tauri::command]
pub async fn cmd_update_sync_pair(
    app: tauri::AppHandle,
    db: State<'_, DbConnection>,
    pair_id: i64,
    channel_id: Option<i64>,
    label: Option<String>,
    sync_direction: Option<String>,
    encryption: Option<String>,
    is_active: Option<bool>,
) -> Result<SyncPair, String> {
    app.state::<SyncEngine>().shutdown_and_wait().await?;
    let updated = crate::db::with_connection(db.inner().clone(), move |connection| {
        let mut select = connection
            .prepare("SELECT id, local_path, channel_id, folder_key, label, sync_direction, is_active, created_at, encryption FROM sync_pairs WHERE id = ?")
            .map_err(|e| e.to_string())?;
        select.bind((1, pair_id)).map_err(|e| e.to_string())?;
        if select.next().map_err(|e| e.to_string())? != SqliteState::Row {
            return Err("Folder sync pair not found".to_string());
        }
        let local_path: String = select.read(1).map_err(|e| e.to_string())?;
        let cur_channel_id: i64 = select.read(2).map_err(|e| e.to_string())?;
        let cur_folder_key: String = select.read(3).map_err(|e| e.to_string())?;
        let cur_label: Option<String> = select.read::<Option<String>, _>(4).ok().flatten();
        let cur_direction: String = select.read(5).map_err(|e| e.to_string())?;
        let cur_active: bool = select.read::<i64, _>(6).unwrap_or(0) != 0;
        let cur_created_at: i64 = select.read(7).map_err(|e| e.to_string())?;
        let cur_encryption: Option<String> = select.read::<Option<String>, _>(8).ok().flatten();
        drop(select);

        let new_channel_id = channel_id.unwrap_or(cur_channel_id);
        let new_folder_key = if channel_id.is_some() {
            new_channel_id.to_string()
        } else {
            cur_folder_key
        };
        let new_label = if label.is_some() { label } else { cur_label };
        let new_direction = sync_direction.unwrap_or(cur_direction);
        let new_active = is_active.unwrap_or(cur_active);
        let new_encryption = encryption.or(cur_encryption).unwrap_or_else(|| "inherit".to_string());

        let mut update = connection
            .prepare("UPDATE sync_pairs SET channel_id = ?, folder_key = ?, label = ?, sync_direction = ?, is_active = ?, encryption = ? WHERE id = ?")
            .map_err(|e| e.to_string())?;
        update.bind((1, new_channel_id)).map_err(|e| e.to_string())?;
        update.bind((2, new_folder_key.as_str())).map_err(|e| e.to_string())?;
        update.bind::<(usize, Option<&str>)>((3, new_label.as_deref())).map_err(|e| e.to_string())?;
        update.bind((4, new_direction.as_str())).map_err(|e| e.to_string())?;
        update.bind((5, if new_active { 1 } else { 0 })).map_err(|e| e.to_string())?;
        update.bind((6, new_encryption.as_str())).map_err(|e| e.to_string())?;
        update.bind((7, pair_id)).map_err(|e| e.to_string())?;
        update.next().map_err(|e| e.to_string())?;

        Ok(SyncPair {
            id: pair_id,
            local_path,
            channel_id: new_channel_id,
            folder_key: new_folder_key,
            label: new_label,
            sync_direction: new_direction,
            is_active: new_active,
            created_at: cur_created_at,
            encryption: Some(new_encryption),
        })
    }).await?;

    restart_sync_engine(&app).await?;
    Ok(updated)
}

#[tauri::command]
pub async fn cmd_get_sync_status(engine: State<'_, SyncEngine>) -> Result<SyncStatus, String> {
    Ok(engine.status.read().await.clone())
}

#[tauri::command]
pub async fn cmd_get_sync_conflicts(
    db: State<'_, DbConnection>,
) -> Result<Vec<SyncConflict>, String> {
    crate::db::with_connection(db.inner().clone(), |connection| {
    let mut statement = connection.prepare(
        "SELECT s.pair_id, s.relative_path, p.local_path, p.label FROM sync_state s JOIN sync_pairs p ON p.id = s.pair_id WHERE s.sync_status = 'conflict' ORDER BY s.pair_id, s.relative_path",
    ).map_err(|error| error.to_string())?;
    let mut conflicts = Vec::new();
    while statement.next().map_err(|error| error.to_string())? == SqliteState::Row {
        conflicts.push(SyncConflict {
            pair_id: statement.read(0).map_err(|error| error.to_string())?,
            relative_path: statement.read(1).map_err(|error| error.to_string())?,
            local_path: statement.read(2).map_err(|error| error.to_string())?,
            label: statement.read::<Option<String>, _>(3).ok().flatten(),
        });
    }
    Ok(conflicts)
    }).await
}

#[tauri::command]
pub async fn cmd_get_sync_log(
    db: State<'_, DbConnection>,
    limit: Option<i64>,
) -> Result<Vec<SyncLogEntry>, String> {
    crate::db::with_connection(db.inner().clone(), move |connection| {
    let mut statement = connection.prepare(
        "SELECT id, pair_id, action, relative_path, detail, created_at FROM sync_log ORDER BY id DESC LIMIT ?",
    ).map_err(|error| error.to_string())?;
    statement
        .bind((1, limit.unwrap_or(100).clamp(1, 500)))
        .map_err(|error| error.to_string())?;
    let mut entries = Vec::new();
    while statement.next().map_err(|error| error.to_string())? == SqliteState::Row {
        entries.push(SyncLogEntry {
            id: statement.read(0).map_err(|error| error.to_string())?,
            pair_id: statement.read::<Option<i64>, _>(1).ok().flatten(),
            action: statement.read(2).map_err(|error| error.to_string())?,
            relative_path: statement.read::<Option<String>, _>(3).ok().flatten(),
            detail: statement.read::<Option<String>, _>(4).ok().flatten(),
            created_at: statement.read(5).map_err(|error| error.to_string())?,
        });
    }
    Ok(entries)
    }).await
}

#[tauri::command]
pub async fn cmd_resolve_conflict(
    app: tauri::AppHandle,
    db: State<'_, DbConnection>,
    pair_id: i64,
    path: String,
    resolution: String,
) -> Result<(), String> {
    if !matches!(
        resolution.as_str(),
        "keep_local" | "keep_remote" | "keep_both"
    ) {
        return Err("Unknown conflict resolution".to_string());
    }
    app.state::<SyncEngine>().shutdown_and_wait().await?;
    let path_for_db = path.clone();
    let resolution_for_db = resolution.clone();
    crate::db::with_connection(db.inner().clone(), move |connection| {
        let mut statement = connection.prepare(
            "UPDATE sync_state SET sync_status = ? WHERE pair_id = ? AND relative_path = ? AND sync_status = 'conflict'",
        ).map_err(|error| error.to_string())?;
        statement
            .bind((1, resolution_for_db.as_str()))
            .map_err(|error| error.to_string())?;
        statement
            .bind((2, pair_id))
            .map_err(|error| error.to_string())?;
        statement
            .bind((3, path_for_db.as_str()))
            .map_err(|error| error.to_string())?;
        statement.next().map_err(|error| error.to_string())?;
        Ok(())
    }).await?;
    config::log_sync(
        db.inner().clone(),
        Some(pair_id),
        "resolve_conflict".to_string(),
        Some(path),
        Some(resolution),
    )
    .await;
    app.state::<SyncEngine>().start().await
}

#[tauri::command]
pub async fn cmd_trigger_sync_now(engine: State<'_, SyncEngine>) -> Result<bool, String> {
    Ok(engine.trigger_sync_now())
}

#[tauri::command]
pub async fn cmd_update_sync_settings(
    app: tauri::AppHandle,
    db: State<'_, DbConnection>,
    wifi_only: Option<bool>,
    charging_only: Option<bool>,
    media_only: Option<bool>,
    debounce_ms: Option<u64>,
    encryption: Option<String>,
) -> Result<SyncSettings, String> {
    if let Some(w) = wifi_only {
        config::set_setting(db.inner().clone(), "sync_wifi_only".into(), w.to_string()).await?;
    }
    if let Some(c) = charging_only {
        config::set_setting(db.inner().clone(), "sync_charging_only".into(), c.to_string()).await?;
    }
    if let Some(m) = media_only {
        config::set_setting(db.inner().clone(), "sync_media_only".into(), m.to_string()).await?;
    }
    if let Some(d) = debounce_ms {
        config::set_setting(db.inner().clone(), "sync_debounce_ms".into(), d.to_string()).await?;
    }
    if let Some(e) = encryption {
        config::set_setting(db.inner().clone(), "sync_encryption".into(), e).await?;
    }
    let updated = config::load_settings(db.inner().clone()).await?;
    if updated.enabled {
        restart_sync_engine(&app).await?;
    }
    notify_android_auto_backup(updated.enabled, updated.wifi_only, updated.charging_only);
    Ok(updated)
}

#[derive(Debug, Clone, Serialize, serde::Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PresetFolderInfo {
    pub id: String,
    pub name: String,
    pub description: String,
    pub path: String,
    pub exists: bool,
    pub category: String,
    pub icon: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub item_count: Option<usize>,
}

#[cfg(target_os = "android")]
fn get_android_gallery_albums() -> Option<Vec<PresetFolderInfo>> {
    let context = ndk_context::android_context();
    let vm = unsafe { jni::JavaVM::from_raw(context.vm().cast()) }.ok()?;
    let mut env = vm.attach_current_thread().ok()?;
    let main_class = crate::jni_cache::get_main_activity_jclass()?;
    let value = env
        .call_static_method(&main_class, "getGalleryAlbumsJson", "()Ljava/lang/String;", &[])
        .ok()?
        .l()
        .ok()?;
    let jstring = jni::objects::JString::from(value);
    let json: String = env.get_string(&jstring).ok()?.into();

    #[derive(serde::Deserialize)]
    struct RawAlbum {
        #[serde(rename = "bucketId")]
        bucket_id: String,
        name: String,
        path: String,
        count: usize,
    }

    let raw_albums: Vec<RawAlbum> = serde_json::from_str(&json).ok()?;
    if raw_albums.is_empty() {
        return None;
    }

    let mut albums = Vec::new();
    for album in raw_albums {
        let p = Path::new(&album.path);
        if !p.is_dir() || p.join(".nomedia").is_file() {
            continue;
        }
        let folder_name = p.file_name().and_then(|f| f.to_str()).unwrap_or(&album.name);
        if crate::sync_engine::is_non_gallery_dir_name(folder_name) {
            continue;
        }

        let lower = album.name.to_ascii_lowercase();
        let lower_path = album.path.to_ascii_lowercase();

        let (category, icon) = if lower.contains("camera") || lower_path.contains("/dcim/camera") || lower == "dcim" {
            ("camera", "camera")
        } else if lower.contains("screenshot") || lower_path.contains("screenshots") {
            ("screenshots", "image")
        } else if lower.contains("whatsapp") {
            if lower.contains("video") {
                ("whatsapp", "video")
            } else {
                ("whatsapp", "message-circle")
            }
        } else if lower.contains("video") || lower.contains("movie") || lower_path.contains("/movies") {
            ("video", "video")
        } else if lower.contains("download") {
            ("downloads", "download")
        } else {
            ("album", "image")
        };

        let description = if album.count == 1 {
            "1 item in Gallery".to_string()
        } else {
            format!("{} items in Gallery", album.count)
        };

        let clean_id = album.name
            .chars()
            .map(|c| if c.is_alphanumeric() { c.to_ascii_lowercase() } else { '_' })
            .collect::<String>();

        albums.push(PresetFolderInfo {
            id: format!("album_{}_{clean_id}", album.bucket_id),
            name: album.name,
            description,
            path: album.path,
            exists: true,
            category: category.into(),
            icon: icon.into(),
            item_count: Some(album.count),
        });
    }

    if albums.is_empty() {
        None
    } else {
        Some(albums)
    }
}

#[tauri::command]
pub async fn cmd_get_preset_folders() -> Result<Vec<PresetFolderInfo>, String> {
    #[cfg(target_os = "android")]
    {
        if let Some(albums) = get_android_gallery_albums() {
            return Ok(albums);
        }
    }

    let mut presets = Vec::new();

    // Android presets fallback
    let android_roots = ["/storage/emulated/0", "/sdcard"];
    for root in android_roots {
        let dcim_camera = format!("{root}/DCIM/Camera");
        let dcim = format!("{root}/DCIM");
        let screenshots = format!("{root}/Pictures/Screenshots");
        let dcim_screenshots = format!("{root}/DCIM/Screenshots");
        let whatsapp_images = format!("{root}/Android/media/com.whatsapp/WhatsApp/Media/WhatsApp Images");
        let whatsapp_video = format!("{root}/Android/media/com.whatsapp/WhatsApp/Media/WhatsApp Video");
        let whatsapp_legacy = format!("{root}/WhatsApp/Media/WhatsApp Images");
        let downloads = format!("{root}/Download");
        let documents = format!("{root}/Documents");
        let pictures = format!("{root}/Pictures");

        if Path::new(root).exists() {
            // Camera
            let (cam_path, cam_exists) = if Path::new(&dcim_camera).is_dir() {
                (dcim_camera, true)
            } else if Path::new(&dcim).is_dir() {
                (dcim, true)
            } else {
                (dcim_camera, false)
            };
            presets.push(PresetFolderInfo {
                id: "camera".into(),
                name: "Camera Roll / Photos".into(),
                description: "Photos and videos captured with your camera".into(),
                path: cam_path,
                exists: cam_exists,
                category: "camera".into(),
                icon: "camera".into(),
                item_count: None,
            });

            // Screenshots
            let (shot_path, shot_exists) = if Path::new(&screenshots).is_dir() {
                (screenshots, true)
            } else if Path::new(&dcim_screenshots).is_dir() {
                (dcim_screenshots, true)
            } else {
                (screenshots, false)
            };
            presets.push(PresetFolderInfo {
                id: "screenshots".into(),
                name: "Screenshots".into(),
                description: "Screen captures from your device".into(),
                path: shot_path,
                exists: shot_exists,
                category: "screenshots".into(),
                icon: "image".into(),
                item_count: None,
            });

            // WhatsApp Media (Received photos only; Sent/Private are excluded)
            let (wa_path, wa_exists) = if Path::new(&whatsapp_images).is_dir() {
                (whatsapp_images, true)
            } else if Path::new(&whatsapp_legacy).is_dir() {
                (whatsapp_legacy, true)
            } else {
                (whatsapp_images, false)
            };
            presets.push(PresetFolderInfo {
                id: "whatsapp_images".into(),
                name: "WhatsApp Images".into(),
                description: "Received WhatsApp photos (sent files excluded)".into(),
                path: wa_path,
                exists: wa_exists,
                category: "whatsapp".into(),
                icon: "message-circle".into(),
                item_count: None,
            });

            if Path::new(&whatsapp_video).is_dir() {
                presets.push(PresetFolderInfo {
                    id: "whatsapp_video".into(),
                    name: "WhatsApp Videos".into(),
                    description: "Received WhatsApp videos (sent files excluded)".into(),
                    path: whatsapp_video,
                    exists: true,
                    category: "whatsapp".into(),
                    icon: "video".into(),
                    item_count: None,
                });
            }

            // Downloads
            let dl_exists = Path::new(&downloads).is_dir();
            presets.push(PresetFolderInfo {
                id: "downloads".into(),
                name: "Downloads".into(),
                description: "Files and media downloaded from browsers and apps".into(),
                path: downloads,
                exists: dl_exists,
                category: "downloads".into(),
                icon: "download".into(),
                item_count: None,
            });

            // Documents
            let doc_exists = Path::new(&documents).is_dir();
            presets.push(PresetFolderInfo {
                id: "documents".into(),
                name: "Documents".into(),
                description: "PDFs, notes, and work documents".into(),
                path: documents,
                exists: doc_exists,
                category: "documents".into(),
                icon: "file-text".into(),
                item_count: None,
            });

            // Pictures
            if Path::new(&pictures).is_dir() {
                presets.push(PresetFolderInfo {
                    id: "pictures".into(),
                    name: "Pictures Gallery".into(),
                    description: "All pictures saved on device".into(),
                    path: pictures,
                    exists: true,
                    category: "pictures".into(),
                    icon: "image".into(),
                    item_count: None,
                });
            }

            return Ok(presets);
        }
    }

    // Desktop presets (Windows, macOS, Linux)
    let home = std::env::var("USERPROFILE")
        .or_else(|_| std::env::var("HOME"))
        .unwrap_or_default();

    if !home.is_empty() {
        let pics = format!("{home}/Pictures");
        let dl = format!("{home}/Downloads");
        let docs = format!("{home}/Documents");
        let vids = format!("{home}/Videos");

        presets.push(PresetFolderInfo {
            id: "pictures".into(),
            name: "Pictures / Photos".into(),
            description: "Photos and image library".into(),
            path: pics.clone(),
            exists: Path::new(&pics).is_dir(),
            category: "pictures".into(),
            icon: "camera".into(),
            item_count: None,
        });
        presets.push(PresetFolderInfo {
            id: "downloads".into(),
            name: "Downloads".into(),
            description: "Browser downloads and files".into(),
            path: dl.clone(),
            exists: Path::new(&dl).is_dir(),
            category: "downloads".into(),
            icon: "download".into(),
            item_count: None,
        });
        presets.push(PresetFolderInfo {
            id: "documents".into(),
            name: "Documents".into(),
            description: "Personal and work documents".into(),
            path: docs.clone(),
            exists: Path::new(&docs).is_dir(),
            category: "documents".into(),
            icon: "file-text".into(),
            item_count: None,
        });
        presets.push(PresetFolderInfo {
            id: "videos".into(),
            name: "Videos".into(),
            description: "Video recordings and movies".into(),
            path: vids.clone(),
            exists: Path::new(&vids).is_dir(),
            category: "videos".into(),
            icon: "video".into(),
            item_count: None,
        });
    }

    Ok(presets)
}

#[tauri::command]
pub async fn cmd_check_storage_permission() -> Result<bool, String> {
    #[cfg(target_os = "android")]
    {
        let context = ndk_context::android_context();
        let vm = unsafe { jni::JavaVM::from_raw(context.vm().cast()) }
            .map_err(|error| format!("Unable to access Android VM: {error}"))?;
        let mut env = vm
            .attach_current_thread()
            .map_err(|error| format!("Unable to attach Android VM: {error}"))?;
        let main_class = crate::jni_cache::get_main_activity_jclass()
            .ok_or("Android MainActivity is still initializing")?;
        let result = env
            .call_static_method(&main_class, "checkStoragePermission", "()Z", &[])
            .map_err(|error| format!("Failed to check storage permission: {error}"))?
            .z()
            .map_err(|error| format!("Invalid boolean result: {error}"))?;
        Ok(result)
    }
    #[cfg(not(target_os = "android"))]
    {
        Ok(true)
    }
}

#[tauri::command]
pub async fn cmd_request_storage_permission() -> Result<bool, String> {
    #[cfg(target_os = "android")]
    {
        let context = ndk_context::android_context();
        let vm = unsafe { jni::JavaVM::from_raw(context.vm().cast()) }
            .map_err(|error| format!("Unable to access Android VM: {error}"))?;
        let mut env = vm
            .attach_current_thread()
            .map_err(|error| format!("Unable to attach Android VM: {error}"))?;
        let main_class = crate::jni_cache::get_main_activity_jclass()
            .ok_or("Android MainActivity is still initializing")?;
        let result = env
            .call_static_method(&main_class, "requestStoragePermission", "()Z", &[])
            .map_err(|error| format!("Failed to request storage permission: {error}"))?
            .z()
            .map_err(|error| format!("Invalid boolean result: {error}"))?;
        Ok(result)
    }
    #[cfg(not(target_os = "android"))]
    {
        Ok(true)
    }
}

#[cfg(target_os = "android")]
pub fn notify_android_auto_backup(enabled: bool, wifi_only: bool, require_charging: bool) {
    let context = ndk_context::android_context();
    if let Ok(vm) = unsafe { jni::JavaVM::from_raw(context.vm().cast()) } {
        if let Ok(mut env) = vm.attach_current_thread() {
            if let Some(main_class) = crate::jni_cache::get_main_activity_jclass() {
                let res = env.call_static_method(
                    &main_class,
                    "configureAutoBackup",
                    "(ZZZ)V",
                    &[
                        jni::objects::JValue::Bool(if enabled { 1 } else { 0 }),
                        jni::objects::JValue::Bool(if wifi_only { 1 } else { 0 }),
                        jni::objects::JValue::Bool(if require_charging { 1 } else { 0 }),
                    ],
                );
                if let Err(e) = res {
                    log::warn!("JNI configureAutoBackup call failed: {:?}", e);
                }
                if env.exception_check().unwrap_or(false) {
                    let _ = env.exception_describe();
                    let _ = env.exception_clear();
                }
            }
        }
    }
}

#[cfg(not(target_os = "android"))]
pub fn notify_android_auto_backup(_enabled: bool, _wifi_only: bool, _require_charging: bool) {}

#[tauri::command]
pub async fn cmd_is_battery_optimization_ignored() -> Result<bool, String> {
    #[cfg(target_os = "android")]
    {
        let context = ndk_context::android_context();
        let vm = unsafe { jni::JavaVM::from_raw(context.vm().cast()) }
            .map_err(|error| format!("Unable to access Android VM: {error}"))?;
        let mut env = vm
            .attach_current_thread()
            .map_err(|error| format!("Unable to attach Android VM: {error}"))?;
        let main_class = crate::jni_cache::get_main_activity_jclass()
            .ok_or("Android MainActivity is still initializing")?;
        let result = env
            .call_static_method(&main_class, "isIgnoringBatteryOptimizations", "()Z", &[])
            .map_err(|error| format!("Failed to check battery optimization: {error}"))?
            .z()
            .map_err(|error| format!("Invalid boolean result: {error}"))?;
        Ok(result)
    }
    #[cfg(not(target_os = "android"))]
    {
        Ok(true)
    }
}

#[tauri::command]
pub async fn cmd_request_ignore_battery_optimization() -> Result<bool, String> {
    #[cfg(target_os = "android")]
    {
        let context = ndk_context::android_context();
        let vm = unsafe { jni::JavaVM::from_raw(context.vm().cast()) }
            .map_err(|error| format!("Unable to access Android VM: {error}"))?;
        let mut env = vm
            .attach_current_thread()
            .map_err(|error| format!("Unable to attach Android VM: {error}"))?;
        let main_class = crate::jni_cache::get_main_activity_jclass()
            .ok_or("Android MainActivity is still initializing")?;
        let result = env
            .call_static_method(&main_class, "requestIgnoreBatteryOptimizations", "()Z", &[])
            .map_err(|error| format!("Failed to request battery optimization: {error}"))?
            .z()
            .map_err(|error| format!("Invalid boolean result: {error}"))?;
        Ok(result)
    }
    #[cfg(not(target_os = "android"))]
    {
        Ok(true)
    }
}

#[tauri::command]
pub async fn cmd_configure_auto_backup(
    enabled: bool,
    wifi_only: bool,
    require_charging: bool,
) -> Result<(), String> {
    notify_android_auto_backup(enabled, wifi_only, require_charging);
    Ok(())
}

