import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Cabang E-Sport',
  description: 'Cabang e-sport yang dipertandingkan di ESI Kota Denpasar — Honor of Kings, Mobile Legends, Free Fire, PUBG Mobile, dan eFootball.',
  keywords: ['cabang esport denpasar', 'mobile legends denpasar', 'free fire bali', 'honor of kings turnamen', 'pubg mobile pelajar'],
  openGraph: {
    title: 'Cabang E-Sport | ESI Denpasar',
    description: 'Cabang e-sport yang dipertandingkan di ESI Kota Denpasar — HOK, ML, FF, PUBGM, eFootball.',
    images: [{ url: '/api/og?title=Cabang+E-Sport&subtitle=ESI+Denpasar', width: 1200, height: 630 }],
  },
  alternates: { canonical: 'https://esidenpasar.com/games' },
}

export default function GamesLayout({ children }: { children: React.ReactNode }) {
  return children
}
