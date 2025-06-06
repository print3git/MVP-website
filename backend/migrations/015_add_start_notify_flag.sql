ALTER TABLE competitions
  ADD COLUMN IF NOT EXISTS start_notification_sent BOOLEAN DEFAULT FALSE;
