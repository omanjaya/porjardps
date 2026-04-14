DROP INDEX IF EXISTS idx_tournaments_event_id;
ALTER TABLE tournaments DROP COLUMN IF EXISTS event_id;
