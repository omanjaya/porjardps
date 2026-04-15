import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Leaderboard',
  description: 'Peringkat tim, pemain, dan sekolah berdasarkan poin di turnamen esport pelajar ESI Kota Denpasar. Lihat siapa yang memimpin klasemen.',
  keywords: ['leaderboard esport denpasar', 'peringkat tim esport bali', 'klasemen turnamen pelajar'],
  openGraph: {
    title: 'Leaderboard | ESI Denpasar',
    description: 'Peringkat tim, pemain, dan sekolah berdasarkan poin di turnamen esport pelajar ESI Kota Denpasar.',
    images: [{ url: '/api/og?title=Leaderboard&subtitle=ESI+Denpasar', width: 1200, height: 630 }],
  },
  alternates: { canonical: 'https://esidenpasar.com/leaderboards' },
}

export default function LeaderboardsLayout({ children }: { children: React.ReactNode }) {
  return children
}
