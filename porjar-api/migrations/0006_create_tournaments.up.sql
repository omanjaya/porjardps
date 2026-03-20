CREATE TABLE tournaments (
    id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    game_id            UUID REFERENCES games(id) NOT NULL,
    name               VARCHAR(255) NOT NULL,
    format             VARCHAR(30) NOT NULL CHECK (format IN (
        'single_elimination', 'double_elimination',
        'round_robin', 'swiss',
        'battle_royale_points',
        'group_stage_playoff'
    )),
    stage              VARCHAR(30) DEFAULT 'main' CHECK (stage IN ('qualifier', 'group_stage', 'playoff', 'main', 'grand_final')),
    best_of            INT DEFAULT 1,
    max_teams          INT,
    status             VARCHAR(20) DEFAULT 'upcoming' CHECK (status IN ('upcoming', 'registration', 'ongoing', 'completed', 'cancelled')),
    registration_start TIMESTAMPTZ,
    registration_end   TIMESTAMPTZ,
    start_date         TIMESTAMPTZ,
    end_date           TIMESTAMPTZ,
    rules              TEXT,
    created_at         TIMESTAMPTZ DEFAULT NOW(),
    updated_at         TIMESTAMPTZ DEFAULT NOW()
);
