import type { Metadata } from 'next'
import { PublicLayout } from '@/components/layouts/PublicLayout'
import { TournamentTabNav } from '@/components/modules/tournament/TournamentTabNav'

type Props = {
  params: Promise<{ id: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params

  try {
    // Server-side fetch needs Docker internal URL (localhost doesn't work inside container)
    const publicUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080/api/v1'
    const apiUrl = process.env.API_URL || publicUrl.replace('://localhost:', '://api:')
    const res = await fetch(`${apiUrl}/tournaments/${id}`, { next: { revalidate: 300 } })
    if (!res.ok) throw new Error('Not found')
    const body = await res.json()
    const tournament = body.data ?? body

    const gameName = tournament.game?.name ?? 'ESI Denpasar'
    const description = `Turnamen ${tournament.name} - ${gameName} ESI Denpasar 2026`
    const ogUrl = `/api/og?title=${encodeURIComponent(tournament.name)}&subtitle=${encodeURIComponent(gameName)}&type=bracket`

    return {
      title: tournament.name,
      description,
      openGraph: {
        title: tournament.name,
        description,
        images: [{ url: ogUrl, width: 1200, height: 630 }],
      },
      twitter: { card: 'summary_large_image', title: tournament.name, description, images: [ogUrl] },
    }
  } catch (err) {
    console.error('Gagal memuat metadata turnamen:', err)
    return {
      title: 'Turnamen',
      description: 'Detail turnamen ESI Denpasar Esport 2026',
    }
  }
}

export default async function TournamentLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  return (
    <PublicLayout>
      <TournamentTabNav tournamentId={id} />
      {children}
    </PublicLayout>
  )
}
