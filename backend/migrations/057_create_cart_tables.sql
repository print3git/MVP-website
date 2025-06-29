CREATE TABLE cart_items (
  id SERIAL PRIMARY KEY,
  user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
  job_id UUID REFERENCES print_jobs(job_id) ON DELETE CASCADE,
  quantity INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE TRIGGER cart_items_set_updated BEFORE UPDATE ON cart_items
  FOR EACH ROW EXECUTE PROCEDURE set_updated_at();

CREATE TABLE order_items (
  id SERIAL PRIMARY KEY,
  order_id TEXT REFERENCES orders(session_id) ON DELETE CASCADE,
  job_id UUID REFERENCES print_jobs(job_id) ON DELETE SET NULL,
  quantity INTEGER NOT NULL DEFAULT 1
);
