-- Fix orphan FK risks: add ON DELETE CASCADE to team-related tables

-- 1. tournament_teams.team_id
ALTER TABLE tournament_teams DROP CONSTRAINT IF EXISTS tournament_teams_team_id_fkey;
ALTER TABLE tournament_teams ADD CONSTRAINT tournament_teams_team_id_fkey
  FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE CASCADE;

-- 2. standings.team_id
ALTER TABLE standings DROP CONSTRAINT IF EXISTS standings_team_id_fkey;
ALTER TABLE standings ADD CONSTRAINT standings_team_id_fkey
  FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE CASCADE;

-- 3. br_lobby_results.team_id
ALTER TABLE br_lobby_results DROP CONSTRAINT IF EXISTS br_lobby_results_team_id_fkey;
ALTER TABLE br_lobby_results ADD CONSTRAINT br_lobby_results_team_id_fkey
  FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE CASCADE;

-- 4. br_daily_standings.team_id
ALTER TABLE br_daily_standings DROP CONSTRAINT IF EXISTS br_daily_standings_team_id_fkey;
ALTER TABLE br_daily_standings ADD CONSTRAINT br_daily_standings_team_id_fkey
  FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE CASCADE;

-- 5. group_standings.team_id
ALTER TABLE group_standings DROP CONSTRAINT IF EXISTS group_standings_team_id_fkey;
ALTER TABLE group_standings ADD CONSTRAINT group_standings_team_id_fkey
  FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE CASCADE;

-- 6. match_cards.team_id
ALTER TABLE match_cards DROP CONSTRAINT IF EXISTS match_cards_team_id_fkey;
ALTER TABLE match_cards ADD CONSTRAINT match_cards_team_id_fkey
  FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE CASCADE;

-- Add CHECK constraints on status fields
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'tournament_teams_status_check') THEN
    ALTER TABLE tournament_teams ADD CONSTRAINT tournament_teams_status_check
      CHECK (status IN ('active', 'approved', 'pending', 'rejected', 'eliminated', 'bye', 'walkover', 'withdrawn'));
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'schedules_status_check') THEN
    ALTER TABLE schedules ADD CONSTRAINT schedules_status_check
      CHECK (status IN ('upcoming', 'ongoing', 'completed', 'postponed', 'cancelled'));
  END IF;
END $$;

-- Add missing performance indexes on FK columns
CREATE INDEX IF NOT EXISTS idx_br_lobby_results_team ON br_lobby_results(team_id);
CREATE INDEX IF NOT EXISTS idx_br_daily_standings_team ON br_daily_standings(team_id);
CREATE INDEX IF NOT EXISTS idx_group_standings_team ON group_standings(team_id);
CREATE INDEX IF NOT EXISTS idx_match_cards_team ON match_cards(team_id);
CREATE INDEX IF NOT EXISTS idx_match_cards_bracket_match ON match_cards(bracket_match_id) WHERE bracket_match_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_match_cards_br_lobby ON match_cards(br_lobby_id) WHERE br_lobby_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_match_cards_group_match ON match_cards(group_match_id) WHERE group_match_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_tournament_teams_status ON tournament_teams(tournament_id, status);
