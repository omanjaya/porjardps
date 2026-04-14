-- Revert migration 0070: restore FK constraints without ON DELETE clause (default RESTRICT)

ALTER TABLE team_members DROP CONSTRAINT IF EXISTS team_members_user_id_fkey;
ALTER TABLE team_members ADD CONSTRAINT team_members_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES users(id);

ALTER TABLE team_members DROP CONSTRAINT IF EXISTS team_members_team_id_fkey;
ALTER TABLE team_members ADD CONSTRAINT team_members_team_id_fkey
  FOREIGN KEY (team_id) REFERENCES teams(id);

ALTER TABLE match_submissions DROP CONSTRAINT IF EXISTS match_submissions_team_id_fkey;
ALTER TABLE match_submissions ADD CONSTRAINT match_submissions_team_id_fkey
  FOREIGN KEY (team_id) REFERENCES teams(id);

ALTER TABLE bracket_matches DROP CONSTRAINT IF EXISTS bracket_matches_team_a_id_fkey;
ALTER TABLE bracket_matches ADD CONSTRAINT bracket_matches_team_a_id_fkey
  FOREIGN KEY (team_a_id) REFERENCES teams(id);

ALTER TABLE bracket_matches DROP CONSTRAINT IF EXISTS bracket_matches_team_b_id_fkey;
ALTER TABLE bracket_matches ADD CONSTRAINT bracket_matches_team_b_id_fkey
  FOREIGN KEY (team_b_id) REFERENCES teams(id);

ALTER TABLE br_lobby_teams DROP CONSTRAINT IF EXISTS br_lobby_teams_team_id_fkey;
ALTER TABLE br_lobby_teams ADD CONSTRAINT br_lobby_teams_team_id_fkey
  FOREIGN KEY (team_id) REFERENCES teams(id);
