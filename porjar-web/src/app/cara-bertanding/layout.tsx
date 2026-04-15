import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Cara Bertanding',
  description: 'Panduan lengkap cara bertanding di turnamen esport pelajar ESI Kota Denpasar — dari pendaftaran akun, pembuatan tim, hingga jadwal pertandingan.',
  alternates: { canonical: 'https://esidenpasar.com/cara-bertanding' },
  openGraph: {
    title: 'Cara Bertanding | ESI Denpasar',
    description: 'Panduan lengkap cara bertanding di turnamen esport pelajar ESI Kota Denpasar.',
    url: 'https://esidenpasar.com/cara-bertanding',
    images: [{ url: '/api/og?title=Cara+Bertanding&subtitle=Panduan+Turnamen+ESI+Denpasar', width: 1200, height: 630 }],
  },
}

export default function CaraBertandingLayout({ children }: { children: React.ReactNode }) {
  return children
}
