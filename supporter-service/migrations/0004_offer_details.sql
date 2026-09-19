ALTER TABLE special_offers ADD COLUMN discount_type TEXT DEFAULT 'percent';
ALTER TABLE special_offers ADD COLUMN discount_value REAL DEFAULT 0;
ALTER TABLE special_offers ADD COLUMN perks TEXT;
