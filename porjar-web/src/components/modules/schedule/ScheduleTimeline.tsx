'use client'

import { useMemo } from 'react'
import { CalendarBlank, Clock, MapPin, GameController } from '@phosphor-icons/react'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { GAME_CONFIG } from '@/constants/games'
import { cn } from '@/lib/utils'
import type { Schedule, GameSlug } from '@/types'

interface ScheduleTimelineProps {
  schedules: Schedule[]
  filterGame?: GameSlug | null
  highlightToday?: boolean
  onScheduleClick?: (schedule: Schedule) => void
}

function formatDateLabel(dateStr: string): string {
  const date = new Date(dateStr)
  const today = new Date()
  const tomorrow = new Date()
  tomorrow.setDate(tomorrow.getDate() + 1)

  if (date.toDateString() === today.toDateString()) return 'Hari Ini'
  if (date.toDateString() === tomorrow.toDateString()) return 'Besok'

  return date.toLocaleDateString('id-ID', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

function getDateKey(dateStr: string): string {
  return new Date(dateStr).toISOString().split('T')[0]
}

/** Group items in a single day by tournament/round label */
function getRoundLabel(schedule: Schedule): string | null {
  const title = schedule.title ?? ''
  // Look for common round patterns in the title
  const roundMatch = title.match(/(Round|Babak|Final|Semifinal|Quarterfinal|Group|Grup)\s*[\w\s]*/i)
  return roundMatch ? roundMatch[0].trim() : null
}

export function ScheduleTimeline({
  schedules,
  filterGame,
  highlightToday = true,
  onScheduleClick,
}: ScheduleTimelineProps) {
  const grouped = useMemo(() => {
    if (!schedules || !Array.isArray(schedules)) return []
    const filtered = filterGame
      ? schedules.filter((s) => s.game?.slug === filterGame)
      : schedules

    const groups: Record<string, Schedule[]> = {}
    for (const schedule of filtered) {
      const key = getDateKey(schedule.scheduled_at)
      if (!groups[key]) groups[key] = []
      groups[key].push(schedule)
    }

    return Object.entries(groups)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([dateKey, items]) => ({
        dateKey,
        label: formatDateLabel(items[0].scheduled_at),
        isToday: getDateKey(new Date().toISOString()) === dateKey,
        items: items.sort(
          (a, b) =>
            new Date(a.scheduled_at).getTime() - new Date(b.scheduled_at).getTime()
        ),
      }))
  }, [schedules, filterGame])

  return (
    <div className="space-y-10">
      {grouped.map((group, groupIdx) => (
        <div
          key={group.dateKey}
          className="animate-in fade-in slide-in-from-bottom-4 duration-500 fill-mode-both"
          style={{ animationDelay: `${groupIdx * 80}ms` }}
        >
          {/* Date header */}
          <div className="mb-4 flex items-center gap-3">
            {/* Today: prominent left-border highlight */}
            {highlightToday && group.isToday && (
              <span className="inline-flex items-center gap-1 rounded-full bg-porjar-red px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-widest text-white shadow-sm shadow-red-200 animate-in fade-in duration-300">
                <span className="h-1.5 w-1.5 rounded-full bg-white/70 animate-pulse" />
                Hari Ini
              </span>
            )}

            <div
              className={cn(
                'shrink-0 rounded-full px-3 py-1 text-xs font-bold uppercase tracking-widest',
                highlightToday && group.isToday
                  ? 'bg-red-50 text-porjar-red'
                  : 'bg-stone-100 text-stone-500'
              )}
            >
              {group.label}
            </div>

            <div
              className={cn(
                'h-px flex-1',
                highlightToday && group.isToday ? 'bg-porjar-red/20' : 'bg-stone-100'
              )}
            />
            <span className="text-xs text-stone-400 tabular-nums">
              {group.items.length} pertandingan
            </span>
          </div>

          {/* Today highlight bar */}
          {highlightToday && group.isToday && (
            <div className="mb-4 rounded-xl border-l-4 border-porjar-red bg-red-50/60 px-4 py-2.5">
              <p className="text-[11px] font-medium text-porjar-red">
                Pertandingan hari ini — jadwal bisa berubah, pantau terus!
              </p>
            </div>
          )}

          {/* Cards — with round separators */}
          <DayScheduleItems
            items={group.items}
            groupIdx={groupIdx}
            onScheduleClick={onScheduleClick}
          />
        </div>
      ))}

      {grouped.length === 0 && (
        <EmptyScheduleState hasFilter={!!filterGame} />
      )}
    </div>
  )
}

// ─── Day schedule items with round separators ────────────────────────────────

interface DayScheduleItemsProps {
  items: Schedule[]
  groupIdx: number
  onScheduleClick?: (schedule: Schedule) => void
}

function DayScheduleItems({ items, groupIdx, onScheduleClick }: DayScheduleItemsProps) {
  // Group items by tournament for visual separators
  const tournamentGroups = useMemo(() => {
    const seen: string[] = []
    const result: { tournamentKey: string; label: string | null; items: Schedule[] }[] = []

    for (const s of items) {
      const key = s.tournament?.id ?? '__none__'
      const existing = result.find((g) => g.tournamentKey === key)
      if (existing) {
        existing.items.push(s)
      } else {
        result.push({
          tournamentKey: key,
          label: s.tournament?.name ?? null,
          items: [s],
        })
        seen.push(key)
      }
    }
    return result
  }, [items])

  const hasMultipleTournaments = tournamentGroups.length > 1

  return (
    <div className="space-y-5">
      {tournamentGroups.map((tGroup, tIdx) => (
        <div key={tGroup.tournamentKey}>
          {/* Tournament separator — only shown when there are multiple tournaments */}
          {hasMultipleTournaments && tGroup.label && (
            <div className="mb-3 flex items-center gap-2">
              <div className="h-px flex-1 bg-stone-100" />
              <span className="rounded-full border border-stone-200 bg-stone-50 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-widest text-stone-400">
                {tGroup.label}
              </span>
              <div className="h-px flex-1 bg-stone-100" />
            </div>
          )}

          <div className="space-y-3">
            {tGroup.items.map((schedule, itemIdx) => {
              const gameSlug = schedule.game?.slug as GameSlug | undefined
              const gameConfig = gameSlug ? GAME_CONFIG[gameSlug] : null
              const isOngoing = schedule.status === 'ongoing'

              return (
                <button
                  key={schedule.id}
                  onClick={() => onScheduleClick?.(schedule)}
                  disabled={!onScheduleClick}
                  className={cn(
                    'group relative w-full overflow-hidden rounded-2xl border bg-white text-left',
                    'transition-all duration-200',
                    onScheduleClick && 'hover:-translate-y-0.5 hover:shadow-lg cursor-pointer',
                    isOngoing
                      ? 'border-porjar-red/30 shadow-md shadow-red-100'
                      : 'border-stone-200 shadow-sm',
                    'animate-in fade-in slide-in-from-left-2 duration-300 fill-mode-both'
                  )}
                  style={{ animationDelay: `${groupIdx * 80 + (tIdx * tGroup.items.length + itemIdx) * 60}ms` }}
                >
                  {/* Game background art — subtle overlay */}
                  {gameConfig?.bgImage && (
                    <div
                      className="pointer-events-none absolute inset-0 bg-cover bg-right opacity-[0.04] transition-opacity duration-300 group-hover:opacity-[0.07]"
                      style={{ backgroundImage: `url(${gameConfig.bgImage})` }}
                    />
                  )}

                  {/* Ongoing glow pulse */}
                  {isOngoing && (
                    <div className="pointer-events-none absolute inset-0 rounded-2xl ring-2 ring-porjar-red/20 animate-pulse" />
                  )}

                  <div className="relative flex items-stretch">
                    {/* Left game color stripe */}
                    <div
                      className={cn(
                        'w-1 shrink-0 rounded-l-2xl transition-all duration-200 group-hover:w-1.5',
                        gameConfig?.stripeBg ?? 'bg-stone-300'
                      )}
                    />

                    {/* Game logo block */}
                    <div className="flex shrink-0 items-center px-3 py-4">
                      <div
                        className={cn(
                          'flex h-11 w-11 items-center justify-center rounded-xl transition-transform duration-200 group-hover:scale-105',
                          gameConfig ? gameConfig.bgColor : 'bg-stone-100'
                        )}
                      >
                        {gameConfig ? (
                          <img
                            src={gameConfig.logo}
                            alt={schedule.game?.name ?? ''}
                            className="h-7 w-7 rounded-lg object-contain"
                          />
                        ) : (
                          <GameController size={18} weight="fill" className="text-stone-400" />
                        )}
                      </div>
                    </div>

                    {/* Time column */}
                    <div className="flex w-20 shrink-0 flex-col justify-center gap-0.5 border-r border-stone-100 py-4 pr-3">
                      <div className="flex items-center gap-1">
                        <Clock size={11} className="text-stone-400 shrink-0" />
                        <span className="text-sm font-semibold text-stone-700 tabular-nums leading-none">
                          {new Date(schedule.scheduled_at).toLocaleTimeString('id-ID', {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                      </div>
                      {schedule.end_at && (
                        <span className="pl-[15px] text-[11px] tabular-nums text-stone-400 leading-none">
                          {'– '}
                          {new Date(schedule.end_at).toLocaleTimeString('id-ID', {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                      )}
                    </div>

                    {/* Main content */}
                    <div className="min-w-0 flex-1 px-4 py-4">
                      {/* Game name pill + title */}
                      <div className="mb-1 flex items-center gap-2 flex-wrap">
                        {gameConfig && (
                          <span
                            className={cn(
                              'inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide',
                              gameConfig.bgColor,
                              gameConfig.color
                            )}
                          >
                            {schedule.game?.name}
                          </span>
                        )}
                        {/* Show tournament name if no multi-tournament separator above */}
                        {!hasMultipleTournaments && schedule.tournament && (
                          <span className="inline-flex shrink-0 items-center rounded-full border border-stone-200 bg-stone-50 px-2 py-0.5 text-[10px] text-stone-500">
                            {schedule.tournament.name}
                          </span>
                        )}
                      </div>
                      <p className="truncate text-sm font-semibold text-stone-900 leading-snug">
                        {schedule.title}
                      </p>

                      {/* Teams */}
                      {schedule.team_a && schedule.team_b ? (
                        <div className="mt-1.5 flex items-center gap-2">
                          <span className="truncate text-xs font-medium text-stone-700 max-w-[35%]">
                            {schedule.team_a.school_name ?? schedule.team_a.name}
                          </span>
                          <span className="shrink-0 rounded px-1.5 py-0.5 text-[10px] font-black uppercase tracking-widest text-stone-400 bg-stone-100">
                            vs
                          </span>
                          <span className="truncate text-xs font-medium text-stone-700 max-w-[35%]">
                            {schedule.team_b.school_name ?? schedule.team_b.name}
                          </span>
                        </div>
                      ) : schedule.tournament && hasMultipleTournaments ? null : schedule.tournament ? (
                        <p className="mt-1 truncate text-xs text-stone-400">
                          {schedule.tournament.name}
                        </p>
                      ) : null}

                      {/* Venue */}
                      {schedule.venue && (
                        <div className="mt-1.5 flex items-center gap-1 text-[11px] text-stone-400">
                          <MapPin size={11} />
                          <span>{schedule.venue}</span>
                        </div>
                      )}
                    </div>

                    {/* Right: status + live indicator */}
                    <div className="flex shrink-0 flex-col items-end justify-center gap-2 pr-4 py-4">
                      <StatusBadge status={schedule.status} />
                      {isOngoing && (
                        <span className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-porjar-red">
                          <span className="h-1.5 w-1.5 rounded-full bg-porjar-red animate-pulse" />
                          LIVE
                        </span>
                      )}
                    </div>
                  </div>
                </button>
              )
            })}
          </div>
        </div>
      ))}
    </div>
  )
}

// ─── Empty state ──────────────────────────────────────────────────────────────

function EmptyScheduleState({ hasFilter }: { hasFilter: boolean }) {
  return (
    <div className="animate-in fade-in duration-500 flex flex-col items-center justify-center rounded-2xl border border-stone-100 bg-stone-50 py-20 text-center">
      <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl border border-stone-200 bg-white shadow-sm">
        <CalendarBlank size={32} weight="thin" className="text-stone-300" />
      </div>
      <p className="text-sm font-semibold text-stone-600">
        {hasFilter ? 'Tidak ada jadwal untuk cabang ini' : 'Belum ada jadwal tersedia'}
      </p>
      <p className="mt-1.5 max-w-xs text-xs text-stone-400 leading-relaxed">
        {hasFilter
          ? 'Coba pilih cabang e-sport lain atau hapus filter untuk melihat semua jadwal.'
          : 'Jadwal pertandingan akan muncul di sini setelah panitia mempublikasikan jadwal resmi.'}
      </p>
    </div>
  )
}
