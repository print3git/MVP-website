CREATE TABLE IF NOT EXISTS checkout_events (
  id SERIAL PRIMARY KEY,
  session_id TEXT,
  subreddit TEXT,
  step TEXT CHECK (step IN ('start','complete')),
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS checkout_events_session_idx ON checkout_events(session_id);
CREATE INDEX IF NOT EXISTS checkout_events_subreddit_idx ON checkout_events(subreddit);

CREATE TRIGGER checkout_events_set_updated
BEFORE UPDATE ON checkout_events
FOR EACH ROW EXECUTE PROCEDURE set_updated_at();
