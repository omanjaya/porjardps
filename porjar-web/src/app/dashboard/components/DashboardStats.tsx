'use client'

import Link from 'next/link'
import { Medal } from '@phosphor-icons/react'
import { AnimatedCard } from '@/components/shared/AnimatedCard'
import type { Standing } from '@/types'

export function DashboardStats({
  myStanding,
  totalTeams,
  tournamentId,
}: {
  myStanding: Standing | null
  totalTeams: number
  tournamentId?: string
}) {
  if (!myStanding || totalTeams <= 0) return null

  return (
    <AnimatedCard delay={150}>
      <div className="rounded-xl border border-esi-border bg-white dark:bg-zinc-900 p-3 sm:p-5 shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <h2 className="flex items-center gap-2 text-base font-bold text-esi-text">
            <Medal size={18} weight="bold" className="text-amber-500" />
            Peringkat Tim
          </h2>
          {tournamentId && (
            <Link
              href="/dashboard/tournament"
              className="text-xs font-semibold text-esi-red hover:underline"
            >
              Lihat Bracket
            </Link>
          )}
        </div>
        <div className="rounded-lg border border-esi-border bg-esi-bg p-4">
          <div className="flex items-center gap-3">
            <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl font-bold text-lg ${
              myStanding.rank_position === 1
                ? 'bg-amber-100 dark:bg-amber-900/50 text-amber-700 dark:text-amber-300'
                : myStanding.rank_position === 2
                ? 'bg-stone-200 dark:bg-zinc-700 text-stone-700 dark:text-zinc-300'
                : myStanding.rank_position === 3
                ? 'bg-orange-100 text-orange-700'
                : 'bg-esi-red/10 text-esi-red'
            }`}>
              #{myStanding.rank_position}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-bold text-esi-text">
                Peringkat #{myStanding.rank_position} dari {totalTeams} tim
              </p>
              <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-esi-muted">
                <span>
                  <span className="font-semibold text-green-600">{myStanding.wins}W</span>
                  {' / '}
                  <span className="font-semibold text-red-600">{myStanding.losses}L</span>
                </span>
                <span>{myStanding.matches_played} match dimainkan</span>
                {myStanding.is_eliminated && (
                  <span className="rounded-full bg-red-50 dark:bg-red-950/30 px-2 py-0.5 text-[10px] font-semibold text-red-600">
                    Tereliminasi
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </AnimatedCard>
  )
}
