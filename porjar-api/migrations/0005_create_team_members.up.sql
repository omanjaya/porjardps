CREATE TABLE team_members (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    team_id       UUID REFERENCES teams(id) ON DELETE CASCADE,
    user_id       UUID REFERENCES users(id),
    in_game_name  VARCHAR(255) NOT NULL,
    in_game_id    VARCHAR(255),
    role          VARCHAR(20) DEFAULT 'member' CHECK (role IN ('captain', 'member', 'substitute')),
    jersey_number INT,
    joined_at     TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(team_id, user_id)
);

CREATE INDEX idx_team_members_user ON team_members(user_id);
