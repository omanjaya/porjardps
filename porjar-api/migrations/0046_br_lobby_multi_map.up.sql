-- Add num_maps to br_lobbies (how many maps per pot)
ALTER TABLE br_lobbies ADD COLUMN IF NOT EXISTS num_maps INT NOT NULL DEFAULT 1;

-- Add map_number to br_lobby_results (which map this result is for)
ALTER TABLE br_lobby_results ADD COLUMN IF NOT EXISTS map_number INT NOT NULL DEFAULT 1;

-- Drop old unique constraint (lobby_id, team_id) and replace with (lobby_id, team_id, map_number)
ALTER TABLE br_lobby_results DROP CONSTRAINT IF EXISTS br_lobby_results_lobby_id_team_id_key;
ALTER TABLE br_lobby_results ADD CONSTRAINT br_lobby_results_lobby_id_team_id_map_number_key
    UNIQUE (lobby_id, team_id, map_number);
