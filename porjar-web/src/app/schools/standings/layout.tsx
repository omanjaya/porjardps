import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Juara Umum Sekolah',
  description: 'Klasemen juara umum sekolah berdasarkan perolehan medali emas, perak, dan perunggu di turnamen esport pelajar ESI Kota Denpasar.',
  keywords: ['juara umum sekolah esport', 'klasemen medali esport denpasar', 'sekolah terbaik esport bali'],
  openGraph: {
    title: 'Juara Umum Sekolah | ESI Denpasar',
    description: 'Klasemen juara umum sekolah berdasarkan perolehan medali di turnamen esport pelajar ESI Kota Denpasar.',
    images: [{ url: '/api/og?title=Juara+Umum+Sekolah&subtitle=ESI+Denpasar', width: 1200, height: 630 }],
  },
  alternates: { canonical: 'https://esidenpasar.com/schools/standings' },
}

export default function SchoolStandingsLayout({ children }: { children: React.ReactNode }) {
  return children
}
