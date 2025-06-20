CREATE TABLE IF NOT EXISTS designer_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  title TEXT,
  file_path TEXT NOT NULL,
  royalty_percent INTEGER NOT NULL DEFAULT 10,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TRIGGER designer_submissions_set_updated
BEFORE UPDATE ON designer_submissions
FOR EACH ROW EXECUTE PROCEDURE set_updated_at();
