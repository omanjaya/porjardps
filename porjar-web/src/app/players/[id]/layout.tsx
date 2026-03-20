import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Profil Pemain',
  description: 'Profil dan statistik pemain PORJAR Denpasar Esport 2026',
  openGraph: {
    images: [{ url: '/api/og?title=Profil+Pemain&subtitle=PORJAR+Denpasar+2026', width: 1200, height: 630 }],
  },
}

export default function PlayerProfileLayout({ children }: { children: React.ReactNode }) {
  return children
}
