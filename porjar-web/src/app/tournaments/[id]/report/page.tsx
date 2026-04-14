'use client'

import { useRef } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { Trophy, ArrowLeft } from '@phosphor-icons/react'
import { PageHeader } from '@/components/shared/PageHeader'
import { Skeleton } from '@/components/ui/skeleton'
import { EmptyState } from '@/components/shared/EmptyState'
import { usePageAnimation } from '@/hooks/usePageAnimation'
import type { BracketMatch } from '@/types'
import { useTournamentReport, daysBetween } from './hooks/useTournamentReport'
import { TournamentInfoCards } from './components/TournamentInfoCards'
import { TournamentTopPlayers } from './components/TournamentTopPlayers'
import { TournamentStandingsTable } from './components/TournamentStandingsTable'
import { TournamentMatchHistory } from './components/TournamentMatchHistory'
import { TournamentStatCards } from './components/TournamentStatCards'

export default function TournamentReportPage() {
  const params = useParams<{ id: string }>()
  const { tournament, standings, matches, lobbies, teams, loading, error } =
    useTournamentReport(params.id)

  const containerRef = useRef<HTMLDivElement>(null)
  usePageAnimation(containerRef, [loading])

  // ── Loading skeleton
  if (loading) {
    return (
      <>
        <div className="space-y-6">
          <Skeleton className="h-10 w-64 bg-stone-100 dark:bg-zinc-800" />
          <Skeleton className="h-52 w-full rounded-xl bg-stone-100 dark:bg-zinc-800" />
          <div className="grid grid-cols-3 gap-4">
            <Skeleton className="h-40 rounded-xl bg-stone-100 dark:bg-zinc-800" />
            <Skeleton className="h-48 rounded-xl bg-stone-100 dark:bg-zinc-800" />
            <Skeleton className="h-40 rounded-xl bg-stone-100 dark:bg-zinc-800" />
          </div>
          <Skeleton className="h-64 w-full rounded-xl bg-stone-100 dark:bg-zinc-800" />
          <Skeleton className="h-32 w-full rounded-xl bg-stone-100 dark:bg-zinc-800" />
        </div>
      </>
    )
  }

  // ── Error / not found
  if (error || !tournament) {
    return (
      <>
        <EmptyState
          icon={Trophy}
          title={error ? 'Terjadi Kesalahan' : 'Turnamen Tidak Ditemukan'}
          description={error ?? 'Laporan turnamen tidak tersedia saat ini.'}
        />
      </>
    )
  }

  // ── Derived values
  const isBR = tournament.format === 'battle_royale_points'
  const isCompleted = tournament.status === 'completed'
  const top3 = standings.slice(0, 3)
  const top10 = standings.slice(0, 10)

  // Bracket: completed matches only, most recent first, max 10
  const completedMatches = matches
    .filter((m) => m.status === 'completed')
    .sort((a, b) => {
      const tA = a.completed_at ? new Date(a.completed_at).getTime() : 0
      const tB = b.completed_at ? new Date(b.completed_at).getTime() : 0
      return tB - tA
    })
    .slice(0, 10)

  // Group completed matches by round
  const matchesByRound = completedMatches.reduce<Record<number, BracketMatch[]>>((acc, m) => {
    if (!acc[m.round]) acc[m.round] = []
    acc[m.round].push(m)
    return acc
  }, {})
  const roundKeys = Object.keys(matchesByRound)
    .map(Number)
    .sort((a, b) => b - a) // most recent round first

  // BR lobbies grouped by day
  const lobbyDays = [...new Set(lobbies.map((l) => l.day_number))].sort((a, b) => a - b)

  // Stats
  const totalKills = standings.reduce((sum, s) => sum + s.total_kills, 0)
  const totalMatches = isBR
    ? lobbies.filter((l) => l.status === 'completed').length
    : completedMatches.length
  const eventDays = daysBetween(tournament.start_date, tournament.end_date)

  return (
    <>
      <PageHeader
        title="Laporan Turnamen"
        breadcrumbs={[
          { label: 'Turnamen', href: '/tournaments' },
          { label: tournament.name, href: `/tournaments/${tournament.id}` },
          { label: 'Laporan' },
        ]}
        actions={
          <Link
            href={`/tournaments/${tournament.id}`}
            className="inline-flex items-center gap-1.5 rounded-lg border border-stone-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 py-2 text-sm font-medium text-stone-600 dark:text-zinc-400 shadow-sm transition-colors hover:bg-stone-50 dark:hover:bg-zinc-800 dark:bg-zinc-800/50 hover:text-stone-900 dark:hover:text-zinc-100 dark:text-zinc-100"
          >
            <ArrowLeft size={15} />
            Kembali
          </Link>
        }
      />

      <div ref={containerRef} className="space-y-8">
        <TournamentInfoCards tournament={tournament} isCompleted={isCompleted} />

        <TournamentTopPlayers top3={top3} isBR={isBR} />

        <TournamentStandingsTable
          tournamentId={tournament.id}
          standings={standings}
          top10={top10}
          isBR={isBR}
        />

        <TournamentMatchHistory
          tournamentId={tournament.id}
          isBR={isBR}
          lobbies={lobbies}
          lobbyDays={lobbyDays}
          matches={matches}
          completedMatches={completedMatches}
          matchesByRound={matchesByRound}
          roundKeys={roundKeys}
        />

        <TournamentStatCards
          tournament={tournament}
          isBR={isBR}
          totalMatches={totalMatches}
          totalKills={totalKills}
          teamsCount={teams.length}
          eventDays={eventDays}
        />

        {/* ── Footer link ─────────────────────────────────────────────────── */}
        <div className="anim-fade pb-4 text-center">
          <Link
            href={`/tournaments/${tournament.id}`}
            className="inline-flex items-center gap-2 text-sm font-medium text-stone-500 dark:text-zinc-400 transition-colors hover:text-esi-red"
          >
            <ArrowLeft size={14} />
            Kembali ke halaman turnamen
          </Link>
        </div>
      </div>
    </>
  )
}
