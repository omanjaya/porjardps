'use client'

import { Trophy, CalendarBlank, CheckCircle, Clock, Sword } from '@phosphor-icons/react'
import { BracketView } from '@/components/modules/bracket/BracketView'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { cn } from '@/lib/utils'
import { relativeTime } from '@/lib/relativeTime'
import type { BracketMatch, Tournament } from '@/types'

interface BracketTabProps {
  matches: BracketMatch[]
  maxRound: number
  tournament: Tournament
  liveMatchIds: string[]
  teamId: string | null
  onMatchClick: (id: string) => void
}

export function BracketTabContent({
  matches,
  maxRound,
  tournament,
  liveMatchIds,
  teamId,
  onMatchClick,
}: BracketTabProps) {
  if (matches.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 rounded-xl border border-stone-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 py-20 shadow-sm">
        <Trophy size={48} className="text-stone-300 dark:text-zinc-600" />
        <div className="text-center">
          <p className="text-stone-600 dark:text-zinc-400 font-medium">Bracket belum tersedia</p>
          <p className="text-sm text-stone-400 dark:text-zinc-500 mt-1">
            Bracket akan ditampilkan setelah panitia melakukan pengundian.
          </p>
        </div>
      </div>
    )
  }

  return (
    <BracketView
      matches={matches}
      rounds={maxRound}
      format={tournament.format as 'single_elimination' | 'double_elimination' | 'round_robin'}
      liveMatchIds={liveMatchIds}
      onMatchClick={onMatchClick}
      highlightTeamId={teamId ?? undefined}
      isAdmin={false}
    />
  )
}

interface ScheduleTabProps {
  scheduledMatches: BracketMatch[]
  teamId: string | null
  onMatchClick: (id: string) => void
}

export function ScheduleTabContent({ scheduledMatches, teamId, onMatchClick }: ScheduleTabProps) {
  if (scheduledMatches.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 rounded-xl border border-stone-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 py-20 shadow-sm">
        <CalendarBlank size={48} className="text-stone-300 dark:text-zinc-600" />
        <div className="text-center">
          <p className="text-stone-600 dark:text-zinc-400 font-medium">Belum ada jadwal</p>
          <p className="text-sm text-stone-400 dark:text-zinc-500 mt-1">
            Jadwal pertandingan akan muncul setelah panitia mengatur jadwal.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {scheduledMatches.map((m) => {
        const isMyMatch = m.team_a?.id === teamId || m.team_b?.id === teamId
        return (
          <button
            key={m.id}
            onClick={() => onMatchClick(m.id)}
            className={cn(
              'w-full rounded-xl border bg-white dark:bg-zinc-900 p-4 shadow-sm text-left transition-all hover:shadow-md',
              isMyMatch
                ? 'border-esi-red/30 bg-esi-red/[0.02]'
                : 'border-stone-200 dark:border-zinc-700 hover:border-stone-300 dark:hover:border-zinc-600'
            )}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-stone-400 dark:text-zinc-500">
                Round {m.round} - Match #{m.match_number}
              </span>
              <StatusBadge status={m.status} />
            </div>
            <div className="flex items-center gap-4">
              <div className="flex-1 min-w-0">
                <p
                  className={cn(
                    'text-sm font-semibold truncate',
                    m.team_a?.id === teamId
                      ? 'text-esi-red'
                      : 'text-stone-900 dark:text-zinc-100'
                  )}
                >
                  {m.team_a?.name ?? 'TBD'}
                </p>
              </div>
              <span className="flex-shrink-0 text-xs font-bold text-stone-400 dark:text-zinc-500">
                VS
              </span>
              <div className="flex-1 min-w-0 text-right">
                <p
                  className={cn(
                    'text-sm font-semibold truncate',
                    m.team_b?.id === teamId
                      ? 'text-esi-red'
                      : 'text-stone-900 dark:text-zinc-100'
                  )}
                >
                  {m.team_b?.name ?? 'TBD'}
                </p>
              </div>
            </div>
            {m.scheduled_at && (
              <div className="mt-2 flex items-center gap-1.5 text-xs text-stone-500 dark:text-zinc-400">
                <Clock size={12} />
                <span>
                  {new Date(m.scheduled_at).toLocaleDateString('id-ID', {
                    weekday: 'short',
                    day: 'numeric',
                    month: 'short',
                  })}{' '}
                  {new Date(m.scheduled_at).toLocaleTimeString('id-ID', {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </span>
              </div>
            )}
            {isMyMatch && (
              <div className="mt-2">
                <span className="inline-flex items-center gap-1 rounded-full bg-esi-red/10 px-2 py-0.5 text-[10px] font-semibold text-esi-red">
                  <Sword size={10} />
                  Pertandingan kamu
                </span>
              </div>
            )}
          </button>
        )
      })}
    </div>
  )
}

interface ResultsTabProps {
  completedMatches: BracketMatch[]
  onMatchClick: (id: string) => void
}

export function ResultsTabContent({ completedMatches, onMatchClick }: ResultsTabProps) {
  if (completedMatches.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 rounded-xl border border-stone-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 py-20 shadow-sm">
        <CheckCircle size={48} className="text-stone-300 dark:text-zinc-600" />
        <div className="text-center">
          <p className="text-stone-600 dark:text-zinc-400 font-medium">Belum ada hasil pertandingan</p>
          <p className="text-sm text-stone-400 dark:text-zinc-500 mt-1">
            Hasil akan muncul setelah pertandingan selesai.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      {completedMatches.map((m) => {
        const aWon = m.winner?.id === m.team_a?.id
        const bWon = m.winner?.id === m.team_b?.id
        return (
          <button
            key={m.id}
            onClick={() => onMatchClick(m.id)}
            className="w-full rounded-xl border border-stone-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-4 py-3 shadow-sm text-left transition-all hover:shadow-md hover:border-stone-300 dark:hover:border-zinc-600"
          >
            <div className="flex items-center gap-3">
              <div className="flex-1 min-w-0 flex items-center gap-1.5">
                {aWon && (
                  <CheckCircle size={16} weight="fill" className="flex-shrink-0 text-green-500" />
                )}
                <span
                  className={cn(
                    'text-sm font-semibold truncate',
                    aWon ? 'text-green-600' : 'text-stone-400 dark:text-zinc-500'
                  )}
                >
                  {m.team_a?.name ?? 'TBD'}
                </span>
              </div>

              <div className="flex-shrink-0 flex items-center gap-1">
                <span
                  className={cn(
                    'text-sm font-bold tabular-nums',
                    aWon ? 'text-green-600' : 'text-stone-400 dark:text-zinc-500'
                  )}
                >
                  {m.score_a}
                </span>
                <span className="text-xs text-stone-300 dark:text-zinc-600">-</span>
                <span
                  className={cn(
                    'text-sm font-bold tabular-nums',
                    bWon ? 'text-green-600' : 'text-stone-400 dark:text-zinc-500'
                  )}
                >
                  {m.score_b}
                </span>
              </div>

              <div className="flex-1 min-w-0 flex items-center justify-end gap-1.5">
                <span
                  className={cn(
                    'text-sm font-semibold truncate',
                    bWon ? 'text-green-600' : 'text-stone-400 dark:text-zinc-500'
                  )}
                >
                  {m.team_b?.name ?? 'TBD'}
                </span>
                {bWon && (
                  <CheckCircle size={16} weight="fill" className="flex-shrink-0 text-green-500" />
                )}
              </div>
            </div>

            <div className="mt-1.5 flex items-center gap-1.5 text-[11px] text-stone-400 dark:text-zinc-500">
              <span>
                R{m.round} M{m.match_number}
              </span>
              {m.completed_at && (
                <>
                  <span>&middot;</span>
                  <span>{relativeTime(m.completed_at)}</span>
                </>
              )}
            </div>
          </button>
        )
      })}
    </div>
  )
}
