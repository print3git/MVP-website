CREATE TABLE IF NOT EXISTS social_shares (
  id SERIAL PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  order_id TEXT REFERENCES orders(session_id) ON DELETE CASCADE,
  post_url TEXT NOT NULL,
  verified BOOLEAN DEFAULT FALSE,
  discount_code TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS social_shares_user_idx ON social_shares(user_id);

CREATE TRIGGER social_shares_set_updated
BEFORE UPDATE ON social_shares
FOR EACH ROW EXECUTE PROCEDURE set_updated_at();
