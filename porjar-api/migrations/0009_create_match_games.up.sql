CREATE TABLE match_games (
    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    bracket_match_id UUID REFERENCES bracket_matches(id) ON DELETE CASCADE,
    game_number      INT NOT NULL,
    winner_id        UUID REFERENCES teams(id),
    score_a          INT DEFAULT 0,
    score_b          INT DEFAULT 0,
    duration_minutes INT,
    mvp_user_id      UUID REFERENCES users(id),
    map_name         VARCHAR(100),
    hero_bans        JSONB,
    notes            TEXT,
    created_at       TIMESTAMPTZ DEFAULT NOW()
);
