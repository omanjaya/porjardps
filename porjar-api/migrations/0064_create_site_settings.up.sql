CREATE TABLE site_settings (
  id INT PRIMARY KEY DEFAULT 1,
  faqs JSONB NOT NULL DEFAULT '[]'::jsonb,
  about_items JSONB NOT NULL DEFAULT '[]'::jsonb,
  contacts JSONB NOT NULL DEFAULT '[]'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (id = 1)
);

INSERT INTO site_settings (id, faqs, about_items, contacts) VALUES (
  1,
  '[
    {"question":"Siapa yang boleh ikut?","answer":"Pelajar SD/SMP/SMA se-Kota Denpasar dengan dokumen valid (NISN/kartu pelajar)."},
    {"question":"Cabang apa saja?","answer":"Mobile Legends, Free Fire, PUBG Mobile, eFootball, Honor of Kings."},
    {"question":"Bagaimana cara mendaftar?","answer":"Daftar akun, buat tim, pilih event terbuka."},
    {"question":"Berapa biaya pendaftaran?","answer":"Gratis untuk semua peserta."},
    {"question":"Hadiah apa yang didapat?","answer":"Trofi, sertifikat, dan hadiah dari sponsor."},
    {"question":"Bagaimana jika bermasalah saat match?","answer":"Hubungi admin via contact person di bawah."}
  ]'::jsonb,
  '[
    {"icon":"trophy","title":"Kompetisi Resmi","description":"Menyelenggarakan turnamen esport resmi bagi pelajar SD, SMP, dan SMA se-Kota Denpasar"},
    {"icon":"users","title":"Pembinaan Atlet","description":"Membina bakat esport pelajar melalui program pelatihan dan pendampingan yang terstruktur"},
    {"icon":"buildings","title":"Kolaborasi","description":"Bekerja sama dengan Dinas Pemuda dan Olahraga serta sekolah-sekolah di Kota Denpasar"}
  ]'::jsonb,
  '[
    {"name":"Bagus Eka","phone":"+62 878-6156-9479","role":""},
    {"name":"Arik","phone":"+62 877-6038-3825","role":""},
    {"name":"Geni","phone":"+62 813-3960-0701","role":""}
  ]'::jsonb
) ON CONFLICT (id) DO NOTHING;
