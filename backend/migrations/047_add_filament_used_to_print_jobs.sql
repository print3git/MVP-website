ALTER TABLE print_jobs
  ADD COLUMN IF NOT EXISTS filament_used_g INTEGER;
