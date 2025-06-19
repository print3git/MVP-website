CREATE TABLE IF NOT EXISTS hub_inventory (
  id SERIAL PRIMARY KEY,
  hub_id INTEGER REFERENCES printer_hubs(id) ON DELETE CASCADE,
  material TEXT NOT NULL,
  quantity INTEGER DEFAULT 0,
  threshold INTEGER DEFAULT 0,
  UNIQUE(hub_id, material)
);
