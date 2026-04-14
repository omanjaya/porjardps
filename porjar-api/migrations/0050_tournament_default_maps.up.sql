ALTER TABLE tournaments
    ADD COLUMN IF NOT EXISTS default_num_maps  INT     NOT NULL DEFAULT 1,
    ADD COLUMN IF NOT EXISTS default_map_names TEXT[]  NOT NULL DEFAULT '{}';
