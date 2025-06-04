CREATE TABLE IF NOT EXISTS likes (
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  model_id UUID REFERENCES jobs(job_id) ON DELETE CASCADE,
  PRIMARY KEY (user_id, model_id)
);
