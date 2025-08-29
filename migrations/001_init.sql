-- migrations/001_init.sql

-- 1) helper for UUIDs
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 2) your first app table (example "metadata")
CREATE TABLE IF NOT EXISTS metadata (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  prompt      TEXT        NOT NULL,
  url         TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3) optional index for time-ordered queries
CREATE INDEX IF NOT EXISTS idx_metadata_created_at ON metadata (created_at DESC);

-- 4) make sure the app user can use it
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE metadata TO app_user;
GRANT USAGE, SELECT, UPDATE ON ALL SEQUENCES IN SCHEMA public TO app_user;
