CREATE TABLE IF NOT EXISTS page_views (
  id SERIAL PRIMARY KEY,
  session_id TEXT,
  subreddit TEXT,
  utm_source TEXT,
  utm_medium TEXT,
  utm_campaign TEXT,
  timestamp TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS page_views_session_idx ON page_views(session_id);
CREATE INDEX IF NOT EXISTS page_views_subreddit_idx ON page_views(subreddit);
