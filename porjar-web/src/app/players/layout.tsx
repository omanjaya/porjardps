import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Pemain',
  description: 'Daftar pemain yang terdaftar dalam turnamen esport pelajar ESI Kota Denpasar. Cari pemain berdasarkan nama atau sekolah.',
  keywords: ['pemain esport denpasar', 'player esport pelajar bali', 'daftar peserta esport denpasar'],
  openGraph: {
    title: 'Pemain | ESI Denpasar',
    description: 'Daftar pemain yang terdaftar dalam turnamen esport pelajar ESI Kota Denpasar.',
    images: [{ url: '/api/og?title=Pemain&subtitle=ESI+Denpasar', width: 1200, height: 630 }],
  },
  alternates: { canonical: 'https://esidenpasar.com/players' },
}

export default function PlayersLayout({ children }: { children: React.ReactNode }) {
  return children
}
