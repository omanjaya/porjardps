import type { Metadata } from 'next'
import { PublicLayout } from '@/components/layouts/PublicLayout'

export const metadata: Metadata = {
  title: 'Pertandingan Live',
  description: 'Skor pertandingan esport yang sedang berlangsung - ESI Denpasar 2026',
  openGraph: {
    images: [{ url: '/api/og?title=Pertandingan+Live&subtitle=ESI+Denpasar+2026', width: 1200, height: 630 }],
  },
}

export default function LiveMatchLayout({ children }: { children: React.ReactNode }) {
  return <PublicLayout>{children}</PublicLayout>
}
