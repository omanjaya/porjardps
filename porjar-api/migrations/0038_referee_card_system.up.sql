-- Add referee role
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;
ALTER TABLE users ADD CONSTRAINT users_role_check
  CHECK (role IN ('player', 'coach', 'referee', 'admin', 'superadmin'));

-- Per-game penalty configuration
CREATE TABLE IF NOT EXISTS game_penalty_configs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    game_id UUID NOT NULL REFERENCES games(id) ON DELETE CASCADE,
    card_type VARCHAR(10) NOT NULL CHECK (card_type IN ('yellow', 'red')),
    point_deduction INT NOT NULL DEFAULT 0,
    is_disqualification BOOLEAN NOT NULL DEFAULT FALSE,
    description TEXT,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(game_id, card_type)
);

-- Referee assignments to matches
CREATE TABLE IF NOT EXISTS referee_assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    referee_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    tournament_id UUID NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
    bracket_match_id UUID REFERENCES bracket_matches(id) ON DELETE CASCADE,
    br_lobby_id UUID REFERENCES br_lobbies(id) ON DELETE CASCADE,
    group_match_id UUID REFERENCES group_matches(id) ON DELETE CASCADE,
    assigned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CHECK (
        (bracket_match_id IS NOT NULL)::int +
        (br_lobby_id IS NOT NULL)::int +
        (group_match_id IS NOT NULL)::int = 1
    )
);
CREATE INDEX IF NOT EXISTS idx_referee_assignments_referee ON referee_assignments(referee_id);

-- Match cards (yellow/red)
CREATE TABLE IF NOT EXISTS match_cards (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tournament_id UUID NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
    team_id UUID NOT NULL REFERENCES teams(id),
    issued_by UUID NOT NULL REFERENCES users(id),
    card_type VARCHAR(10) NOT NULL CHECK (card_type IN ('yellow', 'red')),
    point_deduction INT NOT NULL,
    reason TEXT NOT NULL,
    bracket_match_id UUID REFERENCES bracket_matches(id) ON DELETE SET NULL,
    br_lobby_id UUID REFERENCES br_lobbies(id) ON DELETE SET NULL,
    group_match_id UUID REFERENCES group_matches(id) ON DELETE SET NULL,
    is_revoked BOOLEAN NOT NULL DEFAULT FALSE,
    revoked_by UUID REFERENCES users(id),
    revoked_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_match_cards_tournament ON match_cards(tournament_id);
CREATE INDEX IF NOT EXISTS idx_match_cards_team ON match_cards(team_id);
CREATE INDEX IF NOT EXISTS idx_match_cards_issued_by ON match_cards(issued_by);

-- Add penalty_points to standings tables
ALTER TABLE standings ADD COLUMN IF NOT EXISTS penalty_points INT NOT NULL DEFAULT 0;
ALTER TABLE group_standings ADD COLUMN IF NOT EXISTS penalty_points INT NOT NULL DEFAULT 0;
