ALTER TABLE tournaments ALTER COLUMN event_id DROP NOT NULL;
UPDATE tournaments SET event_id = NULL;
DELETE FROM events WHERE slug = 'porjar-2026';
