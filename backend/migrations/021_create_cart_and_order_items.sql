CREATE TABLE IF NOT EXISTS cart_items (
  id SERIAL PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  job_id UUID REFERENCES jobs(job_id) ON DELETE CASCADE,
  quantity INTEGER DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE TRIGGER cart_items_set_updated BEFORE UPDATE ON cart_items
FOR EACH ROW EXECUTE PROCEDURE set_updated_at();

CREATE TABLE IF NOT EXISTS order_items (
  id SERIAL PRIMARY KEY,
  order_id TEXT REFERENCES orders(session_id) ON DELETE CASCADE,
  job_id UUID REFERENCES jobs(job_id) ON DELETE CASCADE,
  quantity INTEGER DEFAULT 1
);
CREATE INDEX IF NOT EXISTS order_items_order_idx ON order_items(order_id);
