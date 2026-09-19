PRAGMA foreign_keys = ON;

CREATE TABLE special_offers (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    badge TEXT NOT NULL DEFAULT 'LIMITED OFFER',
    description TEXT NOT NULL,
    original_price REAL,
    offer_price REAL,
    coupon_code TEXT,
    cta_text TEXT NOT NULL DEFAULT 'Claim Offer',
    banner_style TEXT DEFAULT 'gold',
    countdown_end INTEGER,
    is_active INTEGER NOT NULL DEFAULT 1,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
);

CREATE INDEX special_offers_active_idx ON special_offers(is_active, created_at DESC);
