CREATE TABLE IF NOT EXISTS shares (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  job_id UUID REFERENCES jobs(job_id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  slug TEXT UNIQUE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS shares_slug_idx ON shares(slug);

CREATE TRIGGER shares_set_updated
BEFORE UPDATE ON shares
FOR EACH ROW EXECUTE PROCEDURE set_updated_at();
