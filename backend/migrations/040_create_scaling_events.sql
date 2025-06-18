CREATE TABLE IF NOT EXISTS scaling_events (
  id SERIAL PRIMARY KEY,
  subreddit TEXT,
  old_budget_cents INTEGER,
  new_budget_cents INTEGER,
  reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS scaling_events_subreddit_idx ON scaling_events(subreddit);

CREATE TRIGGER scaling_events_set_updated
BEFORE UPDATE ON scaling_events
FOR EACH ROW EXECUTE PROCEDURE set_updated_at();
