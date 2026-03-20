ALTER TABLE users ADD COLUMN nisn VARCHAR(20) UNIQUE;
ALTER TABLE users ADD COLUMN tingkat VARCHAR(5) CHECK (tingkat IN ('SD', 'SMP', 'SMA'));
ALTER TABLE users ADD COLUMN nomor_pertandingan VARCHAR(50);
ALTER TABLE users ADD COLUMN needs_password_change BOOLEAN DEFAULT false;
CREATE INDEX idx_users_nisn ON users(nisn);
