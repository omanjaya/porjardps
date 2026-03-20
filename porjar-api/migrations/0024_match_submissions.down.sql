DROP TABLE IF EXISTS coach_schools;
DROP TABLE IF EXISTS match_submissions;

ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;
ALTER TABLE users ADD CONSTRAINT users_role_check CHECK (role IN ('player', 'admin', 'superadmin'));
