CREATE TABLE IF NOT EXISTS ad_clicks (
  id SERIAL PRIMARY KEY,
  subreddit TEXT NOT NULL,
  session_id TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS ad_clicks_session_idx ON ad_clicks(session_id);
CREATE INDEX IF NOT EXISTS ad_clicks_sr_idx ON ad_clicks(subreddit);

CREATE TRIGGER ad_clicks_set_updated
BEFORE UPDATE ON ad_clicks
FOR EACH ROW EXECUTE PROCEDURE set_updated_at();
