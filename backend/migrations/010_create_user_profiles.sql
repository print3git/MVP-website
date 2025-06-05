CREATE TABLE IF NOT EXISTS user_profiles (
  user_id UUID PRIMARY KEY REFERENCES users(id),
  display_name TEXT,
  avatar_url TEXT,
  shipping_info JSONB,
  payment_info JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TRIGGER user_profiles_set_updated
BEFORE UPDATE ON user_profiles
FOR EACH ROW EXECUTE PROCEDURE set_updated_at();
