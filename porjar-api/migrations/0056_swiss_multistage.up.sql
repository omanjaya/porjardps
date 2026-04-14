-- Swiss pairing support on tournament_groups
ALTER TABLE tournament_groups
    ADD COLUMN IF NOT EXISTS pairing_mode VARCHAR(20) NOT NULL DEFAULT 'round_robin',
    ADD COLUMN IF NOT EXISTS swiss_config JSONB,
    ADD COLUMN IF NOT EXISTS stage_id UUID;

-- Tournament stages table
CREATE TABLE IF NOT EXISTS tournament_stages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tournament_id UUID NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
    stage_order INT NOT NULL,
    stage_type VARCHAR(30) NOT NULL,
    name VARCHAR(100) NOT NULL,
    config JSONB NOT NULL DEFAULT '{}',
    status VARCHAR(20) NOT NULL DEFAULT 'pending',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tournament_stages_tournament ON tournament_stages(tournament_id);

-- Link groups to stages
ALTER TABLE tournament_groups
    ADD CONSTRAINT fk_tournament_groups_stage FOREIGN KEY (stage_id) REFERENCES tournament_stages(id) ON DELETE SET NULL;
