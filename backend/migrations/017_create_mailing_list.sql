CREATE TABLE IF NOT EXISTS mailing_list (
  id SERIAL PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  token UUID NOT NULL,
  confirmed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS mailing_list_email_idx ON mailing_list(email);
