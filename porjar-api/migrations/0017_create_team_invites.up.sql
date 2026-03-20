CREATE TABLE team_invites (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    team_id UUID REFERENCES teams(id) ON DELETE CASCADE,
    invite_code VARCHAR(20) UNIQUE NOT NULL,
    created_by UUID REFERENCES users(id),
    max_uses INT DEFAULT 1,
    used_count INT DEFAULT 0,
    expires_at TIMESTAMPTZ NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_team_invites_code ON team_invites(invite_code);
CREATE INDEX idx_team_invites_team ON team_invites(team_id);
