-- Add kill point value and WWCD bonus to tournaments
ALTER TABLE tournaments ADD COLUMN kill_point_value DECIMAL(3,1) DEFAULT 1.0;
ALTER TABLE tournaments ADD COLUMN wwcd_bonus INT DEFAULT 0;
ALTER TABLE tournaments ADD COLUMN qualification_threshold INT;
ALTER TABLE tournaments ADD COLUMN max_lobby_teams INT;

-- Add per-player kill tracking
CREATE TABLE br_player_results (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lobby_result_id UUID REFERENCES br_lobby_results(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id),
    kills INT DEFAULT 0,
    damage INT DEFAULT 0,
    is_mvp BOOLEAN DEFAULT false,
    survival_time_seconds INT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_br_player_results_user ON br_player_results(user_id);
CREATE INDEX idx_br_player_results_lobby ON br_player_results(lobby_result_id);

-- Add DNF/DNS status and penalties
ALTER TABLE br_lobby_results ADD COLUMN status VARCHAR(20) DEFAULT 'normal' CHECK (status IN ('normal', 'dnf', 'dns', 'disqualified'));
ALTER TABLE br_lobby_results ADD COLUMN penalty_points INT DEFAULT 0;
ALTER TABLE br_lobby_results ADD COLUMN penalty_reason TEXT;
ALTER TABLE br_lobby_results ADD COLUMN damage_dealt INT DEFAULT 0;
ALTER TABLE br_lobby_results ADD COLUMN survival_bonus INT DEFAULT 0;

-- Create penalties table
CREATE TABLE br_penalties (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tournament_id UUID REFERENCES tournaments(id) ON DELETE CASCADE,
    team_id UUID REFERENCES teams(id),
    lobby_id UUID REFERENCES br_lobbies(id),
    type VARCHAR(30) NOT NULL CHECK (type IN ('late_join', 'disconnect', 'behavior', 'custom')),
    points INT NOT NULL,
    reason TEXT,
    applied_by UUID REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_br_penalties_tournament ON br_penalties(tournament_id, team_id);
