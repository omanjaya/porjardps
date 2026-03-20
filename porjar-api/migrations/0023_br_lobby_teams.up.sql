-- Track which teams are assigned to which lobby
CREATE TABLE br_lobby_teams (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lobby_id UUID REFERENCES br_lobbies(id) ON DELETE CASCADE,
    team_id UUID REFERENCES teams(id),
    UNIQUE(lobby_id, team_id)
);
CREATE INDEX idx_br_lobby_teams_lobby ON br_lobby_teams(lobby_id);
CREATE INDEX idx_br_lobby_teams_team ON br_lobby_teams(team_id);

-- Daily standings snapshot
CREATE TABLE br_daily_standings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tournament_id UUID REFERENCES tournaments(id) ON DELETE CASCADE,
    team_id UUID REFERENCES teams(id),
    day_number INT NOT NULL,
    total_points INT DEFAULT 0,
    total_kills INT DEFAULT 0,
    rank_position INT,
    is_qualified BOOLEAN DEFAULT false,
    UNIQUE(tournament_id, team_id, day_number)
);
CREATE INDEX idx_br_daily_standings ON br_daily_standings(tournament_id, day_number, rank_position);
