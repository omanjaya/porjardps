import type { Metadata } from 'next'
import { PublicLayout } from '@/components/layouts/PublicLayout'

export const metadata: Metadata = {
  title: 'Pertandingan Live',
  description: 'Skor pertandingan esport pelajar yang sedang berlangsung — update real-time hasil match ESI Kota Denpasar.',
  keywords: ['pertandingan live esport denpasar', 'skor live esport bali', 'live match turnamen pelajar'],
  openGraph: {
    title: 'Pertandingan Live | ESI Denpasar',
    description: 'Skor pertandingan esport pelajar yang sedang berlangsung — update real-time hasil match ESI Kota Denpasar.',
    images: [{ url: '/api/og?title=Pertandingan+Live&subtitle=ESI+Denpasar', width: 1200, height: 630 }],
  },
  alternates: { canonical: 'https://esidenpasar.com/matches/live' },
}

export default function LiveMatchLayout({ children }: { children: React.ReactNode }) {
  return <PublicLayout>{children}</PublicLayout>
}
