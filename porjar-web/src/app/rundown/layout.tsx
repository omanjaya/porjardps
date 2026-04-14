import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Rundown Pertandingan',
  description: 'Rundown lengkap pertandingan ESI Denpasar 2026, 26–31 Maret 2026',
  openGraph: {
    images: [{ url: '/api/og?title=Rundown+Pertandingan&subtitle=ESI+Denpasar+2026', width: 1200, height: 630 }],
  },
}

export default function RundownLayout({ children }: { children: React.ReactNode }) {
  return children
}
