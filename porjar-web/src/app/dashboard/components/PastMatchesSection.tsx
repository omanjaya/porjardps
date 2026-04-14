'use client'

import Link from 'next/link'
import { Trophy, CheckCircle, XCircle, CaretRight } from '@phosphor-icons/react'
import { AnimatedCard } from '@/components/shared/AnimatedCard'
import { relativeTime as formatRelativeTime } from '@/lib/relativeTime'
import type { BracketMatch } from '@/types'
import type { DashboardData } from '../hooks/useDashboardData'

export function PastMatchesSection({
  pastMatches,
  data,
}: {
  pastMatches: BracketMatch[]
  data: DashboardData
}) {
  if (pastMatches.length === 0 || !data.team) return null
  const team = data.team

  return (
    <AnimatedCard delay={300}>
      <div className="rounded-xl border border-esi-border bg-white dark:bg-zinc-900 p-3 sm:p-5 shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <h2 className="flex items-center gap-2 text-base font-bold text-esi-text">
            <Trophy size={18} weight="bold" className="text-esi-red" />
            Hasil Pertandingan Terakhir
          </h2>
          <Link
            href="/dashboard/my-matches"
            className="text-xs font-semibold text-esi-red hover:underline"
          >
            Lihat semua
          </Link>
        </div>
        <div className="space-y-2">
          {pastMatches.slice(0, 3).map((match) => {
            const isMyTeamA = match.team_a?.id === team.id
            const opponent = isMyTeamA ? match.team_b : match.team_a
            const myScore = isMyTeamA ? match.score_a : match.score_b
            const opponentScore = isMyTeamA ? match.score_b : match.score_a
            const didWin = match.winner?.id === team.id

            return (
              <Link
                key={match.id}
                href={`/matches/${match.id}`}
                target="_blank"
                rel="noopener noreferrer"
                className={`flex items-center gap-3 rounded-lg border p-3 transition-all hover:shadow-sm ${
                  didWin
                    ? 'border-green-200 dark:border-green-800/50 hover:border-green-300 dark:hover:border-green-700'
                    : 'border-red-200 dark:border-red-800/50 hover:border-red-300 dark:hover:border-red-700'
                }`}
              >
                <div
                  className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${
                    didWin ? 'bg-green-50 dark:bg-green-950/30' : 'bg-red-50 dark:bg-red-950/30'
                  }`}
                >
                  {didWin ? (
                    <CheckCircle size={18} weight="fill" className="text-green-600" />
                  ) : (
                    <XCircle size={18} weight="fill" className="text-red-600" />
                  )}
                </div>

                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-esi-text truncate">
                    vs {opponent?.name ?? 'TBD'}
                  </p>
                  <p className="text-xs text-esi-muted">
                    {match.completed_at
                      ? formatRelativeTime(match.completed_at)
                      : `R${match.round} M${match.match_number}`}
                  </p>
                </div>

                <span
                  className={`shrink-0 text-sm font-bold tabular-nums ${
                    didWin ? 'text-green-600' : 'text-red-600'
                  }`}
                >
                  {myScore}-{opponentScore}
                </span>

                <CaretRight size={14} className="shrink-0 text-stone-400 dark:text-zinc-500" />
              </Link>
            )
          })}
        </div>
      </div>
    </AnimatedCard>
  )
}

