CREATE TABLE IF NOT EXISTS referred_orders (
  id SERIAL PRIMARY KEY,
  order_id TEXT REFERENCES orders(session_id) ON DELETE CASCADE,
  referrer_id UUID REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS referred_orders_referrer_idx ON referred_orders(referrer_id);
CREATE INDEX IF NOT EXISTS referred_orders_order_idx ON referred_orders(order_id);

CREATE TRIGGER referred_orders_set_updated
BEFORE UPDATE ON referred_orders
FOR EACH ROW EXECUTE PROCEDURE set_updated_at();
