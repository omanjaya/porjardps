ALTER TABLE schools ADD COLUMN IF NOT EXISTS logo_url TEXT;

UPDATE schools SET logo_url = '/images/schools/sma-negeri-2-denpasar.webp'  WHERE LOWER(name) LIKE '%sma%negeri%2%denpasar%';
UPDATE schools SET logo_url = '/images/schools/sma-negeri-3-denpasar.webp'  WHERE LOWER(name) LIKE '%sma%negeri%3%denpasar%';
UPDATE schools SET logo_url = '/images/schools/sma-negeri-6-denpasar.webp'  WHERE LOWER(name) LIKE '%sma%negeri%6%denpasar%';
UPDATE schools SET logo_url = '/images/schools/sma-negeri-7-denpasar.webp'  WHERE LOWER(name) LIKE '%sma%negeri%7%denpasar%';
UPDATE schools SET logo_url = '/images/schools/sma-negeri-8-denpasar.webp'  WHERE LOWER(name) LIKE '%sma%negeri%8%denpasar%';
UPDATE schools SET logo_url = '/images/schools/smk-negeri-1-denpasar.webp'  WHERE LOWER(name) LIKE '%smk%negeri%1%denpasar%';
UPDATE schools SET logo_url = '/images/schools/smk-negeri-3-denpasar.webp'  WHERE LOWER(name) LIKE '%smk%negeri%3%denpasar%';
UPDATE schools SET logo_url = '/images/schools/smk-bali-dewata.webp'        WHERE LOWER(name) LIKE '%bali%dewata%';
UPDATE schools SET logo_url = '/images/schools/smk-bali-medika.webp'        WHERE LOWER(name) LIKE '%bali%medika%';
UPDATE schools SET logo_url = '/images/schools/smk-bintang-persada.webp'    WHERE LOWER(name) LIKE '%bintang%persada%';
UPDATE schools SET logo_url = '/images/schools/smk-pgri-5-denpasar.webp'    WHERE LOWER(name) LIKE '%pgri%5%';
UPDATE schools SET logo_url = '/images/schools/smk-pariwisata-harapan.webp' WHERE LOWER(name) LIKE '%pariwisata%harapan%';
UPDATE schools SET logo_url = '/images/schools/smk-saraswati-2.webp'        WHERE LOWER(name) LIKE '%saraswati%2%';
UPDATE schools SET logo_url = '/images/schools/smk-teknologi-nasional.webp' WHERE LOWER(name) LIKE '%teknologi%nasional%';
UPDATE schools SET logo_url = '/images/schools/smk-ti-bali-global.webp'     WHERE LOWER(name) LIKE '%ti%bali%global%' OR LOWER(name) LIKE '%teknologi%informasi%bali%global%';
UPDATE schools SET logo_url = '/images/schools/smp-negeri-11-denpasar.webp' WHERE LOWER(name) LIKE '%smp%negeri%11%denpasar%';
