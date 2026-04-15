import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Sekolah Peserta',
  description: 'Daftar SMP, SMA, dan SMK yang berpartisipasi dalam turnamen esport pelajar ESI Kota Denpasar. Temukan tim dari sekolahmu.',
  keywords: ['sekolah esport denpasar', 'sma smk peserta turnamen bali', 'esports pelajar denpasar'],
  openGraph: {
    title: 'Sekolah Peserta | ESI Denpasar',
    description: 'Daftar SMP, SMA, dan SMK yang berpartisipasi dalam turnamen esport pelajar ESI Kota Denpasar.',
    images: [{ url: '/api/og?title=Sekolah+Peserta&subtitle=ESI+Denpasar', width: 1200, height: 630 }],
  },
  alternates: { canonical: 'https://esidenpasar.com/schools' },
}

export default function SchoolsLayout({ children }: { children: React.ReactNode }) {
  return children
}
