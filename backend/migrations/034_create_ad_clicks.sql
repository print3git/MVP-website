CREATE TABLE IF NOT EXISTS ad_clicks (
  id SERIAL PRIMARY KEY,
  subreddit TEXT,
  session_id TEXT,
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS ad_clicks_subreddit_idx ON ad_clicks(subreddit);
CREATE INDEX IF NOT EXISTS ad_clicks_session_idx ON ad_clicks(session_id);

CREATE TRIGGER ad_clicks_set_updated
BEFORE UPDATE ON ad_clicks
FOR EACH ROW EXECUTE PROCEDURE set_updated_at();
