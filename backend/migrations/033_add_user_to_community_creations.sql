ALTER TABLE community_creations
  ADD COLUMN user_id UUID REFERENCES users(id);
