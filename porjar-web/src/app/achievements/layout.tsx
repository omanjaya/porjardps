import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Pencapaian',
  description: 'Daftar pencapaian dan badge pemain di turnamen esport pelajar ESI Kota Denpasar — raih prestasi terbaik dalam kompetisi.',
  keywords: ['pencapaian esport denpasar', 'badge pemain esport bali', 'prestasi turnamen pelajar'],
  openGraph: {
    title: 'Pencapaian | ESI Denpasar',
    description: 'Daftar pencapaian dan badge pemain di turnamen esport pelajar ESI Kota Denpasar.',
    images: [{ url: '/api/og?title=Pencapaian&subtitle=ESI+Denpasar', width: 1200, height: 630 }],
  },
  alternates: { canonical: 'https://esidenpasar.com/achievements' },
}

export default function AchievementsLayout({ children }: { children: React.ReactNode }) {
  return children
}
