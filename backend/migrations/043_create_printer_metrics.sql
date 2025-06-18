CREATE TABLE IF NOT EXISTS printer_metrics (
  id SERIAL PRIMARY KEY,
  printer_id INTEGER REFERENCES printers(id) ON DELETE CASCADE,
  status TEXT,
  queue_length INTEGER,
  error TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS printer_metrics_printer_idx ON printer_metrics(printer_id);
