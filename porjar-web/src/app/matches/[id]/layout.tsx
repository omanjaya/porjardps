import type { Metadata } from 'next'

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params
  const API = process.env.NEXT_PUBLIC_API_URL ?? ''
  try {
    const res = await fetch(`${API}/matches/${id}`, { next: { revalidate: 60 } })
    if (!res.ok) throw new Error()
    const body = await res.json()
    const match = body.data ?? body
    const teamA: string = match?.team_a?.name ?? match?.team1?.name ?? 'Tim 1'
    const teamB: string = match?.team_b?.name ?? match?.team2?.name ?? 'Tim 2'
    const gameName: string = match?.tournament?.game?.name ?? match?.game?.name ?? 'Esport'
    const title = `${teamA} vs ${teamB}`
    const description = `Pertandingan ${title} — ${gameName} ESI Kota Denpasar. Skor, hasil, dan galeri pertandingan.`
    const ogUrl = `/api/og?title=${encodeURIComponent(title)}&subtitle=${encodeURIComponent(gameName)}&type=bracket`
    return {
      title,
      description,
      openGraph: {
        title,
        description,
        images: [{ url: ogUrl, width: 1200, height: 630 }],
      },
      twitter: { card: 'summary_large_image', title, description, images: [ogUrl] },
    }
  } catch {
    return {
      title: 'Detail Pertandingan',
      description: 'Skor dan hasil pertandingan esport ESI Kota Denpasar.',
      openGraph: {
        images: [{ url: '/api/og?title=Detail+Pertandingan&subtitle=ESI+Denpasar', width: 1200, height: 630 }],
      },
    }
  }
}

export default function MatchDetailLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
