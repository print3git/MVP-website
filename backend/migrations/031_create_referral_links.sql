CREATE TABLE IF NOT EXISTS referral_links (
  user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  code TEXT UNIQUE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS referral_links_code_idx ON referral_links(code);

CREATE TRIGGER referral_links_set_updated
BEFORE UPDATE ON referral_links
FOR EACH ROW EXECUTE PROCEDURE set_updated_at();
