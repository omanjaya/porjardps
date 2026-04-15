import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Event Turnamen',
  description: 'Daftar semua event turnamen esport pelajar ESI Kota Denpasar — sedang berlangsung, akan datang, dan telah selesai. Mobile Legends, Free Fire, PUBG, HOK, eFootball.',
  keywords: ['event esport denpasar', 'turnamen pelajar bali', 'esi denpasar event'],
  openGraph: {
    title: 'Event Turnamen | ESI Denpasar',
    description: 'Daftar semua event turnamen esport pelajar ESI Kota Denpasar — sedang berlangsung, akan datang, dan telah selesai.',
    images: [{ url: '/api/og?title=Event+Turnamen&subtitle=ESI+Kota+Denpasar', width: 1200, height: 630 }],
  },
  alternates: { canonical: 'https://esidenpasar.com/events' },
}

export default function EventsListLayout({ children }: { children: React.ReactNode }) {
  return children
}
