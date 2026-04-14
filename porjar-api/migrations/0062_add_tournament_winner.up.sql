ALTER TABLE tournaments
  ADD COLUMN champion_team_id UUID REFERENCES teams(id) ON DELETE SET NULL,
  ADD COLUMN champion_team_name VARCHAR(255),
  ADD COLUMN champion_team_logo VARCHAR(500);

CREATE INDEX idx_tournaments_champion ON tournaments(champion_team_id) WHERE champion_team_id IS NOT NULL;
