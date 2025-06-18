CREATE TABLE IF NOT EXISTS hub_shipments (
  id SERIAL PRIMARY KEY,
  hub_id INTEGER REFERENCES printer_hubs(id) ON DELETE CASCADE,
  carrier TEXT,
  tracking_number TEXT,
  status TEXT,
  shipped_at TIMESTAMPTZ DEFAULT NOW()
);
