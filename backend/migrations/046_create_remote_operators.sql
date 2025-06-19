CREATE TABLE IF NOT EXISTS remote_operators (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  training_completed BOOLEAN DEFAULT FALSE,
  approved BOOLEAN DEFAULT FALSE,
  hub_id INTEGER REFERENCES printer_hubs(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);
