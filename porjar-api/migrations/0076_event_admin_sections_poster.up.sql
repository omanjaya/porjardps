-- event_admins: junction table for per-event admin assignment
CREATE TABLE event_admins (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id    UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  assigned_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(event_id, user_id)
);
CREATE INDEX idx_event_admins_user_id ON event_admins(user_id);
CREATE INDEX idx_event_admins_event_id ON event_admins(event_id);

-- event_sections: per-event page builder sections
CREATE TABLE event_sections (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id     UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  section_type VARCHAR(50) NOT NULL,
  sort_order   INT NOT NULL DEFAULT 0,
  enabled      BOOLEAN NOT NULL DEFAULT true,
  config       JSONB NOT NULL DEFAULT '{}',
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_event_sections_event_id ON event_sections(event_id, sort_order);

-- Add poster_url to events
ALTER TABLE events ADD COLUMN IF NOT EXISTS poster_url TEXT;
