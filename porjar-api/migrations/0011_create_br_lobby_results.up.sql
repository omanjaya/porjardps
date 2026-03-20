CREATE TABLE br_lobby_results (
    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lobby_id         UUID REFERENCES br_lobbies(id) ON DELETE CASCADE,
    team_id          UUID REFERENCES teams(id),
    placement        INT NOT NULL,
    kills            INT DEFAULT 0,
    placement_points INT DEFAULT 0,
    kill_points      INT DEFAULT 0,
    total_points     INT DEFAULT 0,
    created_at       TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(lobby_id, team_id)
);

CREATE INDEX idx_br_lobby_results_team ON br_lobby_results(team_id);
CREATE INDEX idx_br_lobby_results_lobby ON br_lobby_results(lobby_id);
