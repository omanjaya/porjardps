import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Jadwal Pertandingan',
  description: 'Jadwal lengkap semua pertandingan esport pelajar ESI Kota Denpasar — tanggal, waktu, dan venue setiap cabang game.',
  keywords: ['jadwal esport denpasar', 'jadwal pertandingan pelajar bali', 'schedule turnamen esport'],
  openGraph: {
    title: 'Jadwal Pertandingan | ESI Denpasar',
    description: 'Jadwal lengkap semua pertandingan esport pelajar ESI Kota Denpasar.',
    images: [{ url: '/api/og?title=Jadwal+Pertandingan&subtitle=ESI+Denpasar', width: 1200, height: 630 }],
  },
  alternates: { canonical: 'https://esidenpasar.com/schedule' },
}

export default function ScheduleLayout({ children }: { children: React.ReactNode }) {
  return children
}
