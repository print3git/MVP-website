CREATE TABLE IF NOT EXISTS printer_hubs (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  location TEXT,
  operator TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
