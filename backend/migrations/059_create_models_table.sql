CREATE TABLE IF NOT EXISTS models (
  id SERIAL PRIMARY KEY,
  key TEXT NOT NULL,
  original_name TEXT,
  uploaded_at TIMESTAMP DEFAULT NOW()
);
