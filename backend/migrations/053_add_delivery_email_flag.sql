ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS delivery_email_sent BOOLEAN DEFAULT FALSE;
