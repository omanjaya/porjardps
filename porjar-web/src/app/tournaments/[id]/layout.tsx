import type { Metadata } from 'next'
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
    const res = await fetch(`${apiUrl}/tournaments/${id}`, { next: { revalidate: 60 } })
    if (!res.ok) throw new Error('Not found')
    const body = await res.json()
    const tournament = body.data ?? body

    return {
      title: tournament.name,
      description: `Turnamen ${tournament.name} - ${tournament.game?.name ?? 'Esport'} PORJAR Denpasar 2026`,
      openGraph: {
        images: [{ url: `/api/og?title=${encodeURIComponent(tournament.name)}&subtitle=${encodeURIComponent(tournament.game?.name ?? 'PORJAR Denpasar')}&type=bracket`, width: 1200, height: 630 }],
      },
    }
  } catch (err) {
    console.error('Gagal memuat metadata turnamen:', err)
    return {
      title: 'Turnamen',
      description: 'Detail turnamen PORJAR Denpasar Denpasar Esport 2026',
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
    <>
      <TournamentTabNav tournamentId={id} />
      {children}
    </>
  )
}
