import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Galeri',
  description: 'Dokumentasi foto dan video turnamen esport pelajar ESI Kota Denpasar — momen pertandingan, podium, dan suasana event.',
  keywords: ['galeri esport denpasar', 'foto turnamen pelajar bali', 'dokumentasi esport denpasar'],
  openGraph: {
    title: 'Galeri | ESI Denpasar',
    description: 'Dokumentasi foto dan video turnamen esport pelajar ESI Kota Denpasar.',
    images: [{ url: '/api/og?title=Galeri&subtitle=ESI+Denpasar', width: 1200, height: 630 }],
  },
  alternates: { canonical: 'https://esidenpasar.com/gallery' },
}

export default function GalleryLayout({ children }: { children: React.ReactNode }) {
  return children
}
