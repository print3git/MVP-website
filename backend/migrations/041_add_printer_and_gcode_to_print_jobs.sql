ALTER TABLE print_jobs
  ADD COLUMN IF NOT EXISTS printer_id INTEGER REFERENCES printers(id),
  ADD COLUMN IF NOT EXISTS gcode_path TEXT;
CREATE INDEX IF NOT EXISTS print_jobs_printer_idx ON print_jobs(printer_id);
