ALTER TABLE community_creations

  ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES users(id);

