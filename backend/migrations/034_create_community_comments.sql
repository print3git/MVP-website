CREATE TABLE IF NOT EXISTS community_comments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  model_id UUID REFERENCES community_creations(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  text TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS community_comments_model_idx ON community_comments(model_id);

CREATE TRIGGER community_comments_set_updated
BEFORE UPDATE ON community_comments
FOR EACH ROW EXECUTE PROCEDURE set_updated_at();
