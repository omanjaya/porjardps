'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { CaretRight, Clock } from '@phosphor-icons/react'
import { AnimatedCard } from '@/components/shared/AnimatedCard'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { CountdownTimer } from '@/components/shared/CountdownTimer'
import { resolveMediaUrl } from '@/lib/api'
import type { DashboardData } from '../hooks/useDashboardData'

function useCountdown(targetDate: string | null | undefined): string {
  const [remaining, setRemaining] = useState('')
  useEffect(() => {
    if (!targetDate) {
      setRemaining('')
      return
    }
    function update() {
      const target = new Date(targetDate!).getTime()
      const now = Date.now()
      const diff = target - now
      if (diff <= 0) { setRemaining('Mulai sekarang'); return }
      const h = Math.floor(diff / 3600000)
      const m = Math.floor((diff % 3600000) / 60000)
      const s = Math.floor((diff % 60000) / 1000)
      if (h >= 24) { setRemaining(`${Math.floor(h / 24)} hari lagi`); return }
      if (h > 0) { setRemaining(`${h}j ${m}m lagi`); return }
      if (m > 0) { setRemaining(`${m}m ${s}s lagi`); return }
      setRemaining(`${s}s lagi`)
    }
    update()
    const id = setInterval(update, 1000)
    return () => clearInterval(id)
  }, [targetDate])
  return remaining
}

export function UpcomingTournamentsSection({ data }: { data: DashboardData }) {
  const nextMatch = data.next_match
  const showCountdown =
    !!nextMatch?.scheduled_at &&
    nextMatch.status !== 'live' &&
    nextMatch.status !== 'completed' &&
    nextMatch.status !== 'bye'
  const countdown = useCountdown(showCountdown ? nextMatch?.scheduled_at : null)
  if (!nextMatch) return null

  return (
    <AnimatedCard delay={225}>
      <div className="rounded-xl border border-esi-border bg-white dark:bg-zinc-900 shadow-sm overflow-hidden">
        <div className="bg-esi-bg px-3 sm:px-5 py-2.5 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-xs font-semibold uppercase tracking-wider text-esi-muted">
              Pertandingan Berikutnya
            </span>
            {data.team?.game_name && (
              <span className="shrink-0 rounded-full border border-esi-red/20 bg-esi-red/5 px-2 py-0.5 text-[10px] font-semibold text-esi-red">
                {data.team.game_name}
              </span>
            )}
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            {showCountdown && countdown && (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-esi-red/10 px-3 py-1 text-[11px] font-bold text-esi-red">
                <Clock size={12} weight="fill" />
                {countdown}
              </span>
            )}
            <StatusBadge status={nextMatch.status} />
          </div>
        </div>
        <div className="p-3 sm:p-5">
          <div className="flex items-center justify-center gap-2 sm:gap-6">
            <MatchTeamCard team={nextMatch.team_a} fallbackColor="bg-esi-red/10 text-esi-red" />
            <span className="shrink-0 text-lg sm:text-xl font-bold text-stone-400 dark:text-zinc-500">VS</span>
            <MatchTeamCard team={nextMatch.team_b} fallbackColor="bg-stone-100 dark:bg-zinc-800 text-stone-500 dark:text-zinc-400" />
          </div>
          {nextMatch.scheduled_at && (
            <div className="mt-4 space-y-1 text-center">
              <p className="text-sm font-semibold text-esi-text">
                {new Date(nextMatch.scheduled_at).toLocaleString('id-ID', {
                  weekday: 'long',
                  day: 'numeric',
                  month: 'long',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </p>
              <CountdownTimer
                targetDate={nextMatch.scheduled_at}
                label="Dimulai dalam"
                size="sm"
              />
            </div>
          )}
          <p className="mt-2 text-center text-xs text-esi-muted">
            R{nextMatch.round} M{nextMatch.match_number}
            {nextMatch.best_of > 1 && <> · BO{nextMatch.best_of}</>}
          </p>
          {data.team?.tournament_id && (
            <div className="mt-3 text-center">
              <Link
                href="/dashboard/tournament"
                className="inline-flex items-center gap-1 text-xs font-semibold text-esi-red hover:underline"
              >
                Lihat di Turnamen
                <CaretRight size={12} weight="bold" />
              </Link>
            </div>
          )}
        </div>
      </div>
    </AnimatedCard>
  )
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function MatchTeamCard({ team, fallbackColor }: { team?: any; fallbackColor: string }) {
  const name = (team?.name as string) ?? 'TBD'
  const logo = resolveMediaUrl((team?.school_logo_url ?? team?.logo_url) as string | undefined)

  return (
    <div className="min-w-0 flex-1 text-center">
      {logo ? (
        <img
          src={logo}
          alt={name}
          className="mx-auto mb-2 h-10 w-10 sm:h-12 sm:w-12 rounded-lg object-contain bg-white dark:bg-zinc-900 border border-stone-100 dark:border-zinc-700"
        />
      ) : (
        <div className={`mx-auto mb-2 flex h-10 w-10 sm:h-12 sm:w-12 items-center justify-center rounded-lg ${fallbackColor}`}>
          <span className="text-lg font-bold">{name.charAt(0)}</span>
        </div>
      )}
      <p className="text-xs font-semibold text-esi-text line-clamp-2 leading-tight">{name}</p>
    </div>
  )
}
