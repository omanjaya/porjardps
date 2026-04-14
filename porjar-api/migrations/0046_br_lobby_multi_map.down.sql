ALTER TABLE br_lobby_results DROP CONSTRAINT IF EXISTS br_lobby_results_lobby_id_team_id_map_number_key;
ALTER TABLE br_lobby_results ADD CONSTRAINT br_lobby_results_lobby_id_team_id_key UNIQUE (lobby_id, team_id);
ALTER TABLE br_lobby_results DROP COLUMN IF EXISTS map_number;
ALTER TABLE br_lobbies DROP COLUMN IF EXISTS num_maps;
