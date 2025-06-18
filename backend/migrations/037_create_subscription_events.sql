CREATE TABLE IF NOT EXISTS subscription_events (

  id SERIAL PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  event TEXT NOT NULL CHECK (event IN ('join','cancel')),
  variant TEXT,
  price_cents INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS subscription_events_user_idx ON subscription_events(user_id);

CREATE TRIGGER subscription_events_set_updated
BEFORE UPDATE ON subscription_events
FOR EACH ROW EXECUTE PROCEDURE set_updated_at();

