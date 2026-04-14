DROP INDEX IF EXISTS idx_tournaments_champion;
ALTER TABLE tournaments
  DROP COLUMN IF EXISTS champion_team_logo,
  DROP COLUMN IF EXISTS champion_team_name,
  DROP COLUMN IF EXISTS champion_team_id;
