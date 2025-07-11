CREATE TABLE IF NOT EXISTS generation_logs (
  id SERIAL PRIMARY KEY,
  prompt TEXT,
  source TEXT,
  cost_cents INTEGER DEFAULT 0,
  started_at TIMESTAMPTZ DEFAULT NOW(),
  finished_at TIMESTAMPTZ
);
