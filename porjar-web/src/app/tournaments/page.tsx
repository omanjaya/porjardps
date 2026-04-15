import type { Metadata } from 'next'
import { PublicLayout } from '@/components/layouts/PublicLayout'
import { PageHeader } from '@/components/shared/PageHeader'
import { TournamentsClient } from './TournamentsClient'
import type { Tournament, Game, GameSlug, ApiResponse } from '@/types'

// Revalidate cached data every 60 seconds (ISR)
export const revalidate = 60

export const metadata: Metadata = {
  title: 'Turnamen Esport',
  description: 'Daftar semua turnamen esport pelajar ESI Kota Denpasar — Mobile Legends, Free Fire, PUBG Mobile, eFootball, Honor of Kings.',
  keywords: ['turnamen esport denpasar', 'bracket esport pelajar', 'ml tournament denpasar', 'ff tournament bali'],
  openGraph: {
    title: 'Turnamen Esport | ESI Denpasar',
    description: 'Daftar semua turnamen esport pelajar ESI Kota Denpasar — Mobile Legends, Free Fire, PUBG Mobile, eFootball, Honor of Kings.',
    images: [{ url: '/api/og?title=Turnamen+Esport&subtitle=ESI+Denpasar', width: 1200, height: 630 }],
  },
  alternates: { canonical: 'https://esidenpasar.com/tournaments' },
}

async function fetchTournaments(): Promise<Tournament[]> {
  const apiUrl = process.env.API_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:9090/api/v1'
  try {
    const res = await fetch(`${apiUrl}/tournaments?per_page=100`, {
      next: { revalidate: 60 },
    })
    if (!res.ok) return []
    const body: ApiResponse<Tournament[]> = await res.json()
    return body.success ? (body.data ?? []) : []
  } catch {
    return []
  }
}

async function fetchGames(): Promise<{ slug: GameSlug; name: string }[]> {
  const apiUrl = process.env.API_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:9090/api/v1'
  try {
    const res = await fetch(`${apiUrl}/games`, {
      next: { revalidate: 60 },
    })
    if (!res.ok) return []
    const body: ApiResponse<Game[]> = await res.json()
    if (!body.success) return []
    return (body.data ?? [])
      .filter((g) => g.is_active)
      .map((g) => ({ slug: g.slug, name: g.name }))
  } catch {
    return []
  }
}

export default async function TournamentsPage() {
  const [tournaments, games] = await Promise.all([fetchTournaments(), fetchGames()])

  return (
    <PublicLayout>
      <PageHeader
        title="Turnamen"
        description="Semua turnamen ESI Esport Kota Denpasar 2026"
      />
      <TournamentsClient initialTournaments={tournaments} initialGames={games} />
    </PublicLayout>
  )
}
