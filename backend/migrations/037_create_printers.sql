CREATE TABLE IF NOT EXISTS printers (
  id SERIAL PRIMARY KEY,
  name TEXT,
  api_url TEXT NOT NULL,
  status TEXT DEFAULT 'idle',
  last_seen TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TRIGGER printers_set_updated
BEFORE UPDATE ON printers
FOR EACH ROW EXECUTE PROCEDURE set_updated_at();
