import type { Metadata } from 'next'

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params
  const API = process.env.NEXT_PUBLIC_API_URL ?? ''
  try {
    const res = await fetch(`${API}/teams/${id}`, { next: { revalidate: 300 } })
    if (!res.ok) throw new Error()
    const body = await res.json()
    const team = body.data ?? body
    if (!team) throw new Error()
    const name: string = team.name ?? 'Tim'
    const schoolName: string = team.school?.name ?? ''
    const gameName: string = team.game?.name ?? ''
    const subtitleParts = [gameName, schoolName].filter(Boolean)
    const subtitle = subtitleParts.join(' — ') || 'ESI Denpasar 2026'
    const ogUrl = `/api/og?title=${encodeURIComponent(name)}&subtitle=${encodeURIComponent(subtitle)}&type=team`
    return {
      title: `${name} — Tim`,
      description: `Profil tim ${name}${schoolName ? ' dari ' + schoolName : ''}${gameName ? ' — ' + gameName : ''} ESI Denpasar 2026`,
      openGraph: {
        title: name,
        description: `Tim ${name}${schoolName ? ' (' + schoolName + ')' : ''}${gameName ? ' — ' + gameName : ''}`,
        images: [{ url: ogUrl, width: 1200, height: 630 }],
      },
      twitter: { card: 'summary_large_image', title: name, images: [ogUrl] },
    }
  } catch {
    return {
      title: 'Tim',
      description: 'Profil tim ESI Denpasar Esport 2026',
      openGraph: {
        images: [{ url: '/api/og?title=Profil+Tim&subtitle=ESI+Denpasar+2026', width: 1200, height: 630 }],
      },
    }
  }
}

export default function TeamLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
