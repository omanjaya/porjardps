import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Pencapaian',
  description: 'Daftar pencapaian dan badge yang tersedia di PORJAR Denpasar Esport 2026',
  openGraph: {
    images: [{ url: '/api/og?title=Pencapaian&subtitle=PORJAR+Denpasar+2026', width: 1200, height: 630 }],
  },
}

export default function AchievementsLayout({ children }: { children: React.ReactNode }) {
  return children
}
