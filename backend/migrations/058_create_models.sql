CREATE TABLE IF NOT EXISTS models (
  id SERIAL PRIMARY KEY,
  original_filename TEXT NOT NULL,
  s3_key TEXT NOT NULL,
  uploaded_at TIMESTAMPTZ DEFAULT NOW()
);
