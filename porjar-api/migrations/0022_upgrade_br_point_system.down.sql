-- Drop penalties table
DROP INDEX IF EXISTS idx_br_penalties_tournament;
DROP TABLE IF EXISTS br_penalties;

-- Remove columns from br_lobby_results
ALTER TABLE br_lobby_results DROP COLUMN IF EXISTS survival_bonus;
ALTER TABLE br_lobby_results DROP COLUMN IF EXISTS damage_dealt;
ALTER TABLE br_lobby_results DROP COLUMN IF EXISTS penalty_reason;
ALTER TABLE br_lobby_results DROP COLUMN IF EXISTS penalty_points;
ALTER TABLE br_lobby_results DROP COLUMN IF EXISTS status;

-- Drop player results table
DROP INDEX IF EXISTS idx_br_player_results_lobby;
DROP INDEX IF EXISTS idx_br_player_results_user;
DROP TABLE IF EXISTS br_player_results;

-- Remove columns from tournaments
ALTER TABLE tournaments DROP COLUMN IF EXISTS max_lobby_teams;
ALTER TABLE tournaments DROP COLUMN IF EXISTS qualification_threshold;
ALTER TABLE tournaments DROP COLUMN IF EXISTS wwcd_bonus;
ALTER TABLE tournaments DROP COLUMN IF EXISTS kill_point_value;
