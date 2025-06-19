CREATE TABLE IF NOT EXISTS hub_saturation_summary (
  id SERIAL PRIMARY KEY,
  summary_date DATE NOT NULL,
  hub_id INTEGER REFERENCES printer_hubs(id) ON DELETE CASCADE,
  avg_queue_saturation REAL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(summary_date, hub_id)
);

CREATE INDEX IF NOT EXISTS hub_saturation_summary_date_idx ON hub_saturation_summary(summary_date);

CREATE TRIGGER hub_saturation_summary_set_updated
BEFORE UPDATE ON hub_saturation_summary
FOR EACH ROW EXECUTE PROCEDURE set_updated_at();
