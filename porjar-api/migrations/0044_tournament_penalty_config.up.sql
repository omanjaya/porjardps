-- Per-tournament penalty configuration (replaces per-game)
CREATE TABLE IF NOT EXISTS tournament_penalty_configs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tournament_id UUID NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
    card_type VARCHAR(10) NOT NULL CHECK (card_type IN ('yellow', 'red')),
    point_deduction INT NOT NULL DEFAULT 0,
    is_disqualification BOOLEAN NOT NULL DEFAULT FALSE,
    description TEXT,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(tournament_id, card_type)
);
CREATE INDEX IF NOT EXISTS idx_tournament_penalty_configs_tournament ON tournament_penalty_configs(tournament_id);
