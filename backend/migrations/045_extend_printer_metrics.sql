ALTER TABLE printer_metrics
  ADD COLUMN IF NOT EXISTS utilization REAL,
  ADD COLUMN IF NOT EXISTS idle_seconds INTEGER,
  ADD COLUMN IF NOT EXISTS avg_completion_seconds INTEGER;
