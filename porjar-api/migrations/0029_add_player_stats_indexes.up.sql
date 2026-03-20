-- Add missing indexes on player_stats for dashboard queries
CREATE INDEX IF NOT EXISTS idx_player_stats_game_tournament
    ON player_stats(game_id, tournament_id);

CREATE INDEX IF NOT EXISTS idx_player_stats_tournament
    ON player_stats(tournament_id);
