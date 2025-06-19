CREATE TABLE IF NOT EXISTS order_streaks (
  user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  last_week_start DATE NOT NULL,
  streak INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TRIGGER order_streaks_set_updated
BEFORE UPDATE ON order_streaks
FOR EACH ROW EXECUTE PROCEDURE set_updated_at();
