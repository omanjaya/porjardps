-- Revert FK CASCADE changes back to default (no ON DELETE clause)

ALTER TABLE tournament_teams DROP CONSTRAINT IF EXISTS tournament_teams_team_id_fkey;
ALTER TABLE tournament_teams ADD CONSTRAINT tournament_teams_team_id_fkey
  FOREIGN KEY (team_id) REFERENCES teams(id);

ALTER TABLE standings DROP CONSTRAINT IF EXISTS standings_team_id_fkey;
ALTER TABLE standings ADD CONSTRAINT standings_team_id_fkey
  FOREIGN KEY (team_id) REFERENCES teams(id);

ALTER TABLE br_lobby_results DROP CONSTRAINT IF EXISTS br_lobby_results_team_id_fkey;
ALTER TABLE br_lobby_results ADD CONSTRAINT br_lobby_results_team_id_fkey
  FOREIGN KEY (team_id) REFERENCES teams(id);

ALTER TABLE br_daily_standings DROP CONSTRAINT IF EXISTS br_daily_standings_team_id_fkey;
ALTER TABLE br_daily_standings ADD CONSTRAINT br_daily_standings_team_id_fkey
  FOREIGN KEY (team_id) REFERENCES teams(id);

ALTER TABLE group_standings DROP CONSTRAINT IF EXISTS group_standings_team_id_fkey;
ALTER TABLE group_standings ADD CONSTRAINT group_standings_team_id_fkey
  FOREIGN KEY (team_id) REFERENCES teams(id);

ALTER TABLE match_cards DROP CONSTRAINT IF EXISTS match_cards_team_id_fkey;
ALTER TABLE match_cards ADD CONSTRAINT match_cards_team_id_fkey
  FOREIGN KEY (team_id) REFERENCES teams(id);

-- Drop CHECK constraints
ALTER TABLE tournament_teams DROP CONSTRAINT IF EXISTS tournament_teams_status_check;
ALTER TABLE schedules DROP CONSTRAINT IF EXISTS schedules_status_check;

-- Drop indexes
DROP INDEX IF EXISTS idx_br_lobby_results_team;
DROP INDEX IF EXISTS idx_br_daily_standings_team;
DROP INDEX IF EXISTS idx_group_standings_team;
DROP INDEX IF EXISTS idx_match_cards_bracket_match;
DROP INDEX IF EXISTS idx_match_cards_br_lobby;
DROP INDEX IF EXISTS idx_match_cards_group_match;
DROP INDEX IF EXISTS idx_tournament_teams_status;
