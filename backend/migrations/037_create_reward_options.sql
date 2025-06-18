CREATE TABLE IF NOT EXISTS reward_options (
  points INTEGER PRIMARY KEY,
  amount_cents INTEGER NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO reward_options(points, amount_cents)
VALUES (100, 500), (200, 1000)
ON CONFLICT (points) DO NOTHING;

CREATE TRIGGER reward_options_set_updated
BEFORE UPDATE ON reward_options
FOR EACH ROW EXECUTE PROCEDURE set_updated_at();
