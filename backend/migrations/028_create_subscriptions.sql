CREATE TABLE IF NOT EXISTS subscriptions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  status TEXT NOT NULL,
  current_period_start DATE,
  current_period_end DATE,
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id)
);

CREATE INDEX IF NOT EXISTS subscriptions_user_idx ON subscriptions(user_id);

CREATE TABLE IF NOT EXISTS subscription_credits (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  week_start DATE NOT NULL,
  total_credits INTEGER NOT NULL DEFAULT 0,
  used_credits INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, week_start)
);

CREATE INDEX IF NOT EXISTS subscription_credits_user_idx ON subscription_credits(user_id);
CREATE INDEX IF NOT EXISTS subscription_credits_week_idx ON subscription_credits(week_start);

CREATE TRIGGER subscriptions_set_updated
BEFORE UPDATE ON subscriptions
FOR EACH ROW EXECUTE PROCEDURE set_updated_at();

CREATE TRIGGER subscription_credits_set_updated
BEFORE UPDATE ON subscription_credits
FOR EACH ROW EXECUTE PROCEDURE set_updated_at();
