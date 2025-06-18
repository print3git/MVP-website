CREATE TABLE IF NOT EXISTS cart_events (
  id SERIAL PRIMARY KEY,
  session_id TEXT NOT NULL,
  model_id UUID,
  subreddit TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS cart_events_session_idx ON cart_events(session_id);
CREATE INDEX IF NOT EXISTS cart_events_model_idx ON cart_events(model_id);
CREATE INDEX IF NOT EXISTS cart_events_sr_idx ON cart_events(subreddit);

CREATE TRIGGER cart_events_set_updated
BEFORE UPDATE ON cart_events
FOR EACH ROW EXECUTE PROCEDURE set_updated_at();
