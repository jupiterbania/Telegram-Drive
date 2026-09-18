pub mod config;
pub mod executor;
pub mod planner;
pub mod watcher;

pub use executor::SyncProgressPayload;

use crate::{
    commands::{
        utils::{media_size, resolve_peer},
        TelegramState,
    },
    db::DbConnection,
};
use config::{load_pairs, load_settings, log_sync, SyncPair};
use planner::{FileTree, SyncOperation, SyncedEntry, SyncedTree, TreeEntry};
use serde::Serialize;
use sha2::{Digest, Sha256};
use sqlite::State;
use std::{
    collections::HashMap,
    fs::File,
    io::Read,
    path::{Path, PathBuf},
    sync::{
        atomic::{AtomicBool, Ordering},
        Arc, Mutex,
    },
    time::Duration,
};
use tauri::{Emitter, Listener, Manager};
use tokio::{sync::RwLock, task::JoinHandle};

pub struct SyncEngine {
    pub running: Arc<AtomicBool>,
    pub db: DbConnection,
    pub app_handle: tauri::AppHandle,
    pub status: Arc<RwLock<SyncStatus>>,
    shutdown_tx: Mutex<tokio::sync::watch::Sender<bool>>,
    trigger_tx: Arc<Mutex<Option<tokio::sync::mpsc::Sender<()>>>>,
    task: Mutex<Option<JoinHandle<()>>>,
}

#[derive(Debug, Clone, Default, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SyncStatus {
    pub enabled: bool,
    pub running: bool,
    pub active_pairs: usize,
    pub pending_ops: usize,
    pub conflicts: usize,
    pub last_error: Option<String>,
}

impl SyncEngine {
    pub fn new(db: DbConnection, app_handle: tauri::AppHandle) -> Self {
        let (shutdown_tx, _) = tokio::sync::watch::channel(false);
        Self {
            running: Arc::new(AtomicBool::new(false)),
            db,
            app_handle,
            status: Arc::new(RwLock::new(SyncStatus::default())),
            shutdown_tx: Mutex::new(shutdown_tx),
            trigger_tx: Arc::new(Mutex::new(None)),
            task: Mutex::new(None),
        }
    }

    pub fn trigger_sync_now(&self) -> bool {
        if let Ok(guard) = self.trigger_tx.lock() {
            if let Some(tx) = guard.as_ref() {
                return tx.try_send(()).is_ok();
            }
        }
        false
    }

    pub async fn start(&self) -> Result<(), String> {
        let settings = load_settings(self.db.clone()).await?;
        let pairs = load_pairs(self.db.clone(), true).await?;
        if !settings.enabled {
            let status = self.status.clone();
            let app = self.app_handle.clone();
            tauri::async_runtime::spawn(async move {
                let snapshot = SyncStatus {
                    enabled: false,
                    active_pairs: pairs.len(),
                    ..SyncStatus::default()
                };
                *status.write().await = snapshot.clone();
                let _ = app.emit("sync-status-changed", snapshot);
            });
            return Ok(());
        }
        if self.running.swap(true, Ordering::SeqCst) {
            return Ok(());
        }

        let (shutdown_tx, shutdown_rx) = tokio::sync::watch::channel(false);
        *self
            .shutdown_tx
            .lock()
            .map_err(|_| "Sync shutdown lock poisoned")? = shutdown_tx;
        let app = self.app_handle.clone();
        let db = self.db.clone();
        let status = self.status.clone();
        let running = self.running.clone();
        let trigger_holder = self.trigger_tx.clone();
        let task = tokio::spawn(async move {
            engine_loop(app, db, status, running, settings, pairs, shutdown_rx, trigger_holder).await;
        });
        *self.task.lock().map_err(|_| "Sync task lock poisoned")? = Some(task);
        Ok(())
    }

    pub fn shutdown(&self) {
        self.running.store(false, Ordering::SeqCst);
        if let Ok(sender) = self.shutdown_tx.lock() {
            let _ = sender.send(true);
        }
        crate::commands::fs::cancel_all_sync_transfers();
        crate::upload_service::stop_foreground_service(None, None, None);
        let _ = self.app_handle.emit("sync-progress", &SyncProgressPayload::idle());
    }

    pub(crate) fn subscribe_shutdown(&self) -> Result<tokio::sync::watch::Receiver<bool>, String> {
        self.shutdown_tx
            .lock()
            .map(|sender| sender.subscribe())
            .map_err(|_| "Sync shutdown lock poisoned".to_string())
    }

    pub async fn shutdown_and_wait(&self) -> Result<(), String> {
        self.shutdown();
        let task = self
            .task
            .lock()
            .map_err(|_| "Sync task lock poisoned")?
            .take();
        if let Some(task) = task {
            task.abort();
            let _ = task.await;
        }
        self.running.store(false, Ordering::SeqCst);
        Ok(())
    }

    pub async fn restart(&self) -> Result<(), String> {
        self.shutdown_and_wait().await?;
        self.start().await
    }
}

pub async fn restart_sync_engine(app: &tauri::AppHandle) -> Result<(), String> {
    app.state::<SyncEngine>().restart().await
}

async fn emit_status(app: &tauri::AppHandle, status: &Arc<RwLock<SyncStatus>>) {
    let snapshot = status.read().await.clone();
    let _ = app.emit("sync-status-changed", snapshot);
}

async fn engine_loop(
    app: tauri::AppHandle,
    db: DbConnection,
    status: Arc<RwLock<SyncStatus>>,
    running: Arc<AtomicBool>,
    settings: config::SyncSettings,
    pairs: Vec<SyncPair>,
    mut shutdown: tokio::sync::watch::Receiver<bool>,
    trigger_holder: Arc<Mutex<Option<tokio::sync::mpsc::Sender<()>>>>,
) {
    {
        let mut current = status.write().await;
        current.enabled = true;
        current.active_pairs = pairs.len();
        current.last_error = None;
    }
    emit_status(&app, &status).await;

    // A trigger means "the trees may have changed", not "perform exactly one
    // reconciliation". A capacity of one coalesces filesystem bursts and
    // prevents a large copy from queueing hundreds of full remote scans.
    let (trigger_tx, mut trigger_rx) = tokio::sync::mpsc::channel(1);
    if let Ok(mut guard) = trigger_holder.lock() {
        *guard = Some(trigger_tx.clone());
    }
    let watcher = watcher::LocalWatcher::spawn(
        pairs
            .iter()
            .map(|pair| PathBuf::from(&pair.local_path))
            .collect(),
        Duration::from_millis(settings.debounce_ms),
        app.clone(),
        shutdown.clone(),
        trigger_tx.clone(),
    );
    let vault_trigger = trigger_tx.clone();
    let listener_id = app.listen("vault-unlocked", move |_| {
        let _ = vault_trigger.try_send(());
    });
    let _ = trigger_tx.try_send(());
    let mut interval = tokio::time::interval(Duration::from_secs(30));

    loop {
        tokio::select! {
            changed = shutdown.changed() => if changed.is_err() || *shutdown.borrow() { break },
            _ = interval.tick() => {},
            event = trigger_rx.recv() => if event.is_none() { break },
        }
        if *shutdown.borrow() {
            break;
        }
        while trigger_rx.try_recv().is_ok() {}

        // Dynamically reload settings and pairs each cycle so changes apply immediately
        let current_settings = config::load_settings(db.clone())
            .await
            .unwrap_or_else(|_| settings.clone());
        if !current_settings.enabled {
            let mut current = status.write().await;
            current.running = false;
            current.enabled = false;
            emit_status(&app, &status).await;
            break;
        }

        let current_pairs = config::load_pairs(db.clone(), true)
            .await
            .unwrap_or_else(|_| pairs.clone());

        {
            let mut current = status.write().await;
            current.running = true;
            current.enabled = true;
            current.active_pairs = current_pairs.len();
            current.last_error = None;
        }
        emit_status(&app, &status).await;

        if current_pairs.is_empty() {
            let mut current = status.write().await;
            current.running = false;
            emit_status(&app, &status).await;
            continue;
        }

        // Constraint checks: wifi_only and charging_only
        #[cfg(target_os = "android")]
        {
            if let Ok(env) = crate::commands::network::cmd_get_android_transfer_environment() {
                if !env.connected {
                    let mut current = status.write().await;
                    current.running = false;
                    current.last_error = Some("Device is offline; sync paused".to_string());
                    emit_status(&app, &status).await;
                    continue;
                }
                if current_settings.wifi_only && env.metered {
                    let mut current = status.write().await;
                    current.running = false;
                    current.last_error = Some("Waiting for unmetered Wi-Fi connection...".to_string());
                    emit_status(&app, &status).await;
                    continue;
                }
                if current_settings.charging_only && !env.charging {
                    let mut current = status.write().await;
                    current.running = false;
                    current.last_error = Some("Waiting for charger connection...".to_string());
                    emit_status(&app, &status).await;
                    continue;
                }
            }
        }

        let mut pending = 0usize;
        let mut conflicts = 0usize;
        let mut last_error = None;
        for pair in &current_pairs {
            if *shutdown.borrow() {
                break;
            }
            match reconcile_pair(&app, &db, pair, &current_settings, shutdown.clone()).await {
                Ok((pair_pending, pair_conflicts, pair_error)) => {
                    pending += pair_pending;
                    conflicts += pair_conflicts;
                    if pair_error.is_some() {
                        last_error = pair_error;
                    }
                }
                Err(error) => {
                    log::error!("Folder sync pair {} paused: {error}", pair.id);
                    log_sync(
                        db.clone(),
                        Some(pair.id),
                        "error".to_string(),
                        None,
                        Some(error.clone()),
                    )
                    .await;
                    last_error = Some(error);
                }
            }
        }
        conflicts = conflicts.max(count_conflicts(&db).await.unwrap_or(conflicts));
        {
            let mut current = status.write().await;
            current.running = false;
            current.pending_ops = pending;
            current.conflicts = conflicts;
            current.last_error = last_error;
        }
        emit_status(&app, &status).await;
    }

    app.unlisten(listener_id);
    watcher.abort();
    if let Ok(mut guard) = trigger_holder.lock() {
        *guard = None;
    }
    running.store(false, Ordering::SeqCst);
    {
        let mut current = status.write().await;
        current.running = false;
    }
    emit_status(&app, &status).await;
}

async fn count_conflicts(db: &DbConnection) -> Result<usize, String> {
    crate::db::with_connection(db.clone(), |connection| {
        let mut statement = connection
            .prepare("SELECT COUNT(*) FROM sync_state WHERE sync_status = 'conflict'")
            .map_err(|error| error.to_string())?;
        if statement.next().map_err(|error| error.to_string())? == State::Row {
            return Ok(statement.read::<i64, _>(0).unwrap_or(0).max(0) as usize);
        }
        Ok(0)
    })
    .await
}

pub fn hash_file(path: &Path) -> Result<String, String> {
    let mut file = File::open(path).map_err(|error| error.to_string())?;
    let mut digest = Sha256::new();
    let mut buffer = [0u8; 1024 * 1024];
    loop {
        let read = file.read(&mut buffer).map_err(|error| error.to_string())?;
        if read == 0 {
            break;
        }
        digest.update(&buffer[..read]);
    }
    Ok(format!("{:x}", digest.finalize()))
}

pub fn compute_local_fingerprint(metadata: &std::fs::Metadata, relative_path: &str) -> String {
    let file_size = metadata.len();
    let modified_at = metadata
        .modified()
        .ok()
        .and_then(|time| time.duration_since(std::time::UNIX_EPOCH).ok())
        .map(|value| value.as_secs() as i64)
        .unwrap_or(0);
    format!(
        "{:x}",
        Sha256::digest(format!("{file_size}:{modified_at}:{relative_path}").as_bytes())
    )
}

pub fn is_media_extension(path: &Path) -> bool {
    let Some(ext) = path.extension().and_then(|e| e.to_str()) else {
        return false;
    };
    let ext = ext.to_ascii_lowercase();
    matches!(
        ext.as_str(),
        // Photos / Images
        "jpg" | "jpeg" | "png" | "webp" | "gif" | "bmp" | "heic" | "heif" | "avif" | "raw" | "dng"
            | "nef" | "cr2" | "cr3" | "arw" | "rw2" | "orf" | "pef" | "heifs" | "hif" | "tif"
            | "tiff" | "svg" | "ico"
        // Videos
            | "mp4" | "mkv" | "mov" | "avi" | "webm" | "3gp" | "flv" | "wmv" | "m4v" | "ts"
            | "mpg" | "mpeg" | "vob" | "ogv" | "mts" | "m2ts"
        // Audio
            | "mp3" | "m4a" | "aac" | "wav" | "flac" | "ogg" | "opus"
    )
}

pub fn safe_canonicalize_root(path: &Path) -> Result<PathBuf, String> {
    #[cfg(target_os = "android")]
    {
        if !path.exists() {
            return Err(format!("Sync folder does not exist: {}", path.display()));
        }
        let mut components = Vec::new();
        for component in path.components() {
            match component {
                std::path::Component::CurDir => {}
                std::path::Component::ParentDir => {
                    components.pop();
                }
                c => components.push(c.as_os_str()),
            }
        }
        let mut buf = PathBuf::new();
        for c in components {
            buf.push(c);
        }
        Ok(buf)
    }
    #[cfg(not(target_os = "android"))]
    {
        path.canonicalize().map_err(|error| error.to_string())
    }
}

#[cfg(windows)]
fn is_hidden_windows(path: &Path) -> bool {
    use std::os::windows::fs::MetadataExt;
    if let Ok(meta) = path.metadata() {
        const FILE_ATTRIBUTE_HIDDEN: u32 = 0x2;
        return (meta.file_attributes() & FILE_ATTRIBUTE_HIDDEN) != 0;
    }
    false
}

#[cfg(not(windows))]
fn is_hidden_windows(_path: &Path) -> bool {
    false
}

pub fn is_non_gallery_dir_name(name: &str) -> bool {
    let lower = name.to_ascii_lowercase();
    name.starts_with('.')
        || matches!(
            lower.as_str(),
            "sent"
                | "private"
                | "thumbnails"
                | ".thumbnails"
                | "cache"
                | ".cache"
                | "trash"
                | ".trash"
                | "recycle"
                | ".recycle"
                | ".statuses"
                | "status"
                | "statuses"
                | ".shared"
                | ".links"
                | "temp"
                | ".temp"
                | "tmp"
                | ".tmp"
        )
        || lower.starts_with(".trashed")
        || lower.starts_with(".pending")
}

pub fn should_skip_directory(dir_path: &Path, name: &str) -> bool {
    if is_non_gallery_dir_name(name) {
        return true;
    }
    // Android Gallery .nomedia check:
    // Any directory containing a .nomedia file is hidden from the gallery and media scanner.
    if dir_path.join(".nomedia").is_file() {
        return true;
    }
    false
}

pub async fn scan_local(root: &str, media_only: bool) -> Result<FileTree, String> {
    scan_local_with_exclusions(root, media_only, Vec::new()).await
}

pub async fn scan_local_with_exclusions(
    root: &str,
    media_only: bool,
    excluded_subdirs: Vec<PathBuf>,
) -> Result<FileTree, String> {
    let root = PathBuf::from(root);
    tokio::task::spawn_blocking(move || {
        let canonical_root = safe_canonicalize_root(&root).map_err(|error| error.to_string())?;
        let mut tree = FileTree::new();
        for entry in walkdir::WalkDir::new(&canonical_root)
            .follow_links(false)
            .into_iter()
            .filter_entry(|e| {
                let name = e.file_name().to_string_lossy();
                if e.file_type().is_dir() {
                    if e.path() != canonical_root && should_skip_directory(e.path(), &name) {
                        return false;
                    }
                    if excluded_subdirs.iter().any(|ex| e.path() == ex || e.path().starts_with(ex)) {
                        return false;
                    }
                }
                !name.starts_with('.') && !name.ends_with(".td-sync-tmp")
            })
        {
            let entry = match entry {
                Ok(e) => e,
                Err(err) => {
                    log::warn!("Skipping unreadable entry in sync folder: {err}");
                    continue;
                }
            };
            if !entry.file_type().is_file() {
                continue;
            }
            let file_name = entry.file_name().to_string_lossy();
            if file_name.starts_with('.') || file_name.ends_with(".td-sync-tmp") || file_name == ".nomedia" {
                continue;
            }
            if is_hidden_windows(entry.path()) {
                continue;
            }
            if media_only && !is_media_extension(entry.path()) {
                continue;
            }
            let relative = match entry.path().strip_prefix(&canonical_root) {
                Ok(rel) => rel,
                Err(_) => continue,
            };

            // Extra safety: verify no component along the relative path is non-gallery or hidden
            let mut has_forbidden_component = false;
            for part in relative.components() {
                let part_str = part.as_os_str().to_string_lossy();
                if is_non_gallery_dir_name(&part_str) {
                    has_forbidden_component = true;
                    break;
                }
            }
            if has_forbidden_component {
                continue;
            }

            // Check if any ancestor folder between canonical_root and this file has .nomedia
            let mut parent = entry.path().parent();
            let mut has_nomedia_parent = false;
            while let Some(p) = parent {
                if p == canonical_root {
                    break;
                }
                if p.join(".nomedia").is_file() {
                    has_nomedia_parent = true;
                    break;
                }
                parent = p.parent();
            }
            if has_nomedia_parent {
                continue;
            }

            let relative_path = match relative
                .components()
                .map(|part| part.as_os_str().to_str().map(|s| s.to_string()))
                .collect::<Option<Vec<_>>>()
            {
                Some(parts) => parts.join("/"),
                None => continue,
            };
            let metadata = match entry.metadata() {
                Ok(m) => m,
                Err(_) => continue,
            };
            let file_size = metadata.len();
            let modified_at = metadata
                .modified()
                .ok()
                .and_then(|time| time.duration_since(std::time::UNIX_EPOCH).ok())
                .map(|value| value.as_secs() as i64);

            let fingerprint = compute_local_fingerprint(&metadata, &relative_path);
            tree.insert(
                relative_path.clone(),
                TreeEntry {
                    relative_path,
                    hash: fingerprint,
                    file_size,
                    modified_at,
                    message_id: None,
                },
            );
        }
        Ok(tree)
    })
    .await
    .map_err(|error| error.to_string())?
}

fn is_safe_relative(path: &str) -> bool {
    !path.is_empty()
        && !path.starts_with('/')
        && !path.contains(['\\', '\0'])
        && path
            .split('/')
            .all(|component| !component.is_empty() && component != "." && component != "..")
}

async fn scan_remote(
    app: &tauri::AppHandle,
    pair: &SyncPair,
    synced: &SyncedTree,
    mut shutdown: tokio::sync::watch::Receiver<bool>,
) -> Result<FileTree, String> {
    let mut attempt = 0u32;
    loop {
        match scan_remote_once(app, pair, synced).await {
            Ok(tree) => return Ok(tree),
            Err(error) => {
                let wait = error.find("FLOOD_WAIT_").and_then(|start| {
                    error[start + "FLOOD_WAIT_".len()..]
                        .chars()
                        .take_while(char::is_ascii_digit)
                        .collect::<String>()
                        .parse::<u64>()
                        .ok()
                });
                let Some(server_wait) = wait else {
                    return Err(error);
                };
                if attempt >= 5 {
                    return Err(error);
                }
                let wait = server_wait.max(1u64 << attempt.min(8));
                log::warn!("Remote sync scan hit FLOOD_WAIT; retrying in {wait}s");
                tokio::select! {
                    _ = tokio::time::sleep(Duration::from_secs(wait)) => {}
                    changed = shutdown.changed() => {
                        if changed.is_err() || *shutdown.borrow() {
                            return Err("Folder sync shutdown requested".to_string());
                        }
                    }
                }
                attempt += 1;
            }
        }
    }
}

async fn scan_remote_once(
    app: &tauri::AppHandle,
    pair: &SyncPair,
    synced: &SyncedTree,
) -> Result<FileTree, String> {
    let telegram = app.state::<TelegramState>();
    let client = telegram.client.lock().await.clone().ok_or(
        "Telegram is offline; remote tree unavailable, so no reconciliation was attempted",
    )?;
    let peer = resolve_peer(&client, Some(pair.channel_id), &telegram.peer_cache).await?;
    let known_paths: HashMap<i32, String> = synced
        .values()
        .filter_map(|entry| entry.message_id.map(|id| (id, entry.relative_path.clone())))
        .collect();
    let mut messages = client.iter_messages(&peer);
    let mut tree = FileTree::new();
    const MAX_REMOTE_FILES: usize = 50_000;
    let mut scanned_files = 0usize;
    while let Some(message) = messages.next().await.map_err(|error| error.to_string())? {
        let Some(media) = message.media() else {
            continue;
        };
        let document_name = match &media {
            grammers_client::types::Media::Document(document) => document.name().to_string(),
            grammers_client::types::Media::Photo(_) => "Photo.jpg".to_string(),
            _ => continue,
        };
        scanned_files += 1;
        if scanned_files > MAX_REMOTE_FILES {
            return Err(format!(
                "Telegram channel contains more than {MAX_REMOTE_FILES} file messages; sync paused rather than building an unsafe remote tree"
            ));
        }
        let caption = message.text();
        let relative_path = known_paths.get(&message.id()).cloned().or_else(|| {
            if is_safe_relative(caption) {
                Some(caption.to_string())
            } else if is_safe_relative(&document_name) {
                Some(document_name)
            } else {
                None
            }
        });
        let Some(relative_path) = relative_path else {
            continue;
        };
        let file_size = media_size(&media);
        let remote_date = message.date().timestamp();
        let fingerprint = format!(
            "{:x}",
            Sha256::digest(format!("{file_size}:{remote_date}:{}", message.id()).as_bytes())
        );
        if let Some(existing) = tree.get(&relative_path) {
            log::warn!(
                "Multiple Telegram messages map to the same sync path '{relative_path}' (existing msg {} vs msg {}); keeping the newer message",
                existing.message_id.unwrap_or_default(),
                message.id()
            );
            continue;
        }
        tree.insert(
            relative_path.clone(),
            TreeEntry {
                relative_path,
                hash: fingerprint,
                file_size,
                modified_at: Some(remote_date),
                message_id: Some(message.id()),
            },
        );
    }
    Ok(tree)
}

async fn load_synced_tree(db: &DbConnection, pair_id: i64) -> Result<SyncedTree, String> {
    crate::db::with_connection(db.clone(), move |connection| {
    let mut statement = connection.prepare(
        "SELECT relative_path, local_hash, remote_hash, file_size, local_mtime, remote_date, message_id, sync_status FROM sync_state WHERE pair_id = ?",
    ).map_err(|error| error.to_string())?;
    statement
        .bind((1, pair_id))
        .map_err(|error| error.to_string())?;
    let mut tree = SyncedTree::new();
    while statement.next().map_err(|error| error.to_string())? == State::Row {
        let relative_path: String = statement.read(0).map_err(|error| error.to_string())?;
        tree.insert(
            relative_path.clone(),
            SyncedEntry {
                relative_path,
                local_hash: statement.read::<Option<String>, _>(1).ok().flatten(),
                remote_hash: statement.read::<Option<String>, _>(2).ok().flatten(),
                file_size: statement.read::<i64, _>(3).unwrap_or(0).max(0) as u64,
                local_mtime: statement.read::<Option<i64>, _>(4).ok().flatten(),
                remote_date: statement.read::<Option<i64>, _>(5).ok().flatten(),
                message_id: statement
                    .read::<Option<i64>, _>(6)
                    .ok()
                    .flatten()
                    .and_then(|id| i32::try_from(id).ok()),
                sync_status: statement.read(7).unwrap_or_else(|_| "synced".to_string()),
            },
        );
    }
    Ok(tree)
    }).await
}

async fn upsert_state(
    db: &DbConnection,
    pair_id: i64,
    path: &str,
    local: Option<&TreeEntry>,
    remote: Option<&TreeEntry>,
    status: &str,
) -> Result<(), String> {
    let path = path.to_string();
    let local = local.cloned();
    let remote = remote.cloned();
    let status = status.to_string();
    crate::db::with_connection(db.clone(), move |connection| {
    let mut statement = connection.prepare(
        "INSERT INTO sync_state (pair_id, relative_path, local_hash, remote_hash, file_size, local_mtime, remote_date, message_id, sync_status)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT(pair_id, relative_path) DO UPDATE SET local_hash=excluded.local_hash, remote_hash=excluded.remote_hash, file_size=excluded.file_size, local_mtime=excluded.local_mtime, remote_date=excluded.remote_date, message_id=excluded.message_id, sync_status=excluded.sync_status",
    ).map_err(|error| error.to_string())?;
    statement
        .bind((1, pair_id))
        .map_err(|error| error.to_string())?;
    statement
        .bind((2, path.as_str()))
        .map_err(|error| error.to_string())?;
    statement
        .bind::<(usize, Option<&str>)>((3, local.as_ref().map(|entry| entry.hash.as_str())))
        .map_err(|error| error.to_string())?;
    statement
        .bind::<(usize, Option<&str>)>((4, remote.as_ref().map(|entry| entry.hash.as_str())))
        .map_err(|error| error.to_string())?;
    statement
        .bind((
            5,
            local
                .as_ref()
                .or(remote.as_ref())
                .map(|entry| entry.file_size as i64)
                .unwrap_or(0),
        ))
        .map_err(|error| error.to_string())?;
    statement
        .bind::<(usize, Option<i64>)>((6, local.as_ref().and_then(|entry| entry.modified_at)))
        .map_err(|error| error.to_string())?;
    statement
        .bind::<(usize, Option<i64>)>((7, remote.as_ref().and_then(|entry| entry.modified_at)))
        .map_err(|error| error.to_string())?;
    statement
        .bind::<(usize, Option<i64>)>((8, remote.as_ref().and_then(|entry| entry.message_id).map(i64::from)))
        .map_err(|error| error.to_string())?;
    statement
        .bind((9, status.as_str()))
        .map_err(|error| error.to_string())?;
    statement.next().map_err(|error| error.to_string())?;
    Ok(())
    }).await
}

async fn delete_state(db: &DbConnection, pair_id: i64, path: &str) -> Result<(), String> {
    let path = path.to_string();
    crate::db::with_connection(db.clone(), move |connection| {
        let mut statement = connection
            .prepare("DELETE FROM sync_state WHERE pair_id = ? AND relative_path = ?")
            .map_err(|error| error.to_string())?;
        statement
            .bind((1, pair_id))
            .map_err(|error| error.to_string())?;
        statement
            .bind((2, path.as_str()))
            .map_err(|error| error.to_string())?;
        statement.next().map_err(|error| error.to_string())?;
        Ok(())
    })
    .await
}

async fn set_state_status(
    db: &DbConnection,
    pair_id: i64,
    path: &str,
    status: &str,
) -> Result<(), String> {
    let path = path.to_string();
    let status = status.to_string();
    crate::db::with_connection(db.clone(), move |connection| {
        let mut statement = connection
            .prepare(
                "UPDATE sync_state SET sync_status = ? WHERE pair_id = ? AND relative_path = ?",
            )
            .map_err(|error| error.to_string())?;
        statement
            .bind((1, status.as_str()))
            .map_err(|error| error.to_string())?;
        statement
            .bind((2, pair_id))
            .map_err(|error| error.to_string())?;
        statement
            .bind((3, path.as_str()))
            .map_err(|error| error.to_string())?;
        statement.next().map_err(|error| error.to_string())?;
        Ok(())
    })
    .await
}

async fn reconcile_pair(
    app: &tauri::AppHandle,
    db: &DbConnection,
    pair: &SyncPair,
    settings: &config::SyncSettings,
    shutdown: tokio::sync::watch::Receiver<bool>,
) -> Result<(usize, usize, Option<String>), String> {
    let all_pairs = config::load_pairs(db.clone(), true).await.unwrap_or_default();
    let pair_root = safe_canonicalize_root(Path::new(&pair.local_path))
        .unwrap_or_else(|_| PathBuf::from(&pair.local_path));
    let mut excluded_subdirs = Vec::new();
    for other in &all_pairs {
        if other.id != pair.id {
            if let Ok(other_canonical) = safe_canonicalize_root(Path::new(&other.local_path)) {
                if other_canonical.starts_with(&pair_root) && other_canonical != pair_root {
                    excluded_subdirs.push(other_canonical);
                }
            }
        }
    }
    let local = scan_local_with_exclusions(&pair.local_path, settings.media_only, excluded_subdirs.clone()).await?;
    let synced = load_synced_tree(db, pair.id).await?;
    let remote = scan_remote(app, pair, &synced, shutdown.clone()).await?;
    for vanished_path in synced
        .keys()
        .filter(|path| !local.contains_key(*path) && !remote.contains_key(*path))
    {
        delete_state(db, pair.id, vanished_path).await?;
    }
    let mut operations =
        planner::plan_for_direction(&local, &remote, &synced, &pair.sync_direction).map_err(
            |error| {
                let message = error.to_string();
                let _ = app.emit("sync-mass-deletion-blocked", &message);
                message
            },
        )?;
    let conflicts = operations
        .iter()
        .filter(|operation| matches!(operation, SyncOperation::Conflict { .. }))
        .count();
    for operation in operations
        .iter()
        .filter(|operation| matches!(operation, SyncOperation::Conflict { .. }))
    {
        if synced.contains_key(operation.path()) {
            set_state_status(db, pair.id, operation.path(), "conflict").await?;
        } else {
            upsert_state(
                db,
                pair.id,
                operation.path(),
                local.get(operation.path()),
                remote.get(operation.path()),
                "conflict",
            )
            .await?;
        }
    }
    // Existing unchanged entries need no transfer or database write. Keeping
    // them out of the executor avoids one log row per file every poll cycle.
    operations.retain(|operation| {
        !matches!(operation, SyncOperation::Skip { .. }) || !synced.contains_key(operation.path())
    });
    let results = executor::execute(app, db, pair, settings, operations).await;
    let pending = results
        .iter()
        .filter(|result| !result.success && result.action != "conflict")
        .count();
    let execution_error = results
        .iter()
        .find(|result| !result.success && result.action != "conflict")
        .and_then(|result| result.detail.clone());

    // Telegram documents are immutable. Uploading a replacement creates a new
    // message, so remove the superseded message to prevent an old version from
    // resurfacing after a later delete.
    for result in results
        .iter()
        .filter(|result| result.success && result.action == "upload")
    {
        let old_message_id = remote
            .get(&result.relative_path)
            .and_then(|entry| entry.message_id);
        if let (Some(old_message_id), Some(new_message_id)) = (old_message_id, result.message_id) {
            if old_message_id != new_message_id {
                if let Err(error) =
                    executor::delete_remote(app, pair.channel_id, old_message_id).await
                {
                    log::warn!("Uploaded replacement but could not remove superseded Telegram message {old_message_id}: {error}");
                    log_sync(
                        db.clone(),
                        Some(pair.id),
                        "cleanup_remote_version".to_string(),
                        Some(result.relative_path.clone()),
                        Some(error),
                    )
                    .await;
                }
            }
        }
    }

    // Persist uploaded message ids before the second remote scan so encrypted
    // Telegram filenames can still be mapped back to their relative paths.
    for result in results
        .iter()
        .filter(|result| result.success && result.action == "upload")
    {
        if let Some(message_id) = result.message_id {
            let mut remote_stub = local.get(&result.relative_path).cloned().unwrap();
            remote_stub.message_id = Some(message_id);
            remote_stub.hash.clear();
            upsert_state(
                db,
                pair.id,
                &result.relative_path,
                local.get(&result.relative_path),
                Some(&remote_stub),
                "syncing",
            )
            .await?;
        }
    }
    let local_after = scan_local_with_exclusions(&pair.local_path, settings.media_only, excluded_subdirs).await?;
    let mapped = load_synced_tree(db, pair.id).await?;
    let remote_after = scan_remote(app, pair, &mapped, shutdown).await?;
    for result in results {
        if !result.success {
            let status = if result.action == "conflict" {
                "conflict"
            } else if result
                .detail
                .as_deref()
                .is_some_and(|detail| detail.contains("VAULT_LOCKED"))
            {
                "paused_vault"
            } else if result.action == "upload"
                && result.detail.as_deref().is_some_and(|detail| {
                    detail.contains("Telegram sync limit") || detail.contains("Telegram size limit")
                })
            {
                "skipped"
            } else {
                "error"
            };
            if synced.contains_key(&result.relative_path) {
                set_state_status(db, pair.id, &result.relative_path, status).await?;
            } else {
                upsert_state(
                    db,
                    pair.id,
                    &result.relative_path,
                    local_after.get(&result.relative_path),
                    remote_after.get(&result.relative_path),
                    status,
                )
                .await?;
            }
            continue;
        }
        // For uploads, baseline the exact hash that was planned and verified.
        // If the source changes again before the post-scan, retaining that
        // earlier hash guarantees the next cycle sees another local change.
        let local_entry = if result.action == "upload" {
            local.get(&result.relative_path)
        } else {
            local_after.get(&result.relative_path)
        };
        let remote_entry = remote_after.get(&result.relative_path);
        if local_entry.is_none() && remote_entry.is_none() {
            delete_state(db, pair.id, &result.relative_path).await?;
        } else {
            upsert_state(
                db,
                pair.id,
                &result.relative_path,
                local_entry,
                remote_entry,
                "synced",
            )
            .await?;
        }
    }
    Ok((pending, conflicts, execution_error))
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::fs::{create_dir_all, File};
    use std::io::Write;

    #[test]
    fn test_is_non_gallery_dir_name() {
        assert!(is_non_gallery_dir_name("Sent"));
        assert!(is_non_gallery_dir_name("sent"));
        assert!(is_non_gallery_dir_name("SENT"));
        assert!(is_non_gallery_dir_name("Private"));
        assert!(is_non_gallery_dir_name("private"));
        assert!(is_non_gallery_dir_name("thumbnails"));
        assert!(is_non_gallery_dir_name(".thumbnails"));
        assert!(is_non_gallery_dir_name("cache"));
        assert!(is_non_gallery_dir_name(".cache"));
        assert!(is_non_gallery_dir_name("trash"));
        assert!(is_non_gallery_dir_name(".trashed-123"));
        assert!(is_non_gallery_dir_name(".pending-456"));
        assert!(is_non_gallery_dir_name(".hidden_dir"));

        // Valid gallery directories should not be blocked
        assert!(!is_non_gallery_dir_name("Camera"));
        assert!(!is_non_gallery_dir_name("Screenshots"));
        assert!(!is_non_gallery_dir_name("WhatsApp Images"));
        assert!(!is_non_gallery_dir_name("Instagram"));
        assert!(!is_non_gallery_dir_name("Family"));
        assert!(!is_non_gallery_dir_name("Vacation"));
    }

    #[tokio::test]
    async fn test_scan_local_excludes_sent_and_hidden() {
        let temp_dir = std::env::temp_dir().join(format!(
            "td_sync_test_{}",
            std::time::SystemTime::now()
                .duration_since(std::time::UNIX_EPOCH)
                .unwrap()
                .as_nanos()
        ));
        create_dir_all(&temp_dir).expect("Failed to create test dir");
        let root = &temp_dir;

        // 1. Normal received photo at root (visible in gallery)
        let mut f1 = File::create(root.join("IMG_received.jpg")).unwrap();
        f1.write_all(b"test image content").unwrap();

        // 2. WhatsApp Sent folder (with .nomedia)
        let sent_dir = root.join("Sent");
        create_dir_all(&sent_dir).unwrap();
        File::create(sent_dir.join(".nomedia")).unwrap();
        let mut f_sent = File::create(sent_dir.join("IMG_sent.jpg")).unwrap();
        f_sent.write_all(b"sent image content").unwrap();

        // 3. WhatsApp Private folder (with .nomedia)
        let priv_dir = root.join("Private");
        create_dir_all(&priv_dir).unwrap();
        File::create(priv_dir.join(".nomedia")).unwrap();
        let mut f_priv = File::create(priv_dir.join("IMG_private.jpg")).unwrap();
        f_priv.write_all(b"private image content").unwrap();

        // 4. Custom folder with .nomedia (hidden gallery folder)
        let nomedia_dir = root.join("HiddenFolder");
        create_dir_all(&nomedia_dir).unwrap();
        File::create(nomedia_dir.join(".nomedia")).unwrap();
        let mut f_nomedia = File::create(nomedia_dir.join("IMG_hidden.png")).unwrap();
        f_nomedia.write_all(b"hidden image content").unwrap();

        // 5. Dot-hidden image file
        let mut f_dot = File::create(root.join(".hidden_file.jpg")).unwrap();
        f_dot.write_all(b"dot image content").unwrap();

        // 6. Normal sub-album (valid gallery subfolder)
        let sub_album = root.join("Trip2024");
        create_dir_all(&sub_album).unwrap();
        let mut f_sub = File::create(sub_album.join("photo.jpg")).unwrap();
        f_sub.write_all(b"trip photo content").unwrap();

        // Run scan_local
        let tree = scan_local(&root.to_string_lossy(), true).await.unwrap();

        // Assert only genuine gallery media are in the tree
        assert!(tree.contains_key("IMG_received.jpg"), "Received image should be included");
        assert!(tree.contains_key("Trip2024/photo.jpg"), "Normal sub-album photo should be included");

        // Assert hidden/sent are excluded
        assert!(!tree.contains_key("Sent/IMG_sent.jpg"), "Sent images must be excluded");
        assert!(!tree.contains_key("Private/IMG_private.jpg"), "Private images must be excluded");
        assert!(!tree.contains_key("HiddenFolder/IMG_hidden.png"), ".nomedia folder images must be excluded");
        assert!(!tree.contains_key(".hidden_file.jpg"), "Dot-prefixed hidden files must be excluded");
        assert!(!tree.contains_key(".nomedia"), ".nomedia files must never be included");
        assert_eq!(tree.len(), 2, "Expected exactly 2 gallery photos in tree");

        let _ = std::fs::remove_dir_all(&temp_dir);
    }
}

