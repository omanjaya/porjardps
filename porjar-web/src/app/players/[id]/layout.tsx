import type { Metadata } from 'next'
import { PublicLayout } from '@/components/layouts/PublicLayout'

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params
  const API = process.env.NEXT_PUBLIC_API_URL ?? ''
  try {
    const res = await fetch(`${API}/players/${id}`, { next: { revalidate: 300 } })
    if (!res.ok) throw new Error()
    const body = await res.json()
    const profile = body.data ?? body
    const user = profile?.user
    if (!user) throw new Error()
    const name: string = user.full_name ?? user.username ?? 'Pemain'
    const schoolName: string = user.school?.name ?? ''
    const subtitle = schoolName || `ESI Denpasar 2026`
    const ogUrl = `/api/og?title=${encodeURIComponent(name)}&subtitle=${encodeURIComponent(subtitle)}&type=player`
    return {
      title: `${name} — Profil Pemain`,
      description: `Profil dan statistik ${name}${schoolName ? ' dari ' + schoolName : ''} — ESI Denpasar Esport 2026`,
      openGraph: {
        title: name,
        description: `Profil pemain ${name}${schoolName ? ' (' + schoolName + ')' : ''} — ESI Denpasar 2026`,
        images: [{ url: ogUrl, width: 1200, height: 630 }],
      },
      twitter: { card: 'summary_large_image', title: name, images: [ogUrl] },
    }
  } catch {
    return {
      title: 'Profil Pemain',
      description: 'Profil dan statistik pemain ESI Denpasar Esport 2026',
      openGraph: {
        images: [{ url: '/api/og?title=Profil+Pemain&subtitle=ESI+Denpasar+2026', width: 1200, height: 630 }],
      },
    }
  }
}

export default function PlayerProfileLayout({ children }: { children: React.ReactNode }) {
  return <PublicLayout>{children}</PublicLayout>
}
