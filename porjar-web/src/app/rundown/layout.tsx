import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Rundown Pertandingan',
  description: 'Rundown lengkap hari-per-hari pertandingan esport pelajar ESI Kota Denpasar — susunan acara dan alur event.',
  keywords: ['rundown esport denpasar', 'susunan acara turnamen pelajar', 'alur event esport bali'],
  openGraph: {
    title: 'Rundown Pertandingan | ESI Denpasar',
    description: 'Rundown lengkap hari-per-hari pertandingan esport pelajar ESI Kota Denpasar.',
    images: [{ url: '/api/og?title=Rundown+Pertandingan&subtitle=ESI+Denpasar', width: 1200, height: 630 }],
  },
  alternates: { canonical: 'https://esidenpasar.com/rundown' },
}

export default function RundownLayout({ children }: { children: React.ReactNode }) {
  return children
}
