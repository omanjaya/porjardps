CREATE TABLE teams (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name            VARCHAR(255) NOT NULL,
    school_id       UUID REFERENCES schools(id),
    game_id         UUID REFERENCES games(id) NOT NULL,
    captain_user_id UUID REFERENCES users(id),
    logo_url        TEXT,
    status          VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'eliminated', 'active')),
    seed            INT,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(name, game_id)
);

CREATE INDEX idx_teams_game ON teams(game_id);
CREATE INDEX idx_teams_school ON teams(school_id);
CREATE INDEX idx_teams_status ON teams(status);
