-- Telegram Drive Cloud Shares D1 Initial Schema

CREATE TABLE IF NOT EXISTS cloud_shares (
    id TEXT PRIMARY KEY,
    channel_username TEXT NOT NULL,
    message_id INTEGER NOT NULL,
    file_name TEXT NOT NULL,
    file_size INTEGER NOT NULL,
    mime_type TEXT,
    password_hash TEXT,
    password_salt TEXT,
    expires_at INTEGER,
    created_at INTEGER NOT NULL,
    download_count INTEGER DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_cloud_shares_expires ON cloud_shares(expires_at);
CREATE INDEX IF NOT EXISTS idx_cloud_shares_created ON cloud_shares(created_at);
