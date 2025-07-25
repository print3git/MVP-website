CREATE TABLE IF NOT EXISTS reward_points (
  user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  points INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TRIGGER reward_points_set_updated
BEFORE UPDATE ON reward_points
FOR EACH ROW EXECUTE PROCEDURE set_updated_at();
