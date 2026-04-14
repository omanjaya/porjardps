-- Migration 0070: Add ON DELETE CASCADE/SET NULL to critical FK relationships
-- Idempotent: drops constraint IF EXISTS before re-adding

-- team_members.user_id → ON DELETE CASCADE (user deleted = remove from teams)
ALTER TABLE team_members DROP CONSTRAINT IF EXISTS team_members_user_id_fkey;
ALTER TABLE team_members ADD CONSTRAINT team_members_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

-- team_members.team_id → ON DELETE CASCADE (team deleted = remove members)
ALTER TABLE team_members DROP CONSTRAINT IF EXISTS team_members_team_id_fkey;
ALTER TABLE team_members ADD CONSTRAINT team_members_team_id_fkey
  FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE CASCADE;

-- match_submissions.team_id → ON DELETE SET NULL (keep submission history)
ALTER TABLE match_submissions DROP CONSTRAINT IF EXISTS match_submissions_team_id_fkey;
ALTER TABLE match_submissions ADD CONSTRAINT match_submissions_team_id_fkey
  FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE SET NULL;

-- bracket_matches.team_a_id → ON DELETE SET NULL
ALTER TABLE bracket_matches DROP CONSTRAINT IF EXISTS bracket_matches_team_a_id_fkey;
ALTER TABLE bracket_matches ADD CONSTRAINT bracket_matches_team_a_id_fkey
  FOREIGN KEY (team_a_id) REFERENCES teams(id) ON DELETE SET NULL;

-- bracket_matches.team_b_id → ON DELETE SET NULL
ALTER TABLE bracket_matches DROP CONSTRAINT IF EXISTS bracket_matches_team_b_id_fkey;
ALTER TABLE bracket_matches ADD CONSTRAINT bracket_matches_team_b_id_fkey
  FOREIGN KEY (team_b_id) REFERENCES teams(id) ON DELETE SET NULL;

-- br_lobby_teams.team_id → ON DELETE CASCADE
ALTER TABLE br_lobby_teams DROP CONSTRAINT IF EXISTS br_lobby_teams_team_id_fkey;
ALTER TABLE br_lobby_teams ADD CONSTRAINT br_lobby_teams_team_id_fkey
  FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE CASCADE;
