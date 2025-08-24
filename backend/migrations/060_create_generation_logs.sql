CREATE TABLE IF NOT EXISTS generation_logs (
  id SERIAL PRIMARY KEY,
  prompt TEXT NOT NULL,
  source TEXT NOT NULL,
  start_time TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  finish_time TIMESTAMPTZ,
  cost_cents INTEGER DEFAULT 0
);
