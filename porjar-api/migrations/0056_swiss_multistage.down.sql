ALTER TABLE tournament_groups DROP CONSTRAINT IF EXISTS fk_tournament_groups_stage;

DROP INDEX IF EXISTS idx_tournament_stages_tournament;
DROP TABLE IF EXISTS tournament_stages;

ALTER TABLE tournament_groups
    DROP COLUMN IF EXISTS stage_id,
    DROP COLUMN IF EXISTS swiss_config,
    DROP COLUMN IF EXISTS pairing_mode;
