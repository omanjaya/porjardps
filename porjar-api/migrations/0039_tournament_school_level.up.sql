ALTER TABLE tournaments ADD COLUMN school_level VARCHAR(10);

-- Populate from tournament names
UPDATE tournaments SET school_level = 'SMP' WHERE name ILIKE '% SMP %';
UPDATE tournaments SET school_level = 'SMA' WHERE name ILIKE '% SMA %';
UPDATE tournaments SET school_level = 'SMK' WHERE name ILIKE '% SMK %';
UPDATE tournaments SET school_level = 'SD' WHERE name ILIKE '% SD %';
