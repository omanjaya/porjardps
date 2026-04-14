-- Create default PORJAR 2026 event from existing event_settings
INSERT INTO events (slug, name, short_name, description, logo_url, banner_url, venue, city, organizer, start_date, end_date, contact_phone, contact_email, instagram_url, announcement, announcement_active, registration_open, rules_published, status, primary_color)
SELECT 'porjar-2026', event_name, 'PORJAR', event_description, event_logo_url, event_banner_url, venue, city, organizer, start_date::timestamptz, end_date::timestamptz, contact_phone, contact_email, instagram_url, announcement, COALESCE(announcement_active, false), COALESCE(registration_open, true), COALESCE(rules_published, true), 'ongoing', '#C41E2A'
FROM event_settings LIMIT 1;

-- If no event_settings row, create a default
INSERT INTO events (slug, name, short_name, venue, city, organizer, status, primary_color)
SELECT 'porjar-2026', 'PORJAR Esport Kota Denpasar 2026', 'PORJAR', 'Graha Yowana Suci', 'Denpasar, Bali', 'ESI Kota Denpasar', 'ongoing', '#C41E2A'
WHERE NOT EXISTS (SELECT 1 FROM events WHERE slug = 'porjar-2026');

-- Link all existing tournaments to this event
UPDATE tournaments SET event_id = (SELECT id FROM events WHERE slug = 'porjar-2026') WHERE event_id IS NULL;

-- Make event_id NOT NULL
ALTER TABLE tournaments ALTER COLUMN event_id SET NOT NULL;
