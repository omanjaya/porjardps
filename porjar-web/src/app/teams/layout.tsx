import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Tim Peserta',
  description: 'Daftar semua tim peserta turnamen esport pelajar ESI Kota Denpasar — Mobile Legends, Free Fire, PUBG Mobile, eFootball, dan Honor of Kings.',
  keywords: ['tim esport denpasar', 'daftar tim turnamen pelajar bali', 'esport team denpasar'],
  openGraph: {
    title: 'Tim Peserta | ESI Denpasar',
    description: 'Daftar semua tim peserta turnamen esport pelajar ESI Kota Denpasar.',
    images: [{ url: '/api/og?title=Tim+Peserta&subtitle=ESI+Denpasar', width: 1200, height: 630 }],
  },
  alternates: { canonical: 'https://esidenpasar.com/teams' },
}

export default function TeamsLayout({ children }: { children: React.ReactNode }) {
  return children
}
