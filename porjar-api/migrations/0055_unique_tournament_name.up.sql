CREATE UNIQUE INDEX IF NOT EXISTS uniq_tournament_game_name ON tournaments(game_id, name);
