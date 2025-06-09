INSERT INTO discount_codes(code, amount_cents, expires_at, max_uses)
VALUES('REDDIT5', 100, NULL, NULL)
ON CONFLICT (code) DO NOTHING;
