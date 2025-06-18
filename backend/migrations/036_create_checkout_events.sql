CREATE TABLE IF NOT EXISTS checkout_events (
  id SERIAL PRIMARY KEY,
  session_id TEXT NOT NULL,
  subreddit TEXT,
  step TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS checkout_events_session_idx ON checkout_events(session_id);
CREATE INDEX IF NOT EXISTS checkout_events_sr_idx ON checkout_events(subreddit);
CREATE INDEX IF NOT EXISTS checkout_events_step_idx ON checkout_events(step);

CREATE TRIGGER checkout_events_set_updated
BEFORE UPDATE ON checkout_events
FOR EACH ROW EXECUTE PROCEDURE set_updated_at();
