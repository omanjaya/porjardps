import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Pertandingan Live',
  description: 'Skor pertandingan esport yang sedang berlangsung - PORJAR Denpasar 2026',
  openGraph: {
    images: [{ url: '/api/og?title=Pertandingan+Live&subtitle=PORJAR+Denpasar+2026', width: 1200, height: 630 }],
  },
}

export default function LiveMatchLayout({ children }: { children: React.ReactNode }) {
  return children
}
