ALTER TABLE group_standings DROP COLUMN IF EXISTS penalty_points;
ALTER TABLE standings DROP COLUMN IF EXISTS penalty_points;
DROP INDEX IF EXISTS idx_match_cards_issued_by;
DROP TABLE IF EXISTS match_cards;
DROP TABLE IF EXISTS referee_assignments;
DROP TABLE IF EXISTS game_penalty_configs;
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;
ALTER TABLE users ADD CONSTRAINT users_role_check CHECK (role IN ('player', 'coach', 'admin', 'superadmin'));
