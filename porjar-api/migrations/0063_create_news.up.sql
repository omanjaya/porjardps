CREATE TABLE news (
  id BIGSERIAL PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  slug VARCHAR(255) UNIQUE NOT NULL,
  excerpt TEXT NOT NULL DEFAULT '',
  content TEXT NOT NULL DEFAULT '',
  category VARCHAR(50) NOT NULL DEFAULT 'Berita',
  image_url VARCHAR(500),
  published_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_news_published ON news(published_at DESC);

INSERT INTO news (title, slug, excerpt, content, category, image_url, published_at) VALUES
  ('PORJAR 2026 Resmi Dibuka', 'porjar-2026-resmi-dibuka', 'Pekan Olahraga Pelajar Denpasar 2026 cabang esport resmi dibuka dengan 132 sekolah peserta.', 'Pekan Olahraga Pelajar (PORJAR) Denpasar 2026 cabang esport telah resmi dibuka pada hari ini. Turnamen ini diikuti oleh 132 sekolah se-Kota Denpasar dengan total ribuan pelajar yang akan bertanding di berbagai game kompetitif.', 'Pengumuman', NULL, NOW() - INTERVAL '1 days'),
  ('Jadwal Babak Penyisihan Mobile Legends', 'jadwal-babak-penyisihan-mobile-legends', 'Babak penyisihan Mobile Legends akan dimulai minggu depan dengan format group stage.', 'Babak penyisihan cabang Mobile Legends: Bang Bang akan dimulai minggu depan menggunakan format group stage. Tim-tim akan dibagi ke dalam beberapa grup dan bermain round-robin sebelum lanjut ke babak gugur.', 'Jadwal', NULL, NOW() - INTERVAL '2 days'),
  ('Tips Persiapan Turnamen untuk Pelajar', 'tips-persiapan-turnamen-untuk-pelajar', 'Beberapa tips penting bagi pelajar yang akan bertanding di PORJAR 2026.', 'Persiapan matang sangat penting untuk turnamen esport. Pastikan komunikasi tim berjalan lancar, latihan rutin, serta jaga kesehatan fisik dan mental selama masa turnamen berlangsung.', 'Tips', NULL, NOW() - INTERVAL '3 days'),
  ('Hasil Drawing Grup Free Fire', 'hasil-drawing-grup-free-fire', 'Drawing grup cabang Free Fire telah selesai dilaksanakan.', 'Drawing grup untuk cabang Free Fire telah dilaksanakan. Pembagian lobby dan jadwal pertandingan dapat dilihat di halaman turnamen masing-masing.', 'Berita', NULL, NOW() - INTERVAL '4 days')
ON CONFLICT (slug) DO NOTHING;
