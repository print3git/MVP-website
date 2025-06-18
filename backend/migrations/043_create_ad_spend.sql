CREATE TABLE IF NOT EXISTS ad_spend (
  id SERIAL PRIMARY KEY,
  subreddit TEXT,
  date DATE,
  spend_cents INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS ad_spend_subreddit_idx ON ad_spend(subreddit);
CREATE UNIQUE INDEX IF NOT EXISTS ad_spend_subreddit_date_idx ON ad_spend(subreddit, date);

CREATE TRIGGER ad_spend_set_updated
BEFORE UPDATE ON ad_spend
FOR EACH ROW EXECUTE PROCEDURE set_updated_at();
