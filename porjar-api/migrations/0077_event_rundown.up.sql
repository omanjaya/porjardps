-- Event rundown: ordered agenda items [{time,title,description}] shown on the
-- public event /rundown page. Mirrors rules_content (JSONB array).
ALTER TABLE events ADD COLUMN IF NOT EXISTS rundown JSONB NOT NULL DEFAULT '[]'::jsonb;
