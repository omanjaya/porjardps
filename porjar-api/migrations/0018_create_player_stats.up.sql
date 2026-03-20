CREATE TABLE player_stats (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    game_id UUID REFERENCES games(id),
    tournament_id UUID REFERENCES tournaments(id),
    matches_played INT DEFAULT 0,
    wins INT DEFAULT 0,
    losses INT DEFAULT 0,
    mvp_count INT DEFAULT 0,
    total_kills INT DEFAULT 0,
    total_deaths INT DEFAULT 0,
    total_assists INT DEFAULT 0,
    avg_score DECIMAL(5,2) DEFAULT 0,
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, game_id, tournament_id)
);
CREATE INDEX idx_player_stats_user ON player_stats(user_id);
CREATE INDEX idx_player_stats_game ON player_stats(user_id, game_id);

CREATE TABLE achievements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    slug VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    icon VARCHAR(50) NOT NULL,
    category VARCHAR(30) NOT NULL CHECK (category IN ('tournament', 'match', 'social', 'special')),
    criteria JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE user_achievements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    achievement_id UUID REFERENCES achievements(id),
    earned_at TIMESTAMPTZ DEFAULT NOW(),
    tournament_id UUID REFERENCES tournaments(id),
    UNIQUE(user_id, achievement_id, tournament_id)
);
CREATE INDEX idx_user_achievements_user ON user_achievements(user_id);
