ALTER TABLE events
  ADD COLUMN rules_content JSONB NOT NULL DEFAULT '[]'::jsonb;

UPDATE events
SET rules_content = '[
  {"section":"Persyaratan Peserta","content":"Pelajar SD/SMP/SMA se-Kota Denpasar dengan kartu pelajar valid."},
  {"section":"Cabang yang Dipertandingkan","content":"Mobile Legends, Free Fire, PUBG Mobile, eFootball, Honor of Kings."},
  {"section":"Sistem Pertandingan","content":"Setiap cabang memiliki sistem turnamen sendiri (single elim/double elim/group/BR)."},
  {"section":"Pendaftaran","content":"Gratis. Daftar via website atau panitia sekolah."},
  {"section":"Code of Conduct","content":"Sportif, dilarang cheating, penghinaan, atau toxic behavior."},
  {"section":"Sanksi","content":"Pelanggaran dapat berakhir diskualifikasi tim/individu."}
]'::jsonb
WHERE rules_content = '[]'::jsonb;
