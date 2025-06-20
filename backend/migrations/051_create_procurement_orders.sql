CREATE TABLE IF NOT EXISTS procurement_orders (
  id SERIAL PRIMARY KEY,
  hub_id INTEGER REFERENCES printer_hubs(id) ON DELETE CASCADE,
  vendor TEXT,
  model TEXT,
  quantity INTEGER,
  status TEXT DEFAULT 'sent',
  ack_date DATE,
  est_arrival_date DATE,
  flagged_overdue BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
