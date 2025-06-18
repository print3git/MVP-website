CREATE TABLE IF NOT EXISTS competition_votes (
  competition_id UUID REFERENCES competitions(id) ON DELETE CASCADE,
  model_id UUID REFERENCES jobs(job_id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  PRIMARY KEY (competition_id, model_id, user_id)
);
