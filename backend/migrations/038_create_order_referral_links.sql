CREATE TABLE IF NOT EXISTS order_referral_links (
  order_id TEXT PRIMARY KEY REFERENCES orders(session_id) ON DELETE CASCADE,
  code TEXT UNIQUE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS order_referral_links_code_idx ON order_referral_links(code);

CREATE TRIGGER order_referral_links_set_updated
BEFORE UPDATE ON order_referral_links
FOR EACH ROW EXECUTE PROCEDURE set_updated_at();
