CREATE TABLE IF NOT EXISTS spaces (
  id SERIAL PRIMARY KEY,
  region TEXT,
  cost_cents INTEGER,
  address TEXT
);

CREATE TABLE IF NOT EXISTS leases (
  id SERIAL PRIMARY KEY,
  space_id INTEGER REFERENCES spaces(id) ON DELETE CASCADE,
  occupant TEXT,
  start_date DATE,
  end_date DATE,
  founder_email TEXT
);

CREATE TABLE IF NOT EXISTS expansions (
  id SERIAL PRIMARY KEY,
  region TEXT,
  target_date DATE,
  searched BOOLEAN DEFAULT FALSE
);
