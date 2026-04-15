/**
 * Static school logo mapping.
 * Used as a fallback when a school's `logo_url` field is null/empty.
 * Files live in /public/images/schools/.
 */
const SCHOOL_LOGO_MAP: Record<string, string> = {
  // SMA Negeri
  'SMA Negeri 1 Denpasar': '/images/schools/sman1-denpasar.webp',
  'SMA Negeri 2 Denpasar': '/images/schools/sman2.webp',
  'SMA Negeri 3 Denpasar': '/images/schools/sma-negeri-3-denpasar.webp',
  'SMA Negeri 4 Denpasar': '/images/schools/sman4-v2.webp',
  'SMA Negeri 5 Denpasar': '/images/schools/sman5.webp',
  'SMA Negeri 6 Denpasar': '/images/schools/sman6.webp',
  'SMA Negeri 7 Denpasar': '/images/schools/sman7.webp',
  'SMA Negeri 8 Denpasar': '/images/schools/sma-negeri-8-denpasar.webp',
  'SMA Negeri 9 Denpasar': '/images/schools/sman9.webp',
  'SMA Negeri 10 Denpasar': '/images/schools/sman10.webp',
  'SMA Negeri 11 Denpasar': '/images/schools/sman11.webp',
  'SMA Negeri 12 Denpasar': '/images/schools/sman12.webp',

  // SMA Swasta
  'SMA Dwijendra Denpasar': '/images/schools/sma-dwijendra.webp',
  'SMA Harapan Denpasar': '/images/schools/sma-harapan-denpasar.webp',
  'SMA Harapan Nusantara': '/images/schools/sma-harapan-nusantara.webp',
  'SMA Saraswati Denpasar': '/images/schools/sma-saraswati.webp',
  'SMA Santo Yoseph Denpasar': '/images/schools/santo-yoseph.webp',
  'SMA Kristen Harapan Denpasar': '/images/schools/sma-kristen-harapan-v2.webp',
  'SMA Muhammadiyah Denpasar': '/images/schools/sma-muhammadiyah-v2.webp',
  'SMA CHIS Denpasar': '/images/schools/sma-chis.webp',
  'SMA Tunas Daud Denpasar': '/images/schools/sma-tunas-daud.webp',

  // MA
  'MA Al-Kalifa Denpasar': '/images/schools/ma-kalifa.webp',

  // SMK Negeri
  'SMK Negeri 1 Denpasar': '/images/schools/smk-negeri-1-denpasar.webp',
  'SMK Negeri 2 Denpasar': '/images/schools/smkn2.webp',
  'SMK Negeri 3 Denpasar': '/images/schools/smk-negeri-3-denpasar.webp',
  'SMK Negeri 4 Denpasar': '/images/schools/smkn4-v2.webp',
  'SMK Negeri 5 Denpasar': '/images/schools/smkn5-v3.webp',
  'SMK Negeri 6 Denpasar': '/images/schools/smkn6.webp',
  'SMK Negeri 7 Denpasar': '/images/schools/smkn7.webp',

  // SMK Swasta
  'SMK Bina Madina Denpasar': '/images/schools/smk-bina-madina.webp',
  'SMK Kertha Wisata Denpasar': '/images/schools/smk-kertha-wisata.webp',
  'SMK Penerbangan Denpasar': '/images/schools/smk-penerbangan-v2.webp',
  'SMK PGRI 1 Denpasar': '/images/schools/smk-pgri1.webp',
  'SMK PGRI 3 Denpasar': '/images/schools/smk-pgri3.webp',
  'SMK PGRI 5 Denpasar': '/images/schools/smk-pgri5.webp',
  'SMK Saraswati 2 Denpasar': '/images/schools/smk-saraswati2.webp',
  'SMK Teknologi Nasional Denpasar': '/images/schools/smk-teknas.webp',
  'SMK TI Bali Global Denpasar': '/images/schools/smk-ti-bali-global.webp',
  'SMK Bali Dewata': '/images/schools/smk-bali-dewata.webp',
  'SMK Bali Medika Denpasar': '/images/schools/smk-bali-medika.webp',
  'SMK Pariwisata Harapan Denpasar': '/images/schools/smk-pariwisata-harapan.webp',
  'SMK Bintang Persada Denpasar': '/images/schools/smk-bintang-persada.webp',

  // SMP Negeri
  'SMP Negeri 1 Denpasar': '/images/schools/smp-negeri-1-denpasar.webp',
  'SMP Negeri 11 Denpasar': '/images/schools/smp-negeri-11-denpasar.webp',

  // SMP Swasta
  'SMP Adhi Mekar Indonesia Denpasar': '/images/schools/smp-adhi-mekar-indonesia.webp',

  // MTs
  'MTs Al-Maruf Denpasar': '/images/schools/mts-al-maruf-denpasar.webp',
  'MTs Al-Muhajirin Denpasar': '/images/schools/mts-al-muhajirin-denpasar.webp',
}

/**
 * Returns the static logo path for a school, or null if not found.
 * Use this as a fallback when `school.logo_url` is null/empty.
 *
 * Usage:
 *   const logo = school.logo_url || getSchoolLogo(school.name)
 */
export function getSchoolLogo(name: string): string | null {
  return SCHOOL_LOGO_MAP[name] ?? null
}
