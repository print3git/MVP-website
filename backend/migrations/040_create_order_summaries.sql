CREATE TABLE IF NOT EXISTS order_summaries (
  day DATE NOT NULL,
  location TEXT NOT NULL,
  order_count INTEGER NOT NULL,
  printer_hours INTEGER NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (day, location)
);
