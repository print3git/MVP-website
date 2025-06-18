CREATE TABLE IF NOT EXISTS page_views (
  id SERIAL PRIMARY KEY,
  session_id TEXT,
  subreddit TEXT,
  utm_source TEXT,
  utm_medium TEXT,
  utm_campaign TEXT,
  path TEXT,
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS page_views_session_idx ON page_views(session_id);
CREATE INDEX IF NOT EXISTS page_views_subreddit_idx ON page_views(subreddit);

CREATE TRIGGER page_views_set_updated
BEFORE UPDATE ON page_views
FOR EACH ROW EXECUTE PROCEDURE set_updated_at();
