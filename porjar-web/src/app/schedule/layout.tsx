import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Jadwal Pertandingan',
  description: 'Jadwal lengkap pertandingan esport PORJAR Denpasar 2026',
  openGraph: {
    images: [{ url: '/api/og?title=Jadwal+Pertandingan&subtitle=PORJAR+Denpasar+2026', width: 1200, height: 630 }],
  },
}

export default function ScheduleLayout({ children }: { children: React.ReactNode }) {
  return children
}
