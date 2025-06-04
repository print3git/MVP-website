CREATE TABLE IF NOT EXISTS community_creations (
  id SERIAL PRIMARY KEY,
  model_url TEXT NOT NULL,
  category TEXT,
  likes INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
