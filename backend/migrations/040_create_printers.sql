CREATE TABLE IF NOT EXISTS printers (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  api_url TEXT NOT NULL,
  status TEXT DEFAULT 'unknown',
  last_seen TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS printers_status_idx ON printers(status);
