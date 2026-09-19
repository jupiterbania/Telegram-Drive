PRAGMA foreign_keys = ON;

CREATE TABLE recovery_otps (
    id TEXT PRIMARY KEY,
    email TEXT NOT NULL,
    otp_hash TEXT NOT NULL,
    attempts INTEGER NOT NULL DEFAULT 0,
    expires_at INTEGER NOT NULL,
    created_at INTEGER NOT NULL
);

CREATE INDEX recovery_otps_email_idx ON recovery_otps(email);
CREATE INDEX recovery_otps_created_idx ON recovery_otps(created_at DESC);
