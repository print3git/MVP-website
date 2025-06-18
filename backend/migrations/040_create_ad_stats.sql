CREATE TABLE IF NOT EXISTS ad_stats (
  id SERIAL PRIMARY KEY,
  date DATE NOT NULL,
  subreddit TEXT,
  impressions INTEGER,
  spend_cents INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS ad_stats_date_subreddit_idx ON ad_stats(date, subreddit);

CREATE TRIGGER ad_stats_set_updated
BEFORE UPDATE ON ad_stats
FOR EACH ROW EXECUTE PROCEDURE set_updated_at();
