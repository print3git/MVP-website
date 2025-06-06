CREATE TABLE IF NOT EXISTS print_jobs (
  id SERIAL PRIMARY KEY,
  job_id UUID REFERENCES jobs(job_id) ON DELETE CASCADE,
  order_id TEXT REFERENCES orders(session_id) ON DELETE CASCADE,
  status TEXT DEFAULT 'pending',
  shipping_info JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS print_jobs_status_idx ON print_jobs(status);
