ALTER TABLE jobs
  ADD COLUMN IF NOT EXISTS reminder_sent BOOLEAN DEFAULT FALSE;
