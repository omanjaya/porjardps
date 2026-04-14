CREATE TABLE badges (
    id BIGSERIAL PRIMARY KEY,
    slug VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(100) NOT NULL,
    description TEXT NOT NULL,
    icon VARCHAR(50) NOT NULL DEFAULT 'trophy',
    color VARCHAR(7) NOT NULL DEFAULT '#C41E2A',
    category VARCHAR(30) NOT NULL DEFAULT 'general',
    sort_order INT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE user_badges (
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    badge_id BIGINT NOT NULL REFERENCES badges(id) ON DELETE CASCADE,
    earned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (user_id, badge_id)
);
CREATE INDEX idx_user_badges_user ON user_badges(user_id);

-- Seed badges
INSERT INTO badges (slug, name, description, icon, color, category, sort_order) VALUES
('first-login', 'Pemula', 'Login pertama kali ke platform', 'user-circle', '#3b82f6', 'account', 1),
('profile-complete', 'Profil Lengkap', 'Melengkapi semua data profil', 'identification-badge', '#10b981', 'account', 2),
('first-team', 'Kapten', 'Membuat tim pertama', 'users-three', '#8b5cf6', 'team', 3),
('first-event', 'Pendaftar', 'Registrasi tim ke event pertama', 'ticket', '#f59e0b', 'event', 4),
('first-match', 'Petarung', 'Bermain match pertama', 'sword', '#ef4444', 'match', 5),
('first-win', 'Pemenang', 'Memenangkan match pertama', 'trophy', '#C41E2A', 'match', 6),
('champion', 'Juara', 'Menjuarai turnamen', 'crown', '#eab308', 'tournament', 7),
('five-wins', 'Streak', '5 kemenangan beruntun', 'lightning', '#f97316', 'match', 8),
('sportsmanship', 'Sportif', 'Tidak pernah dapat kartu kuning/merah', 'handshake', '#22c55e', 'conduct', 9),
('early-bird', 'Rajin', 'Check-in 15 menit sebelum match', 'alarm', '#06b6d4', 'attendance', 10)
ON CONFLICT (slug) DO NOTHING;
