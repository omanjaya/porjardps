CREATE TABLE standings (
    id                     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tournament_id          UUID REFERENCES tournaments(id) ON DELETE CASCADE,
    team_id                UUID REFERENCES teams(id),
    group_name             VARCHAR(10),
    matches_played         INT DEFAULT 0,
    wins                   INT DEFAULT 0,
    losses                 INT DEFAULT 0,
    draws                  INT DEFAULT 0,
    rounds_won             INT DEFAULT 0,
    rounds_lost            INT DEFAULT 0,
    total_points           INT DEFAULT 0,
    total_kills            INT DEFAULT 0,
    total_placement_points INT DEFAULT 0,
    best_placement         INT,
    avg_placement          DECIMAL(5,2),
    rank_position          INT,
    is_eliminated          BOOLEAN DEFAULT false,
    updated_at             TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(tournament_id, team_id)
);

CREATE INDEX idx_standings_tournament ON standings(tournament_id);
CREATE INDEX idx_standings_rank ON standings(tournament_id, rank_position);
