CREATE TABLE IF NOT EXISTS share_events (
  id SERIAL PRIMARY KEY,
  share_id UUID REFERENCES shares(id) ON DELETE CASCADE,
  network TEXT NOT NULL,
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS share_events_share_idx ON share_events(share_id);
CREATE INDEX IF NOT EXISTS share_events_network_idx ON share_events(network);

CREATE TRIGGER share_events_set_updated
BEFORE UPDATE ON share_events
FOR EACH ROW EXECUTE PROCEDURE set_updated_at();
