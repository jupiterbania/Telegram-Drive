-- Migration: 0006_crash_reports.sql
-- Description: Creates crash_reports table for privacy-safe error telemetry

CREATE TABLE IF NOT EXISTS crash_reports (
  id TEXT PRIMARY KEY,
  app_version TEXT NOT NULL,
  source TEXT NOT NULL,
  error_type TEXT NOT NULL,
  frames TEXT NOT NULL,
  platform TEXT NOT NULL,
  occurred_at TEXT NOT NULL,
  created_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_crash_reports_created_at ON crash_reports(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_crash_reports_version ON crash_reports(app_version);
