CREATE TABLE event_announcements (
  id BIGSERIAL PRIMARY KEY,
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  priority VARCHAR(20) NOT NULL DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ
);
CREATE INDEX idx_event_announcements_event ON event_announcements(event_id, created_at DESC);

INSERT INTO event_announcements (event_id, title, message, priority)
SELECT id, 'Selamat Datang!', 'Turnamen ESI Denpasar 2026 resmi dimulai. Cek jadwal pertandingan di menu Jadwal.', 'normal'
FROM events WHERE slug = 'porjar-2026'
ON CONFLICT DO NOTHING;
