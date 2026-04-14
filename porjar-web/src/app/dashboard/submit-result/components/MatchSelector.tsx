'use client'

import Link from 'next/link'
import { Trophy, GameController, CalendarBlank, CaretRight } from '@phosphor-icons/react'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'
import type { ActiveMatch } from '../hooks/useActiveMatches'

interface Props {
  matches: ActiveMatch[]
  loading: boolean
  onSelect: (m: ActiveMatch) => void
}

export function MatchSelector({ matches, loading, onSelect }: Props) {
  return (
    <div className="mb-4 sm:mb-6">
      <h2 className="mb-3 flex items-center gap-2 text-base font-bold uppercase tracking-wide text-esi-text">
        <Trophy size={18} weight="fill" className="text-esi-red" />
        Pertandingan Aktif
      </h2>

      {loading ? (
        <div className="grid gap-3 sm:grid-cols-2">
          {Array.from({ length: 2 }).map((_, i) => (
            <Skeleton key={i} className="h-28 rounded-xl bg-esi-border" />
          ))}
        </div>
      ) : matches.length > 0 ? (
        <div className="grid gap-3 sm:grid-cols-2">
          {matches.map(match => (
            <button
              key={match.id}
              onClick={() => onSelect(match)}
              className="group min-h-[88px] active:scale-[0.99] rounded-xl border border-stone-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 p-4 text-left shadow-sm transition-all hover:border-esi-red/30 hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-esi-red/40"
            >
              <div className="mb-2 flex items-center gap-2">
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-esi-red/10">
                  <GameController size={14} weight="duotone" className="text-esi-red" />
                </div>
                <span className="text-xs font-semibold uppercase tracking-wider text-esi-muted">
                  {match.game_name}
                </span>
                <span className={cn(
                  '-skew-x-2 rounded px-1.5 py-0.5 text-[10px] font-bold uppercase',
                  match.type === 'bracket'
                    ? 'bg-blue-100 dark:bg-blue-950/30 text-blue-700 dark:text-blue-400'
                    : match.type === 'group'
                      ? 'bg-teal-100 dark:bg-teal-950/30 text-teal-700 dark:text-teal-400'
                      : 'bg-orange-100 dark:bg-orange-950/30 text-orange-700 dark:text-orange-400'
                )}>
                  {match.type === 'bracket' ? 'Bracket' : match.type === 'group' ? 'Grup' : 'BR'}
                </span>
                {match.best_of && match.best_of > 1 && (
                  <span className="rounded bg-stone-100 dark:bg-zinc-800 px-1.5 py-0.5 text-[10px] font-bold text-stone-500 dark:text-zinc-500">
                    BO{match.best_of}
                  </span>
                )}
              </div>
              {match.type === 'bracket' || match.type === 'group' ? (
                <div className="text-sm font-semibold text-esi-text">
                  <p className="truncate">{match.team_a_name}</p>
                  <p className="text-xs font-medium text-esi-muted">vs <span className="font-semibold text-esi-text">{match.team_b_name}</span></p>
                </div>
              ) : (
                <div>
                  <p className="text-sm font-semibold text-esi-text">
                    {match.lobby_name ?? 'Lobby'}
                  </p>
                  {(match.num_maps ?? 1) > 1 && (
                    <p className="mt-0.5 text-xs font-semibold text-blue-600 dark:text-blue-400">
                      Map {match.current_map ?? 1} / {match.num_maps}
                    </p>
                  )}
                </div>
              )}
              <p className="mt-1 inline-flex items-center gap-1 text-xs text-esi-red font-semibold group-hover:underline">
                Kirim hasil <CaretRight size={12} weight="bold" />
              </p>
            </button>
          ))}
        </div>
      ) : (
        <div className="rounded-xl border border-stone-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 p-8 text-center shadow-sm">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-esi-red/10">
            <GameController size={36} weight="duotone" className="text-esi-red" />
          </div>
          <p className="text-base font-semibold text-esi-text">Belum ada match</p>
          <p className="mt-1 text-sm text-esi-muted">Pertandingan kamu belum dijadwalkan atau belum dimulai.</p>
          <Link
            href="/schedule"
            className="mt-4 inline-flex min-h-[48px] items-center gap-2 rounded-lg bg-esi-red px-5 py-3 text-sm font-semibold text-white shadow-sm hover:brightness-110"
          >
            <CalendarBlank size={18} weight="fill" />
            Cek Jadwal
          </Link>
        </div>
      )}
    </div>
  )
}
