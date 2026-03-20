import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Tim Peserta',
  description: 'Daftar semua tim peserta PORJAR Denpasar Esport 2026',
  openGraph: {
    images: [{ url: '/api/og?title=Tim+Peserta&subtitle=PORJAR+Denpasar+2026', width: 1200, height: 630 }],
  },
}

export default function TeamsLayout({ children }: { children: React.ReactNode }) {
  return children
}
