CREATE TABLE games (
    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name             VARCHAR(100) NOT NULL,
    slug             VARCHAR(50) UNIQUE NOT NULL,
    max_team_members INT NOT NULL,
    min_team_members INT NOT NULL,
    max_substitutes  INT DEFAULT 0,
    game_type        VARCHAR(20) NOT NULL CHECK (game_type IN ('bracket', 'battle_royale')),
    icon_url         TEXT,
    rules_url        TEXT,
    is_active        BOOLEAN DEFAULT true,
    created_at       TIMESTAMPTZ DEFAULT NOW()
);
