CREATE TABLE IF NOT EXISTS referral_events (
  id SERIAL PRIMARY KEY,
  referrer_id UUID REFERENCES users(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('click','signup')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS referral_events_referrer_idx ON referral_events(referrer_id);

CREATE TRIGGER referral_events_set_updated
BEFORE UPDATE ON referral_events
FOR EACH ROW EXECUTE PROCEDURE set_updated_at();
