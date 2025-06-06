CREATE TABLE IF NOT EXISTS competition_comments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  competition_id UUID REFERENCES competitions(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  text TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TRIGGER competition_comments_set_updated
BEFORE UPDATE ON competition_comments
FOR EACH ROW EXECUTE PROCEDURE set_updated_at();
