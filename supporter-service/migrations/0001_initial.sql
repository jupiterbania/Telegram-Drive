PRAGMA foreign_keys = ON;

CREATE TABLE licenses (
    id TEXT PRIMARY KEY,
    license_key TEXT NOT NULL UNIQUE,
    customer_name TEXT,
    customer_email TEXT,
    plan_type TEXT NOT NULL CHECK (plan_type IN ('lifetime', 'annual', 'monthly', 'trial')) DEFAULT 'lifetime',
    max_devices INTEGER NOT NULL DEFAULT 2,
    is_banned INTEGER NOT NULL DEFAULT 0 CHECK (is_banned IN (0, 1)),
    ban_reason TEXT,
    notes TEXT,
    created_at INTEGER NOT NULL,
    expires_at INTEGER
);

CREATE INDEX licenses_key_idx ON licenses(license_key);
CREATE INDEX licenses_email_idx ON licenses(customer_email);
CREATE INDEX licenses_created_idx ON licenses(created_at DESC);

CREATE TABLE device_activations (
    id TEXT PRIMARY KEY,
    license_key TEXT NOT NULL REFERENCES licenses(license_key) ON DELETE CASCADE,
    hardware_id TEXT NOT NULL,
    device_name TEXT NOT NULL,
    platform TEXT NOT NULL CHECK (platform IN ('windows', 'android', 'ios', 'macos', 'linux', 'web', 'other')),
    activated_at INTEGER NOT NULL,
    last_seen_at INTEGER NOT NULL,
    is_revoked INTEGER NOT NULL DEFAULT 0 CHECK (is_revoked IN (0, 1)),
    UNIQUE (license_key, hardware_id)
);

CREATE INDEX device_activations_key_idx ON device_activations(license_key, is_revoked);
CREATE INDEX device_activations_hw_idx ON device_activations(hardware_id);

CREATE TABLE admin_audit_logs (
    id TEXT PRIMARY KEY,
    action TEXT NOT NULL,
    target_key TEXT,
    details TEXT,
    created_at INTEGER NOT NULL
);

CREATE INDEX admin_audit_created_idx ON admin_audit_logs(created_at DESC);
