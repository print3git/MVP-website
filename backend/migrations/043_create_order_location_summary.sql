CREATE TABLE IF NOT EXISTS order_location_summary (
  id SERIAL PRIMARY KEY,
  summary_date DATE NOT NULL,
  state TEXT,
  order_count INTEGER DEFAULT 0,
  estimated_hours NUMERIC DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(summary_date, state)
);

CREATE INDEX IF NOT EXISTS order_location_summary_date_idx ON order_location_summary(summary_date);

CREATE TRIGGER order_location_summary_set_updated
BEFORE UPDATE ON order_location_summary
FOR EACH ROW EXECUTE PROCEDURE set_updated_at();
