import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Event',
  description: 'Daftar event turnamen esport pelajar ESI Kota Denpasar — ongoing, akan datang, dan selesai.',
  openGraph: {
    title: 'Event ESI Kota Denpasar',
    description: 'Semua event turnamen esport pelajar se-Kota Denpasar.',
    images: [{ url: '/api/og?title=Event&subtitle=ESI+Kota+Denpasar', width: 1200, height: 630 }],
  },
}

export default function EventsListLayout({ children }: { children: React.ReactNode }) {
  return children
}
