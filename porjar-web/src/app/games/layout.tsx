import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Cabang E-Sport',
  description: 'Daftar cabang e-sport PORJAR Denpasar 2026 - HOK, ML, FF, PUBGM, eFootball',
  openGraph: {
    images: [{ url: '/api/og?title=Cabang+E-Sport&subtitle=PORJAR+Denpasar+2026', width: 1200, height: 630 }],
  },
}

export default function GamesLayout({ children }: { children: React.ReactNode }) {
  return children
}
