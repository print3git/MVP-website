CREATE TABLE IF NOT EXISTS share_events (
  id SERIAL PRIMARY KEY,
  share_id INTEGER REFERENCES shares(id) ON DELETE CASCADE,
  network TEXT NOT NULL,
  timestamp TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS share_events_share_idx ON share_events(share_id);
