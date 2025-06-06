CREATE TABLE jobs (
  job_id   UUID PRIMARY KEY,
  prompt   TEXT,
  image_ref TEXT,
  status   TEXT,
  model_url TEXT,
  snapshot TEXT,
  error    TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE TABLE orders (
  session_id TEXT PRIMARY KEY,
  job_id     UUID REFERENCES jobs(job_id),
  price_cents INTEGER,
  status     TEXT,
  shipping_info JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
