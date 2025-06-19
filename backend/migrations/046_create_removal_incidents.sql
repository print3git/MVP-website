CREATE TABLE IF NOT EXISTS removal_incidents (
  id SERIAL PRIMARY KEY,
  printer_id INTEGER REFERENCES printers(id) ON DELETE CASCADE,
  print_job_id INTEGER REFERENCES print_jobs(id) ON DELETE SET NULL,
  error TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS removal_incidents_printer_idx ON removal_incidents(printer_id);
