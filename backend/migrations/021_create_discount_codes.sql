CREATE TABLE IF NOT EXISTS discount_codes (
  id SERIAL PRIMARY KEY,
  code TEXT UNIQUE NOT NULL,
  amount_cents INTEGER NOT NULL,
  expires_at TIMESTAMPTZ,
  max_uses INTEGER DEFAULT 1,
  uses INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS discount_codes_code_idx ON discount_codes(code);

CREATE TRIGGER discount_codes_set_updated
BEFORE UPDATE ON discount_codes
FOR EACH ROW EXECUTE PROCEDURE set_updated_at();
