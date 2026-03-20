CREATE TABLE bracket_matches (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tournament_id       UUID REFERENCES tournaments(id) ON DELETE CASCADE,
    round               INT NOT NULL,
    match_number        INT NOT NULL,
    bracket_position    VARCHAR(20),
    team_a_id           UUID REFERENCES teams(id),
    team_b_id           UUID REFERENCES teams(id),
    winner_id           UUID REFERENCES teams(id),
    loser_id            UUID REFERENCES teams(id),
    score_a             INT DEFAULT 0,
    score_b             INT DEFAULT 0,
    status              VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'scheduled', 'live', 'completed', 'bye')),
    scheduled_at        TIMESTAMPTZ,
    started_at          TIMESTAMPTZ,
    completed_at        TIMESTAMPTZ,
    next_match_id       UUID REFERENCES bracket_matches(id),
    loser_next_match_id UUID REFERENCES bracket_matches(id),
    stream_url          TEXT,
    notes               TEXT,
    created_at          TIMESTAMPTZ DEFAULT NOW(),
    updated_at          TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_bracket_matches_tournament ON bracket_matches(tournament_id);
CREATE INDEX idx_bracket_matches_status ON bracket_matches(status);
CREATE INDEX idx_bracket_matches_scheduled ON bracket_matches(scheduled_at);
