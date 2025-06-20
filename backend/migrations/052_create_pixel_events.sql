CREATE TABLE IF NOT EXISTS pixel_events (
  id SERIAL PRIMARY KEY,
  session_id TEXT,
  ip TEXT,
  referrer TEXT,
  campaign TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS pixel_events_session_idx ON pixel_events(session_id);
