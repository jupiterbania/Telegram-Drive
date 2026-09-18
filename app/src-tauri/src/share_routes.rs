use crate::commands::utils::resolve_peer;
use crate::commands::TelegramState;
use crate::db::DbConnection;
use actix_web::{
    cookie::Cookie, get, middleware::DefaultHeaders, post, web, HttpRequest, HttpResponse,
    Responder,
};
use grammers_client::types::photo_sizes::PhotoSize;
use grammers_client::types::Media;
use serde::Deserialize;
use sha2::{Digest, Sha256};
use std::collections::{HashMap, VecDeque};
use std::sync::{Arc, LazyLock, Mutex};

const SHARE_PASSWORD_ATTEMPT_LIMIT: usize = 5;
const SHARE_PASSWORD_WINDOW_SECONDS: i64 = 5 * 60;
const SHARE_PASSWORD_COOLDOWN_SECONDS: i64 = 30;
const MAX_TRACKED_SHARE_TOKENS: usize = 1_024;
const MAX_SHARE_PASSWORD_CHARS: usize = 128;
const MAX_SHARE_PASSWORD_BYTES: usize = 512;
const SHARE_VERIFY_FORM_LIMIT_BYTES: usize = 1_024;
const SHARE_SECURITY_HEADERS: &[(&str, &str)] = &[
    ("Content-Security-Policy", "default-src 'none'; img-src 'self' data: blob:; media-src 'self' blob:; style-src 'unsafe-inline'; script-src 'unsafe-inline'; form-action 'self'; base-uri 'none'; frame-ancestors 'none'"),
    ("X-Content-Type-Options", "nosniff"),
    ("X-Frame-Options", "DENY"),
    ("Referrer-Policy", "no-referrer"),
    ("Permissions-Policy", "camera=(), microphone=(), geolocation=(), payment=(), usb=()"),
    ("Cache-Control", "no-store"),
    ("Cross-Origin-Opener-Policy", "same-origin"),
];

#[derive(Default)]
struct PasswordAttemptState {
    attempts: VecDeque<i64>,
    blocked_until: i64,
    last_seen: i64,
}

#[derive(Default)]
struct PasswordAttemptLimiter {
    attempts_by_token: HashMap<[u8; 32], PasswordAttemptState>,
}

impl PasswordAttemptLimiter {
    fn begin_attempt(&mut self, token_key: [u8; 32], now: i64) -> Result<(), i64> {
        self.prune(now);

        if !self.attempts_by_token.contains_key(&token_key)
            && self.attempts_by_token.len() >= MAX_TRACKED_SHARE_TOKENS
        {
            if let Some(oldest_key) = self
                .attempts_by_token
                .iter()
                .min_by_key(|(_, state)| state.last_seen)
                .map(|(key, _)| *key)
            {
                self.attempts_by_token.remove(&oldest_key);
            }
        }

        let state = self.attempts_by_token.entry(token_key).or_default();
        state.last_seen = now;

        if state.blocked_until > now {
            return Err((state.blocked_until - now).max(1));
        }
        if state.blocked_until != 0 {
            state.blocked_until = 0;
            state.attempts.clear();
        }

        let cutoff = now.saturating_sub(SHARE_PASSWORD_WINDOW_SECONDS);
        while state
            .attempts
            .front()
            .is_some_and(|attempt| *attempt <= cutoff)
        {
            state.attempts.pop_front();
        }

        if state.attempts.len() >= SHARE_PASSWORD_ATTEMPT_LIMIT {
            state.attempts.clear();
            state.blocked_until = now.saturating_add(SHARE_PASSWORD_COOLDOWN_SECONDS);
            return Err(SHARE_PASSWORD_COOLDOWN_SECONDS);
        }

        // Reserve the attempt before running bcrypt so concurrent requests cannot
        // all bypass the limit while password verification is in progress.
        state.attempts.push_back(now);
        Ok(())
    }

    fn record_failure(&mut self, token_key: &[u8; 32], now: i64) {
        if let Some(state) = self.attempts_by_token.get_mut(token_key) {
            state.last_seen = now;
            if state.attempts.len() >= SHARE_PASSWORD_ATTEMPT_LIMIT {
                state.attempts.clear();
                state.blocked_until = now.saturating_add(SHARE_PASSWORD_COOLDOWN_SECONDS);
            }
        }
    }

    fn clear(&mut self, token_key: &[u8; 32]) {
        self.attempts_by_token.remove(token_key);
    }

    fn prune(&mut self, now: i64) {
        let cutoff = now.saturating_sub(SHARE_PASSWORD_WINDOW_SECONDS);
        self.attempts_by_token.retain(|_, state| {
            while state
                .attempts
                .front()
                .is_some_and(|attempt| *attempt <= cutoff)
            {
                state.attempts.pop_front();
            }
            state.blocked_until > now || !state.attempts.is_empty()
        });
    }
}

static PASSWORD_ATTEMPT_LIMITER: LazyLock<Mutex<PasswordAttemptLimiter>> =
    LazyLock::new(|| Mutex::new(PasswordAttemptLimiter::default()));

fn token_attempt_key(token: &str) -> [u8; 32] {
    Sha256::digest(token.as_bytes()).into()
}

fn with_password_attempt_limiter<T>(operation: impl FnOnce(&mut PasswordAttemptLimiter) -> T) -> T {
    let mut limiter = PASSWORD_ATTEMPT_LIMITER
        .lock()
        .unwrap_or_else(|poisoned| poisoned.into_inner());
    operation(&mut limiter)
}

#[derive(Clone, Debug, serde::Serialize, serde::Deserialize)]
pub struct SharedItem {
    pub folder_id: Option<i64>,
    pub message_id: i32,
    pub file_name: String,
    pub file_size: i64,
}

#[derive(Clone)]
struct SharedLinkRow {
    _id: String,
    _folder_id: Option<i64>,
    _message_id: i32,
    file_name: String,
    file_size: i64,
    password_hash: Option<String>,
    _password_salt: Option<String>,
    expires_at: Option<i64>,
    revoked: bool,
    items: Vec<SharedItem>,
}

#[derive(Deserialize)]
struct VerifyForm {
    password: String,
}

/// Verify a password against a bcrypt hash.
fn verify_password(password: &str, hash: &str) -> bool {
    bcrypt::verify(password, hash).unwrap_or(false)
}

fn generate_cookie_val(token: &str, password_hash: &str) -> String {
    let mut hasher = Sha256::new();
    hasher.update(token.as_bytes());
    hasher.update(password_hash.as_bytes());
    format!("{:x}", hasher.finalize())
}

async fn get_share_by_token(
    db: DbConnection,
    token: String,
) -> Result<Option<SharedLinkRow>, String> {
    crate::db::with_connection(db, move |conn| {
        let mut stmt = conn
        .prepare(
            "SELECT id, folder_id, message_id, file_name, file_size, password_hash, password_salt, expires_at, revoked, items_json 
             FROM shared_links WHERE id = ?"
        )
        .map_err(|e| e.to_string())?;

        stmt.bind((1, token.as_str())).map_err(|e| e.to_string())?;

        if let sqlite::State::Row = stmt.next().map_err(|e| e.to_string())? {
            let id = stmt.read::<String, _>("id").map_err(|e| e.to_string())?;
            let folder_id = stmt.read::<Option<i64>, _>("folder_id").ok().flatten();
            let message_id = stmt.read::<i64, _>("message_id").map_err(|e| e.to_string())? as i32;
            let file_name = stmt.read::<String, _>("file_name").map_err(|e| e.to_string())?;
            let file_size = stmt.read::<i64, _>("file_size").map_err(|e| e.to_string())?;
            let password_hash = stmt.read::<Option<String>, _>("password_hash").ok().flatten();
            let _password_salt = stmt.read::<Option<String>, _>("password_salt").ok().flatten();
            let expires_at = stmt.read::<Option<i64>, _>("expires_at").ok().flatten();
            let revoked = stmt.read::<i64, _>("revoked").map_err(|e| e.to_string())? != 0;
            let items_json = stmt.read::<Option<String>, _>("items_json").ok().flatten();

            let items: Vec<SharedItem> = items_json
                .as_deref()
                .and_then(|json| serde_json::from_str::<Vec<SharedItem>>(json).ok())
                .filter(|list| !list.is_empty())
                .unwrap_or_else(|| {
                    vec![SharedItem {
                        folder_id,
                        message_id,
                        file_name: file_name.clone(),
                        file_size,
                    }]
                });

            Ok(Some(SharedLinkRow {
                _id: id,
                _folder_id: folder_id,
                _message_id: message_id,
                file_name,
                file_size,
                password_hash,
                _password_salt,
                expires_at,
                revoked,
                items,
            }))
        } else {
            Ok(None)
        }
    }).await
}

/// Renders the password entry form for protected share links.
///
/// NOTE: This HTML contains an inline `<style>` block which requires
/// `style-src 'unsafe-inline'` in the Tauri CSP (tauri.conf.json).
/// This page is served only by the loopback-bound Actix streaming server,
/// not by a hosted internet service. Dynamic values are escaped before they
/// are interpolated into the document.
fn escape_html(input: &str) -> String {
    input
        .replace('&', "&amp;")
        .replace('<', "&lt;")
        .replace('>', "&gt;")
        .replace('"', "&quot;")
        .replace('\'', "&#x27;")
}

fn resolve_req_lang(req: &HttpRequest) -> (&'static str, &'static str) {
    if let Some(query) = req.uri().query() {
        let query = query.to_ascii_lowercase();
        if query.contains("lang=ar") {
            return ("ar", "rtl");
        }
        if query.contains("lang=zh-tw")
            || query.contains("lang=zh-hk")
            || query.contains("lang=zh-hant")
        {
            return ("zh-TW", "ltr");
        }
        if query.contains("lang=bn") {
            return ("bn-BD", "ltr");
        }
        if query.contains("lang=th") {
            return ("th-TH", "ltr");
        }
        if query.contains("lang=fil") || query.contains("lang=tl") {
            return ("fil-PH", "ltr");
        }
        if query.contains("lang=es") {
            return ("es", "ltr");
        }
        if query.contains("lang=ru") {
            return ("ru", "ltr");
        }
        if query.contains("lang=fr") {
            return ("fr", "ltr");
        }
        if query.contains("lang=de") {
            return ("de", "ltr");
        }
        if query.contains("lang=pt") {
            return ("pt-BR", "ltr");
        }
        if query.contains("lang=zh") {
            return ("zh-CN", "ltr");
        }
        if query.contains("lang=vi") {
            return ("vi", "ltr");
        }
    }
    if let Some(accept) = req.headers().get("Accept-Language") {
        if let Ok(val) = accept.to_str() {
            let primary = val.split(',').next().unwrap_or("").trim().to_ascii_lowercase();
            if primary.starts_with("en") {
                return ("en", "ltr");
            }
            if primary.starts_with("ar") {
                return ("ar", "rtl");
            }
            if primary.starts_with("zh-tw") || primary.starts_with("zh-hk") || primary.starts_with("zh-hant") {
                return ("zh-TW", "ltr");
            }
            if primary.starts_with("th") {
                return ("th-TH", "ltr");
            }
            if primary.starts_with("fil") || primary.starts_with("tl") {
                return ("fil-PH", "ltr");
            }
            if primary.starts_with("es") {
                return ("es", "ltr");
            }
            if primary.starts_with("ru") {
                return ("ru", "ltr");
            }
            if primary.starts_with("fr") {
                return ("fr", "ltr");
            }
            if primary.starts_with("de") {
                return ("de", "ltr");
            }
            if primary.starts_with("pt") {
                return ("pt-BR", "ltr");
            }
            if primary.starts_with("zh") {
                return ("zh-CN", "ltr");
            }
            if primary.starts_with("vi") {
                return ("vi", "ltr");
            }
            if primary.starts_with("bn") {
                return ("bn-BD", "ltr");
            }
        }
    }
    ("en", "ltr")
}

fn render_password_form(
    req: &HttpRequest,
    file_name: &str,
    token: &str,
    error: Option<&str>,
) -> HttpResponse {
    let (lang, dir) = resolve_req_lang(req);
    let safe_file_name = escape_html(file_name);
    let (
        title_text,
        heading_text,
        desc_text,
        file_label,
        password_placeholder,
        btn_text,
        incorrect_password,
    ) = match lang {
        "es" => (
            "Archivo protegido con contraseña",
            "Ingrese contraseña",
            "Este enlace está protegido con contraseña.",
            "Archivo",
            "Contraseña",
            "Verificar y descargar",
            "Contraseña incorrecta. Inténtelo de nuevo.",
        ),
        "ru" => (
            "Файл защищен паролем",
            "Введите пароль",
            "Эта ссылка защищена паролем.",
            "Файл",
            "Пароль",
            "Проверить и скачать",
            "Неверный пароль. Повторите попытку.",
        ),
        "vi" => (
            "Tệp được bảo vệ bằng mật khẩu",
            "Nhập mật khẩu",
            "Liên kết chia sẻ này được bảo vệ bằng mật khẩu.",
            "Tệp",
            "Mật khẩu",
            "Xác minh và tải xuống",
            "Mật khẩu không đúng. Vui lòng thử lại.",
        ),
        "bn-BD" => (
            "পাসওয়ার্ড-সুরক্ষিত ফাইল",
            "পাসওয়ার্ড লিখুন",
            "এই শেয়ার লিঙ্কটি পাসওয়ার্ড দিয়ে সুরক্ষিত।",
            "ফাইল",
            "পাসওয়ার্ড",
            "যাচাই করে ডাউনলোড করুন",
            "পাসওয়ার্ডটি সঠিক নয়। আবার চেষ্টা করুন।",
        ),
        "th-TH" => (
            "ไฟล์ที่ป้องกันด้วยรหัสผ่าน",
            "ป้อนรหัสผ่าน",
            "ลิงก์แชร์นี้ได้รับการป้องกันด้วยรหัสผ่าน",
            "ไฟล์",
            "รหัสผ่าน",
            "ตรวจสอบและดาวน์โหลด",
            "รหัสผ่านไม่ถูกต้อง โปรดลองอีกครั้ง",
        ),
        "fil-PH" => (
            "File na Protektado ng Password",
            "Ilagay ang Password",
            "Protektado ng password ang share link na ito.",
            "File",
            "Password",
            "I-verify at I-download",
            "Mali ang password. Pakisubukang muli.",
        ),
        "zh-TW" => (
            "密碼保護的檔案",
            "輸入密碼",
            "此分享連結受密碼保護。",
            "檔案",
            "密碼",
            "驗證並下載",
            "密碼不正確，請再試一次。",
        ),
        _ => (
            "Password Protected File",
            "Enter Password",
            "This share link is password-protected.",
            "File",
            "Password",
            "Verify & Download",
            "Incorrect password. Please try again.",
        ),
    };
    let error_html = match error {
        Some(_) => format!(
            "<div class=\"error\">{}</div>",
            escape_html(incorrect_password)
        ),
        None => "".to_string(),
    };

    let html = format!(
        r#"<!DOCTYPE html>
<html lang="{}" dir="{}">
<head>
    <meta charset="utf-8">
    <title>{} - Telegram Drive</title>
    <style>
        body {{
            background-color: #182533;
            color: #ffffff;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
            display: flex;
            align-items: center;
            justify-content: center;
            height: 100vh;
            margin: 0;
        }}
        .container {{
            background: #202b36;
            padding: 2rem;
            border-radius: 12px;
            box-shadow: 0 8px 24px rgba(0, 0, 0, 0.2);
            border: 1px solid #2f3e4e;
            width: 100%;
            max-width: 400px;
            text-align: center;
        }}
        h2 {{
            margin-top: 0;
            color: #40a7e3;
        }}
        p {{
            font-size: 14px;
            color: #7f91a4;
            margin-bottom: 20px;
        }}
        input[type="password"] {{
            width: 100%;
            padding: 12px;
            border-radius: 6px;
            border: 1px solid #2f3e4e;
            background: #182533;
            color: white;
            box-sizing: border-box;
            margin-bottom: 15px;
            font-size: 16px;
        }}
        input[type="password"]:focus {{
            outline: none;
            border-color: #40a7e3;
        }}
        button {{
            width: 100%;
            padding: 12px;
            border-radius: 6px;
            border: none;
            background: #40a7e3;
            color: white;
            font-weight: bold;
            cursor: pointer;
            font-size: 16px;
            transition: background 0.2s;
        }}
        button:hover {{
            background: #3598d1;
        }}
        .error {{
            color: #ff5e5e;
            font-size: 14px;
            margin-bottom: 15px;
        }}
    </style>
</head>
<body>
    <div class="container">
        <h2>{}</h2>
        <p>{}<br>{}: <strong><bdi dir="auto">{}</bdi></strong></p>
        {}
        <form method="POST" action="/d/{}/verify">
            <input type="password" name="password" placeholder="{}" autofocus required>
            <button type="submit">{}</button>
        </form>
    </div>
</body>
</html>"#,
        lang,
        dir,
        title_text,
        heading_text,
        desc_text,
        file_label,
        safe_file_name,
        error_html,
        token,
        password_placeholder,
        btn_text
    );

    HttpResponse::Ok()
        .content_type("text/html; charset=utf-8")
        .body(html)
}

#[get("/d/{token}")]
async fn get_shared_file(
    req: HttpRequest,
    path: web::Path<String>,
    db_conn: web::Data<DbConnection>,
    tg_state: web::Data<Arc<TelegramState>>,
) -> impl Responder {
    let token = path.into_inner();

    let row = match get_share_by_token(db_conn.get_ref().clone(), token.clone()).await {
        Ok(Some(r)) => r,
        Ok(None) => return HttpResponse::NotFound().body("Shared link not found"),
        Err(e) => {
            log::error!("Database error resolving share link: {}", e);
            return HttpResponse::InternalServerError().body("Internal server error");
        }
    };

    // Check validation (revocation and expiration)
    if row.revoked {
        return HttpResponse::NotFound().body("This shared link has been revoked");
    }

    if let Some(expiry) = row.expires_at {
        let now = chrono::Utc::now().timestamp();
        if expiry < now {
            return HttpResponse::Gone().body("This shared link has expired");
        }
    }

    // Check password protection
    if let Some(hash) = &row.password_hash {
        let mut authenticated = false;
        if let Some(cookie) = req.cookie(&format!("share_auth_{}", token)) {
            let expected = generate_cookie_val(&token, hash);
            if cookie.value() == expected {
                authenticated = true;
            }
        }

        if !authenticated {
            return render_password_form(&req, &row.file_name, &token, None);
        }
    }

    // Direct download query for single-file shares (e.g. ?download=1)
    if req.query_string().contains("download=1") && row.items.len() == 1 {
        let first = &row.items[0];
        let client_opt = { tg_state.client.lock().await.clone() };
        let client = match client_opt {
            Some(c) => c,
            None => return HttpResponse::ServiceUnavailable().body("Telegram client is not connected"),
        };
        return stream_telegram_item(
            &client,
            &tg_state.peer_cache,
            first.folder_id,
            first.message_id,
            &first.file_name,
            &req,
            true,
        ).await;
    }

    // Render the rich gallery page with image previews and download buttons
    render_gallery_page(&token, &row)
}

fn is_share_authenticated(req: &HttpRequest, token: &str, password_hash: Option<&str>) -> bool {
    let Some(hash) = password_hash else {
        return true;
    };
    if let Some(cookie) = req.cookie(&format!("share_auth_{}", token)) {
        let expected = generate_cookie_val(token, hash);
        return cookie.value() == expected;
    }
    false
}

fn is_image_file(name: &str) -> bool {
    let lower = name.to_ascii_lowercase();
    lower.ends_with(".jpg")
        || lower.ends_with(".jpeg")
        || lower.ends_with(".png")
        || lower.ends_with(".webp")
        || lower.ends_with(".gif")
        || lower.ends_with(".bmp")
        || lower.ends_with(".svg")
        || lower.ends_with(".avif")
        || lower.ends_with(".heic")
}

fn is_video_file(name: &str) -> bool {
    let lower = name.to_ascii_lowercase();
    lower.ends_with(".mp4")
        || lower.ends_with(".mkv")
        || lower.ends_with(".mov")
        || lower.ends_with(".webm")
        || lower.ends_with(".avi")
        || lower.ends_with(".flv")
        || lower.ends_with(".wmv")
        || lower.ends_with(".m4v")
        || lower.ends_with(".3gp")
}

fn format_file_size(bytes: i64) -> String {
    const KB: f64 = 1024.0;
    const MB: f64 = KB * 1024.0;
    const GB: f64 = MB * 1024.0;
    let b = bytes as f64;
    if b >= GB {
        format!("{:.2} GB", b / GB)
    } else if b >= MB {
        format!("{:.2} MB", b / MB)
    } else if b >= KB {
        format!("{:.1} KB", b / KB)
    } else {
        format!("{} B", bytes)
    }
}

fn inferred_mime(path: &str) -> &'static str {
    match std::path::Path::new(path)
        .extension()
        .and_then(|ext| ext.to_str())
        .unwrap_or_default()
        .to_ascii_lowercase()
        .as_str()
    {
        "jpg" | "jpeg" => "image/jpeg",
        "png" => "image/png",
        "gif" => "image/gif",
        "webp" => "image/webp",
        "svg" => "image/svg+xml",
        "bmp" => "image/bmp",
        "mp4" => "video/mp4",
        "mov" => "video/quicktime",
        "mp3" => "audio/mpeg",
        "pdf" => "application/pdf",
        "zip" => "application/zip",
        _ => "application/octet-stream",
    }
}

async fn stream_telegram_item(
    client: &grammers_client::Client,
    peer_cache: &Arc<tokio::sync::RwLock<HashMap<i64, grammers_client::types::Peer>>>,
    folder_id: Option<i64>,
    message_id: i32,
    filename: &str,
    req: &HttpRequest,
    as_attachment: bool,
) -> HttpResponse {
    let peer = match resolve_peer(client, folder_id, peer_cache).await {
        Ok(p) => p,
        Err(e) => {
            log::error!("Failed to resolve peer for share item: {}", e);
            return HttpResponse::InternalServerError().body("Failed to locate folder");
        }
    };

    match client.get_messages_by_id(peer, &[message_id]).await {
        Ok(messages) => {
            if let Some(Some(msg)) = messages.first() {
                if let Some(media) = msg.media() {
                    let mime = match &media {
                        Media::Document(d) => d
                            .mime_type()
                            .unwrap_or_else(|| inferred_mime(filename))
                            .to_string(),
                        Media::Photo(_) => "image/jpeg".to_string(),
                        _ => inferred_mime(filename).to_string(),
                    };

                    let clean_name = filename.replace('"', "").replace('\n', "").replace('\r', "");
                    let disposition = if as_attachment {
                        format!("attachment; filename=\"{}\"", clean_name)
                    } else {
                        format!("inline; filename=\"{}\"", clean_name)
                    };

                    return crate::server::build_media_response(
                        client,
                        &media,
                        req,
                        &mime,
                        Some(filename),
                        crate::server::StreamingExtras {
                            extra_headers: vec![("Content-Disposition", disposition)],
                            log_label: "Share media stream",
                        },
                    );
                }
            }
            HttpResponse::NotFound().body("Message or media not found in Telegram")
        }
        Err(e) => {
            log::error!("Failed to fetch shared media item: {}", e);
            HttpResponse::InternalServerError().body("Unable to retrieve shared media item")
        }
    }
}

#[get("/d/{token}/item/{idx}/view")]
async fn view_shared_item(
    req: HttpRequest,
    path: web::Path<(String, usize)>,
    db_conn: web::Data<DbConnection>,
    tg_state: web::Data<Arc<TelegramState>>,
) -> impl Responder {
    let (token, idx) = path.into_inner();
    let row = match get_share_by_token(db_conn.get_ref().clone(), token.clone()).await {
        Ok(Some(r)) => r,
        _ => return HttpResponse::NotFound().body("Share not found"),
    };
    if row.revoked || row.expires_at.is_some_and(|exp| exp < chrono::Utc::now().timestamp()) {
        return HttpResponse::Gone().body("Share expired or revoked");
    }
    if !is_share_authenticated(&req, &token, row.password_hash.as_deref()) {
        return HttpResponse::Unauthorized().body("Authentication required");
    }
    if idx >= row.items.len() {
        return HttpResponse::NotFound().body("Item index out of bounds");
    }
    let item = &row.items[idx];
    let client_opt = { tg_state.client.lock().await.clone() };
    let client = match client_opt {
        Some(c) => c,
        None => return HttpResponse::ServiceUnavailable().body("Telegram client is not connected"),
    };
    stream_telegram_item(
        &client,
        &tg_state.peer_cache,
        item.folder_id,
        item.message_id,
        &item.file_name,
        &req,
        false,
    ).await
}

#[get("/d/{token}/item/{idx}/thumb")]
async fn thumb_shared_item(
    req: HttpRequest,
    path: web::Path<(String, usize)>,
    db_conn: web::Data<DbConnection>,
    tg_state: web::Data<Arc<TelegramState>>,
) -> impl Responder {
    let (token, idx) = path.into_inner();
    let row = match get_share_by_token(db_conn.get_ref().clone(), token.clone()).await {
        Ok(Some(r)) => r,
        _ => return HttpResponse::NotFound().body("Share not found"),
    };
    if row.revoked || row.expires_at.is_some_and(|exp| exp < chrono::Utc::now().timestamp()) {
        return HttpResponse::Gone().body("Share expired or revoked");
    }
    if !is_share_authenticated(&req, &token, row.password_hash.as_deref()) {
        return HttpResponse::Unauthorized().body("Authentication required");
    }
    if idx >= row.items.len() {
        return HttpResponse::NotFound().body("Item index out of bounds");
    }
    let item = &row.items[idx];
    let client_opt = { tg_state.client.lock().await.clone() };
    let client = match client_opt {
        Some(c) => c,
        None => return HttpResponse::ServiceUnavailable().body("Telegram client is not connected"),
    };

    let peer = match resolve_peer(&client, item.folder_id, &tg_state.peer_cache).await {
        Ok(p) => p,
        Err(e) => {
            log::error!("Failed to resolve peer for share thumb: {}", e);
            return HttpResponse::InternalServerError().body("Failed to locate folder");
        }
    };

    match client.get_messages_by_id(peer, &[item.message_id]).await {
        Ok(messages) => {
            if let Some(Some(msg)) = messages.first() {
                if let Some(media) = msg.media() {
                    let thumbs = match &media {
                        Media::Photo(p) => p.thumbs(),
                        Media::Document(d) => d.thumbs(),
                        _ => vec![],
                    };
                    if let Some(thumb) = thumbs
                        .iter()
                        .filter(|t| !matches!(t, PhotoSize::Empty(_) | PhotoSize::Stripped(_) | PhotoSize::Path(_)) && t.size() > 0)
                        .min_by_key(|t| {
                            let max_dim = match t {
                                PhotoSize::Size(s) => s.width.max(s.height),
                                PhotoSize::Progressive(p) => p.width.max(p.height),
                                PhotoSize::Cached(c) => c.width.max(c.height),
                                _ => 0,
                            };
                            let byte_size = t.size() as u64;
                            if max_dim >= 80 && max_dim <= 220 {
                                (0, byte_size, (max_dim - 160).abs() as u64)
                            } else if max_dim > 220 && max_dim <= 340 {
                                (1, byte_size, max_dim as u64)
                            } else if max_dim >= 48 && max_dim < 80 {
                                (2, byte_size, (80 - max_dim) as u64)
                            } else if max_dim > 340 {
                                (3, max_dim as u64, byte_size)
                            } else {
                                (4, byte_size, 0)
                            }
                        })
                    {
                        let temp_path = std::env::temp_dir().join(format!(
                            "share_thumb_{}_{}.jpg",
                            item.message_id,
                            rand::random::<u32>()
                        ));
                        let temp_str = temp_path.to_string_lossy().to_string();
                        if client.download_media(thumb, &temp_str).await.is_ok() {
                            if let Ok(bytes) = tokio::fs::read(&temp_path).await {
                                let _ = tokio::fs::remove_file(&temp_path).await;
                                return HttpResponse::Ok()
                                    .content_type("image/jpeg")
                                    .insert_header(("Cache-Control", "public, max-age=86400"))
                                    .body(bytes);
                            }
                        }
                        let _ = tokio::fs::remove_file(&temp_path).await;
                    }
                    if is_image_file(&item.file_name) {
                        return stream_telegram_item(
                            &client,
                            &tg_state.peer_cache,
                            item.folder_id,
                            item.message_id,
                            &item.file_name,
                            &req,
                            false,
                        ).await;
                    }
                }
            }
            HttpResponse::NotFound().body("Thumbnail not found")
        }
        Err(e) => {
            log::error!("Failed to fetch shared media thumb: {}", e);
            HttpResponse::InternalServerError().body("Unable to retrieve shared media thumb")
        }
    }
}

#[get("/d/{token}/item/{idx}/download")]
async fn download_shared_item(
    req: HttpRequest,
    path: web::Path<(String, usize)>,
    db_conn: web::Data<DbConnection>,
    tg_state: web::Data<Arc<TelegramState>>,
) -> impl Responder {
    let (token, idx) = path.into_inner();
    let row = match get_share_by_token(db_conn.get_ref().clone(), token.clone()).await {
        Ok(Some(r)) => r,
        _ => return HttpResponse::NotFound().body("Share not found"),
    };
    if row.revoked || row.expires_at.is_some_and(|exp| exp < chrono::Utc::now().timestamp()) {
        return HttpResponse::Gone().body("Share expired or revoked");
    }
    if !is_share_authenticated(&req, &token, row.password_hash.as_deref()) {
        return HttpResponse::Unauthorized().body("Authentication required");
    }
    if idx >= row.items.len() {
        return HttpResponse::NotFound().body("Item index out of bounds");
    }
    let item = &row.items[idx];
    let client_opt = { tg_state.client.lock().await.clone() };
    let client = match client_opt {
        Some(c) => c,
        None => return HttpResponse::ServiceUnavailable().body("Telegram client is not connected"),
    };
    stream_telegram_item(
        &client,
        &tg_state.peer_cache,
        item.folder_id,
        item.message_id,
        &item.file_name,
        &req,
        true,
    ).await
}

fn render_gallery_page(token: &str, row: &SharedLinkRow) -> HttpResponse {
    let total_size_str = format_file_size(row.file_size);
    let count = row.items.len();
    let header_title = if count == 1 {
        escape_html(&row.items[0].file_name)
    } else {
        format!("{} Shared Files", count)
    };
    let count_badge = if count == 1 {
        "1 file".to_string()
    } else {
        format!("{} files", count)
    };

    let mut cards_html = String::new();
    for (idx, item) in row.items.iter().enumerate() {
        let safe_name = escape_html(&item.file_name);
        let size_str = format_file_size(item.file_size);
        let is_img = is_image_file(&item.file_name);
        let is_vid = is_video_file(&item.file_name);
        let view_url = format!("/d/{}/item/{}/view", token, idx);
        let thumb_url = format!("/d/{}/item/{}/thumb", token, idx);
        let dl_url = format!("/d/{}/item/{}/download", token, idx);

        let preview_markup = if is_img {
            format!(
                r#"<div class="card-preview" onclick="openLightbox('{}', '{}')">
                    <img src="{}" alt="{}" loading="lazy" />
                   </div>"#,
                view_url, safe_name, thumb_url, safe_name
            )
        } else if is_vid {
            format!(
                r#"<div class="card-preview video-preview" onclick="openVideoPlayer('{}', '{}')">
                    <img src="{}" alt="{}" loading="lazy" onerror="this.style.display='none';this.parentElement.classList.add('no-thumb');" />
                    <div class="video-fallback-ext">
                        <div class="ext-badge">VIDEO</div>
                    </div>
                    <div class="play-overlay">
                        <svg viewBox="0 0 24 24" fill="white" class="play-icon">
                            <polygon points="6 3 20 12 6 21 6 3"></polygon>
                        </svg>
                    </div>
                   </div>"#,
                view_url, safe_name, thumb_url, safe_name
            )
        } else {
            let ext = item.file_name.rsplit('.').next().unwrap_or("FILE").to_ascii_uppercase();
            format!(
                r#"<div class="card-preview file-type-preview">
                    <div class="ext-badge">{}</div>
                   </div>"#,
                escape_html(&ext)
            )
        };

        cards_html.push_str(&format!(
            r#"<div class="card">
                {}
                <div class="card-content">
                    <div class="card-title" title="{}">{}</div>
                    <div class="card-action-row">
                        <span class="card-size">{}</span>
                        <a href="{}" download="{}" class="dl-btn" title="Download">
                            <svg class="dl-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                                <polyline points="7 10 12 15 17 10"></polyline>
                                <line x1="12" y1="15" x2="12" y2="3"></line>
                            </svg>
                            <span>Download</span>
                        </a>
                    </div>
                </div>
            </div>"#,
            preview_markup, safe_name, safe_name, size_str, dl_url, safe_name
        ));
    }

    let download_all_btn = if count > 1 {
        r#"<button id="dlAllBtn" class="dl-all-btn" onclick="downloadAll()">
            <svg class="dl-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                <polyline points="7 10 12 15 17 10"></polyline>
                <line x1="12" y1="15" x2="12" y2="3"></line>
            </svg>
            <span>Download All</span>
           </button>"#
    } else {
        ""
    };

    let html = format!(
        r#"<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=5">
    <title>{} - Telegram Drive</title>
    <style>
        * {{
            box-sizing: border-box;
            margin: 0;
            padding: 0;
        }}
        body {{
            background-color: #0e1621;
            color: #ffffff;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
            min-height: 100vh;
            padding: 24px 16px 60px;
        }}
        .header {{
            max-width: 1200px;
            margin: 0 auto 28px;
            display: flex;
            align-items: center;
            justify-content: space-between;
            flex-wrap: wrap;
            gap: 16px;
            padding: 16px 20px;
            background: #17212b;
            border: 1px solid #242f3d;
            border-radius: 16px;
            box-shadow: 0 4px 20px rgba(0, 0, 0, 0.25);
        }}
        .brand-info {{
            display: flex;
            align-items: center;
            gap: 14px;
        }}
        .logo-icon {{
            width: 42px;
            height: 42px;
            border-radius: 12px;
            background: linear-gradient(135deg, #2AABEE 0%, #229ED9 100%);
            display: flex;
            align-items: center;
            justify-content: center;
            color: white;
            font-weight: 800;
            font-size: 20px;
            box-shadow: 0 4px 12px rgba(42, 171, 238, 0.35);
        }}
        .title-area h1 {{
            font-size: 18px;
            font-weight: 700;
            color: #ffffff;
            line-height: 1.3;
        }}
        .title-area .meta {{
            font-size: 13px;
            color: #7f91a4;
            display: flex;
            align-items: center;
            gap: 8px;
            margin-top: 3px;
        }}
        .badge {{
            display: inline-flex;
            align-items: center;
            padding: 2px 8px;
            border-radius: 6px;
            background: rgba(42, 171, 238, 0.15);
            color: #2AABEE;
            font-size: 11px;
            font-weight: 600;
        }}
        .gallery-container {{
            max-width: 1200px;
            margin: 0 auto;
        }}
        .grid {{
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
            gap: 18px;
        }}
        .card {{
            background: #17212b;
            border: 1px solid #242f3d;
            border-radius: 14px;
            overflow: hidden;
            display: flex;
            flex-direction: column;
            box-shadow: 0 4px 16px rgba(0, 0, 0, 0.2);
            transition: transform 0.2s, border-color 0.2s, box-shadow 0.2s;
        }}
        .card:hover {{
            transform: translateY(-2px);
            border-color: #2AABEE;
            box-shadow: 0 8px 24px rgba(42, 171, 238, 0.15);
        }}
        .card-preview {{
            width: 100%;
            height: 190px;
            background: #0f1821;
            position: relative;
            overflow: hidden;
            display: flex;
            align-items: center;
            justify-content: center;
            cursor: pointer;
        }}
        .card-preview img {{
            width: 100%;
            height: 100%;
            object-fit: cover;
            transition: transform 0.25s ease;
        }}
        .card-preview img:hover {{
            transform: scale(1.04);
        }}
        .file-type-preview {{
            background: linear-gradient(135deg, #17212b 0%, #202b36 100%);
            cursor: default;
        }}
        .ext-badge {{
            padding: 10px 18px;
            background: rgba(42, 171, 238, 0.2);
            border: 1px solid rgba(42, 171, 238, 0.35);
            color: #2AABEE;
            font-weight: 800;
            font-size: 16px;
            border-radius: 10px;
            letter-spacing: 1px;
        }}
        .card-content {{
            padding: 14px;
            display: flex;
            flex-direction: column;
            gap: 10px;
            flex: 1;
            justify-content: space-between;
        }}
        .card-title {{
            font-size: 13.5px;
            font-weight: 600;
            color: #e5e9f0;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
            line-height: 1.4;
        }}
        .card-action-row {{
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 10px;
            margin-top: auto;
        }}
        .card-size {{
            font-size: 12px;
            font-weight: 500;
            color: #7f91a4;
        }}
        .dl-btn, .dl-all-btn {{
            display: inline-flex;
            align-items: center;
            gap: 6px;
            padding: 7px 14px;
            background: #2AABEE;
            color: #ffffff;
            text-decoration: none;
            border-radius: 8px;
            font-size: 12px;
            font-weight: 600;
            cursor: pointer;
            border: none;
            transition: background 0.15s, transform 0.1s;
            user-select: none;
        }}
        .dl-btn:hover, .dl-all-btn:hover {{
            background: #229ED9;
            transform: scale(1.02);
        }}
        .dl-btn:active, .dl-all-btn:active {{
            transform: scale(0.98);
        }}
        .dl-icon {{
            width: 14px;
            height: 14px;
        }}
        .dl-all-btn {{
            padding: 9px 18px;
            font-size: 13.5px;
            background: linear-gradient(135deg, #2AABEE 0%, #1e88e5 100%);
            box-shadow: 0 4px 12px rgba(42, 171, 238, 0.3);
        }}
        /* Video Card & Play Overlay */
        .video-preview {{
            position: relative;
            cursor: pointer;
        }}
        .video-fallback-ext {{
            display: none;
            width: 100%;
            height: 100%;
            align-items: center;
            justify-content: center;
            background: #111a24;
        }}
        .video-preview.no-thumb .video-fallback-ext {{
            display: flex;
        }}
        .play-overlay {{
            position: absolute;
            inset: 0;
            display: flex;
            align-items: center;
            justify-content: center;
            background: rgba(0, 0, 0, 0.28);
            transition: background 0.2s, transform 0.2s;
            pointer-events: none;
        }}
        .card-preview:hover .play-overlay {{
            background: rgba(0, 0, 0, 0.15);
        }}
        .play-icon {{
            width: 44px;
            height: 44px;
            filter: drop-shadow(0 4px 10px rgba(0, 0, 0, 0.5));
            transition: transform 0.2s;
        }}
        .card-preview:hover .play-icon {{
            transform: scale(1.1);
        }}
        .video-container {{
            max-width: 90vw;
            max-height: 85vh;
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 12px;
        }}
        .video-player-el {{
            max-width: 90vw;
            max-height: 80vh;
            border-radius: 12px;
            outline: none;
            box-shadow: 0 8px 32px rgba(0, 0, 0, 0.7);
            background: black;
        }}
        .video-player-title {{
            color: #ffffff;
            font-size: 15px;
            font-weight: 600;
            text-align: center;
        }}
        /* Lightbox */
        .lightbox-modal {{
            display: none;
            position: fixed;
            inset: 0;
            z-index: 999;
            background: rgba(0, 0, 0, 0.88);
            backdrop-filter: blur(8px);
            align-items: center;
            justify-content: center;
            padding: 20px;
        }}
        .lightbox-modal.active {{
            display: flex;
        }}
        .lightbox-content {{
            max-width: 90vw;
            max-height: 85vh;
            border-radius: 12px;
            box-shadow: 0 8px 32px rgba(0, 0, 0, 0.6);
            object-fit: contain;
        }}
        .lightbox-close {{
            position: absolute;
            top: 20px;
            right: 20px;
            background: rgba(255, 255, 255, 0.15);
            border: none;
            color: white;
            font-size: 28px;
            width: 44px;
            height: 44px;
            border-radius: 50%;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            transition: background 0.2s;
        }}
        .lightbox-close:hover {{
            background: rgba(255, 255, 255, 0.3);
        }}
        @media (max-width: 640px) {{
            body {{
                padding: 14px 10px 50px;
            }}
            .header {{
                padding: 14px;
                margin-bottom: 18px;
            }}
            .grid {{
                grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
                gap: 12px;
            }}
            .card-preview {{
                height: 140px;
            }}
            .card-content {{
                padding: 10px;
            }}
            .card-title {{
                font-size: 12.5px;
            }}
            .card-action-row {{
                flex-direction: column;
                align-items: stretch;
                gap: 6px;
            }}
            .dl-btn {{
                justify-content: center;
                padding: 6px 10px;
            }}
        }}
    </style>
</head>
<body>
    <header class="header">
        <div class="brand-info">
            <div class="logo-icon">T</div>
            <div class="title-area">
                <h1>{}</h1>
                <div class="meta">
                    <span class="badge">{}</span>
                    <span>•</span>
                    <span>{}</span>
                </div>
            </div>
        </div>
        {}
    </header>

    <main class="gallery-container">
        <div class="grid">
            {}
        </div>
    </main>

    <div id="lightbox" class="lightbox-modal" onclick="closeLightbox()">
        <button class="lightbox-close" onclick="closeLightbox()">&times;</button>
        <img id="lightboxImg" class="lightbox-content" src="" alt="Full Preview" onclick="event.stopPropagation()" />
    </div>

    <div id="videoModal" class="lightbox-modal" onclick="closeVideoPlayer()">
        <button class="lightbox-close" onclick="closeVideoPlayer()">&times;</button>
        <div class="video-container" onclick="event.stopPropagation()">
            <video id="galleryVideoPlayer" controls playsinline preload="auto" class="video-player-el"></video>
            <div id="videoTitle" class="video-player-title"></div>
        </div>
    </div>

    <script>
        function openLightbox(src, name) {{
            var modal = document.getElementById('lightbox');
            var img = document.getElementById('lightboxImg');
            img.src = src;
            img.alt = name;
            modal.classList.add('active');
        }}
        function closeLightbox() {{
            var modal = document.getElementById('lightbox');
            modal.classList.remove('active');
        }}
        function openVideoPlayer(src, name) {{
            var modal = document.getElementById('videoModal');
            var video = document.getElementById('galleryVideoPlayer');
            var title = document.getElementById('videoTitle');
            video.src = src;
            title.textContent = name;
            modal.classList.add('active');
            video.play().catch(function() {{}});
        }}
        function closeVideoPlayer() {{
            var modal = document.getElementById('videoModal');
            var video = document.getElementById('galleryVideoPlayer');
            video.pause();
            video.removeAttribute('src');
            video.load();
            modal.classList.remove('active');
        }}
        document.addEventListener('keydown', function(e) {{
            if (e.key === 'Escape') {{
                closeLightbox();
                closeVideoPlayer();
            }}
        }});
        function downloadAll() {{
            var links = document.querySelectorAll('.dl-btn');
            links.forEach(function(link, i) {{
                setTimeout(function() {{
                    var a = document.createElement('a');
                    a.href = link.href;
                    a.download = link.getAttribute('download') || '';
                    document.body.appendChild(a);
                    a.click();
                    document.body.removeChild(a);
                }}, i * 400);
            }});
        }}
    </script>
</body>
</html>"#,
        header_title,
        header_title,
        count_badge,
        total_size_str,
        download_all_btn,
        cards_html
    );

    HttpResponse::Ok()
        .content_type("text/html; charset=utf-8")
        .body(html)
}

#[post("/d/{token}/verify")]
async fn verify_shared_file_password(
    req: HttpRequest,
    path: web::Path<String>,
    form: web::Form<VerifyForm>,
    db_conn: web::Data<DbConnection>,
) -> impl Responder {
    let token = path.into_inner();

    let row = match get_share_by_token(db_conn.get_ref().clone(), token.clone()).await {
        Ok(Some(r)) => r,
        Ok(None) => return HttpResponse::NotFound().body("Shared link not found"),
        Err(e) => {
            log::error!("Database error resolving share link: {}", e);
            return HttpResponse::InternalServerError().body("Internal server error");
        }
    };

    if row.revoked {
        return HttpResponse::NotFound().body("This shared link has been revoked");
    }

    if row
        .expires_at
        .is_some_and(|expiry| expiry < chrono::Utc::now().timestamp())
    {
        return HttpResponse::Gone().body("This shared link has expired");
    }

    let hash = match &row.password_hash {
        Some(h) => h,
        None => return HttpResponse::BadRequest().body("No password required for this link"),
    };

    let token_key = token_attempt_key(&token);
    let now = chrono::Utc::now().timestamp();
    if let Err(retry_after) =
        with_password_attempt_limiter(|limiter| limiter.begin_attempt(token_key, now))
    {
        return HttpResponse::TooManyRequests()
            .insert_header(("Retry-After", retry_after.to_string()))
            .body("Too many password attempts. Try again shortly.");
    }

    if form.password.chars().count() > MAX_SHARE_PASSWORD_CHARS
        || form.password.len() > MAX_SHARE_PASSWORD_BYTES
    {
        with_password_attempt_limiter(|limiter| limiter.record_failure(&token_key, now));
        return render_password_form(&req, &row.file_name, &token, Some("invalid"));
    }

    let password = form.password.clone();
    let hash_for_verify = hash.clone();
    let verified =
        tokio::task::spawn_blocking(move || verify_password(&password, &hash_for_verify))
            .await
            .unwrap_or(false);

    if verified {
        with_password_attempt_limiter(|limiter| limiter.clear(&token_key));
        let val = generate_cookie_val(&token, hash);
        let cookie = Cookie::build(format!("share_auth_{}", token), val)
            .path(format!("/d/{}", token))
            .http_only(true)
            .same_site(actix_web::cookie::SameSite::Strict)
            .max_age(actix_web::cookie::time::Duration::minutes(30))
            .finish();

        HttpResponse::Found()
            .insert_header(("Location", format!("/d/{}", token)))
            .cookie(cookie)
            .finish()
    } else {
        with_password_attempt_limiter(|limiter| limiter.record_failure(&token_key, now));
        render_password_form(
            &req,
            &row.file_name,
            &token,
            Some("Incorrect password. Please try again."),
        )
    }
}

pub fn configure_share_routes(cfg: &mut web::ServiceConfig) {
    let mut headers = DefaultHeaders::new();
    for (name, value) in SHARE_SECURITY_HEADERS {
        headers = headers.add((*name, *value));
    }
    cfg.service(
        web::scope("")
            .wrap(headers)
            .app_data(web::FormConfig::default().limit(SHARE_VERIFY_FORM_LIMIT_BYTES))
            .service(get_shared_file)
            .service(verify_shared_file_password)
            .service(view_shared_item)
            .service(thumb_shared_item)
            .service(download_shared_item),
    );
}

#[cfg(test)]
mod tests {
    use super::{
        resolve_req_lang, token_attempt_key, PasswordAttemptLimiter, MAX_TRACKED_SHARE_TOKENS,
        SHARE_PASSWORD_COOLDOWN_SECONDS, SHARE_SECURITY_HEADERS,
    };
    use actix_web::test::TestRequest;

    #[test]
    fn resolves_vietnamese_share_language() {
        let query_request = TestRequest::with_uri("/d/example?lang=vi").to_http_request();
        assert_eq!(resolve_req_lang(&query_request), ("vi", "ltr"));

        let header_request = TestRequest::default()
            .insert_header(("Accept-Language", "vi-VN,vi;q=0.9,en;q=0.8"))
            .to_http_request();
        assert_eq!(resolve_req_lang(&header_request), ("vi", "ltr"));
    }

    #[test]
    fn resolves_new_regional_share_languages() {
        for (locale, expected) in [
            ("bn-BD", "bn-BD"),
            ("th-TH", "th-TH"),
            ("fil-PH", "fil-PH"),
            ("tl-PH", "fil-PH"),
            ("zh-TW", "zh-TW"),
            ("zh-Hant", "zh-TW"),
        ] {
            let request =
                TestRequest::with_uri(&format!("/d/example?lang={locale}")).to_http_request();
            assert_eq!(resolve_req_lang(&request), (expected, "ltr"));
        }

        let traditional_chinese = TestRequest::default()
            .insert_header(("Accept-Language", "zh-HK,zh-Hant;q=0.9,en;q=0.8"))
            .to_http_request();
        assert_eq!(resolve_req_lang(&traditional_chinese), ("zh-TW", "ltr"));
    }

    #[test]
    fn password_attempts_are_throttled_and_recover_after_cooldown() {
        let mut limiter = PasswordAttemptLimiter::default();
        let token_key = token_attempt_key("private-share-token");

        for now in 100..105 {
            assert_eq!(limiter.begin_attempt(token_key, now), Ok(()));
            limiter.record_failure(&token_key, now);
        }

        assert_eq!(limiter.begin_attempt(token_key, 105), Err(29));
        assert_eq!(
            limiter.begin_attempt(token_key, 104 + SHARE_PASSWORD_COOLDOWN_SECONDS),
            Ok(())
        );
    }

    #[test]
    fn successful_password_clears_attempt_history() {
        let mut limiter = PasswordAttemptLimiter::default();
        let token_key = token_attempt_key("successful-share-token");

        for now in 200..204 {
            limiter.begin_attempt(token_key, now).unwrap();
            limiter.record_failure(&token_key, now);
        }
        limiter.begin_attempt(token_key, 204).unwrap();
        limiter.clear(&token_key);

        for now in 205..210 {
            assert_eq!(limiter.begin_attempt(token_key, now), Ok(()));
        }
    }

    #[test]
    fn password_attempt_tracking_is_bounded() {
        let mut limiter = PasswordAttemptLimiter::default();

        for index in 0..MAX_TRACKED_SHARE_TOKENS {
            let token_key = token_attempt_key(&format!("share-{index}"));
            assert_eq!(limiter.begin_attempt(token_key, 0), Ok(()));
            limiter
                .attempts_by_token
                .get_mut(&token_key)
                .unwrap()
                .last_seen = index as i64;
        }

        assert_eq!(
            limiter.begin_attempt(token_attempt_key("overflow-share"), 0),
            Ok(())
        );

        assert_eq!(limiter.attempts_by_token.len(), MAX_TRACKED_SHARE_TOKENS);
        assert!(!limiter
            .attempts_by_token
            .contains_key(&token_attempt_key("share-0")));
    }

    #[test]
    fn share_pages_define_defense_in_depth_headers_and_a_bounded_form() {
        for required in [
            "Content-Security-Policy",
            "X-Content-Type-Options",
            "Referrer-Policy",
            "Permissions-Policy",
            "Cache-Control",
        ] {
            assert!(SHARE_SECURITY_HEADERS
                .iter()
                .any(|(name, _)| *name == required));
        }
    }
}
