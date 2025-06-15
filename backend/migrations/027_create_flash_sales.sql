CREATE TABLE IF NOT EXISTS flash_sales (
  id SERIAL PRIMARY KEY,
  discount_percent INTEGER NOT NULL,
  product_type TEXT NOT NULL,
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ NOT NULL,
  active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS flash_sales_active_idx ON flash_sales(active);
CREATE INDEX IF NOT EXISTS flash_sales_time_idx ON flash_sales(start_time, end_time);

CREATE TRIGGER flash_sales_set_updated
BEFORE UPDATE ON flash_sales
FOR EACH ROW EXECUTE PROCEDURE set_updated_at();
