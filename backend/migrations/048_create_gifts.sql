CREATE TABLE IF NOT EXISTS gifts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id TEXT REFERENCES orders(session_id),
  sender_id UUID REFERENCES users(id),
  recipient_email TEXT,
  message TEXT,
  shipping_info JSONB,
  etch_name TEXT,
  claimed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
