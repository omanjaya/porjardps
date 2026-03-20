CREATE TABLE tournament_teams (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tournament_id UUID REFERENCES tournaments(id) ON DELETE CASCADE,
    team_id       UUID REFERENCES teams(id),
    group_name    VARCHAR(10),
    seed          INT,
    status        VARCHAR(20) DEFAULT 'active',
    UNIQUE(tournament_id, team_id)
);

CREATE INDEX idx_tournament_teams_tournament ON tournament_teams(tournament_id);
CREATE INDEX idx_tournament_teams_team ON tournament_teams(team_id);
