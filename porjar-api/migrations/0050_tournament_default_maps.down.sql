ALTER TABLE tournaments
    DROP COLUMN IF EXISTS default_num_maps,
    DROP COLUMN IF EXISTS default_map_names;
