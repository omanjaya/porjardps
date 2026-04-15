import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Peraturan Turnamen',
  description: 'Peraturan resmi turnamen esport pelajar ESI Kota Denpasar — ketentuan pertandingan Mobile Legends, Free Fire, PUBG Mobile, eFootball, dan Honor of Kings.',
  keywords: ['peraturan turnamen esport denpasar', 'rules esport pelajar bali', 'ketentuan pertandingan esport'],
  openGraph: {
    title: 'Peraturan Turnamen | ESI Denpasar',
    description: 'Peraturan resmi turnamen esport pelajar ESI Kota Denpasar — ketentuan pertandingan semua cabang game.',
    images: [{ url: '/api/og?title=Peraturan+Turnamen&subtitle=ESI+Denpasar', width: 1200, height: 630 }],
  },
  alternates: { canonical: 'https://esidenpasar.com/rules' },
}

export default function RulesLayout({ children }: { children: React.ReactNode }) {
  return children
}
