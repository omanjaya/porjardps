-- Group stage tables for round-robin tournament format (eFootball)

CREATE TABLE IF NOT EXISTS tournament_groups (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tournament_id UUID NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
    name VARCHAR(50) NOT NULL,
    group_order INT NOT NULL DEFAULT 1,
    advance_count INT NOT NULL DEFAULT 2,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_tournament_groups_tournament ON tournament_groups(tournament_id);

CREATE TABLE IF NOT EXISTS group_teams (
    group_id UUID NOT NULL REFERENCES tournament_groups(id) ON DELETE CASCADE,
    team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
    PRIMARY KEY (group_id, team_id)
);

CREATE TABLE IF NOT EXISTS group_matches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    group_id UUID NOT NULL REFERENCES tournament_groups(id) ON DELETE CASCADE,
    round INT NOT NULL,
    match_number INT NOT NULL,
    team_a_id UUID REFERENCES teams(id),
    team_b_id UUID REFERENCES teams(id),
    score_a INT NOT NULL DEFAULT 0,
    score_b INT NOT NULL DEFAULT 0,
    status VARCHAR(20) NOT NULL DEFAULT 'pending',
    scheduled_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_group_matches_group ON group_matches(group_id);

CREATE TABLE IF NOT EXISTS group_standings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    group_id UUID NOT NULL REFERENCES tournament_groups(id) ON DELETE CASCADE,
    team_id UUID NOT NULL REFERENCES teams(id),
    matches_played INT NOT NULL DEFAULT 0,
    wins INT NOT NULL DEFAULT 0,
    draws INT NOT NULL DEFAULT 0,
    losses INT NOT NULL DEFAULT 0,
    goals_for INT NOT NULL DEFAULT 0,
    goals_against INT NOT NULL DEFAULT 0,
    goal_difference INT NOT NULL DEFAULT 0,
    points INT NOT NULL DEFAULT 0,
    rank_position INT NOT NULL DEFAULT 0,
    UNIQUE(group_id, team_id)
);

CREATE INDEX idx_group_standings_group ON group_standings(group_id);
