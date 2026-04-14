'use client'

import { useState, useMemo } from 'react'
import { Trophy, Coffee, ClockCountdown, Star, Megaphone, ListNumbers } from '@phosphor-icons/react'
import { cn } from '@/lib/utils'
import { PublicLayout } from '@/components/layouts/PublicLayout'
import {
  RUNDOWN_DAYS,
  GAME_LABELS,
  GAME_COLORS,
  LEVEL_COLORS,
  type RundownEvent,
} from '@/constants/rundown'

type LevelFilter = 'ALL' | 'SD' | 'SMP' | 'SMA'

function matchesFilter(level: RundownEvent['level'], filter: LevelFilter): boolean {
  if (filter === 'ALL') return true
  if (level === null || level === 'ALL') return true
  if (level === filter) return true
  if (level === 'SMP & SMA' && (filter === 'SMP' || filter === 'SMA')) return true
  return false
}

export default function RundownPage() {
  const [selectedDay, setSelectedDay] = useState(0)
  const [levelFilter, setLevelFilter] = useState<LevelFilter>('ALL')

  const day = RUNDOWN_DAYS[selectedDay]

  const filteredEvents = useMemo(
    () => day.events.filter(ev => matchesFilter(ev.level, levelFilter)),
    [day, levelFilter],
  )

  const competitionCount = useMemo(
    () => filteredEvents.filter(e => e.type === 'competition').length,
    [filteredEvents],
  )

  return (
    <PublicLayout>
      {/* Header */}
      <div className="mb-5">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-esi-red/10">
            <ListNumbers className="h-5 w-5 text-esi-red" weight="bold" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-stone-900 dark:text-zinc-100">Rundown Pertandingan</h1>
            <p className="mt-0.5 text-sm text-stone-500 dark:text-zinc-400">
              ESI 2026 · 26–31 Maret 2026 · Denpasar
            </p>
          </div>
        </div>
      </div>

      {/* Sticky filters */}
      <div className="sticky top-0 z-20 -mx-4 mb-5 border-b border-stone-100 bg-white/95 px-4 pb-3 pt-2 shadow-sm backdrop-blur-sm dark:border-zinc-800 dark:bg-zinc-900/95 sm:-mx-6 sm:px-6">
        {/* Day pills */}
        <div
          className="mb-2.5 flex gap-1.5 overflow-x-auto pb-0.5"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
          {RUNDOWN_DAYS.map((d, i) => {
            const isToday = d.dateISO === new Date().toISOString().slice(0, 10)
            return (
              <button
                key={d.dateISO}
                onClick={() => setSelectedDay(i)}
                className={cn(
                  'flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold transition-all',
                  selectedDay === i
                    ? 'border-esi-red bg-esi-red text-white shadow-sm shadow-esi-red/20'
                    : isToday
                    ? 'border-esi-red/40 bg-esi-red/5 text-esi-red'
                    : 'border-stone-200 bg-white text-stone-600 hover:border-stone-300 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-400 dark:hover:border-zinc-600',
                )}
              >
                {d.shortLabel}
                {isToday && (
                  <span className={cn(
                    'rounded-full px-1.5 py-0.5 text-[9px] font-bold uppercase leading-none tracking-wide',
                    selectedDay === i ? 'bg-white/25 text-white' : 'bg-esi-red text-white',
                  )}>
                    Hari Ini
                  </span>
                )}
              </button>
            )
          })}
        </div>

        {/* Level filter */}
        <div className="flex items-center gap-1.5">
          <span className="shrink-0 text-[11px] text-stone-400 dark:text-zinc-500">Tingkat:</span>
          {(['ALL', 'SD', 'SMP', 'SMA'] as LevelFilter[]).map(f => (
            <button
              key={f}
              onClick={() => setLevelFilter(f)}
              className={cn(
                'rounded-full border px-3 py-1 text-xs font-semibold transition-all',
                levelFilter === f
                  ? 'border-stone-900 bg-stone-900 text-white dark:border-zinc-200 dark:bg-zinc-100 dark:text-zinc-900'
                  : 'border-stone-200 bg-white text-stone-600 hover:border-stone-300 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-400 dark:hover:border-zinc-600',
              )}
            >
              {f === 'ALL' ? 'Semua' : f}
            </button>
          ))}
        </div>
      </div>

      {/* Day label + count */}
      <div className="mb-3 flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-wide text-stone-500 dark:text-zinc-400">
          {day.dateLabel}
        </p>
        {competitionCount > 0 && (
          <span className="flex items-center gap-1 text-xs text-stone-400 dark:text-zinc-500">
            <Trophy className="h-3.5 w-3.5 text-esi-red" weight="fill" />
            {competitionCount} pertandingan
          </span>
        )}
      </div>

      {/* Event list */}
      {filteredEvents.length === 0 ? (
        <div className="rounded-xl border border-dashed border-stone-200 py-12 text-center text-sm text-stone-400 dark:border-zinc-700 dark:text-zinc-500">
          Tidak ada acara untuk filter ini
        </div>
      ) : (
        <div className="space-y-1.5">
          {filteredEvents.map((ev, i) => (
            <EventRow key={i} event={ev} />
          ))}
        </div>
      )}

      {/* Legend */}
      <div className="mt-6 flex flex-wrap items-center gap-x-4 gap-y-1.5 border-t border-stone-100 pt-4 text-xs text-stone-400 dark:border-zinc-800 dark:text-zinc-500">
        <span className="font-medium">Keterangan:</span>
        <span className="flex items-center gap-1"><Trophy className="h-3.5 w-3.5 text-esi-red" weight="fill" /> Pertandingan</span>
        <span className="flex items-center gap-1"><Star className="h-3.5 w-3.5 text-yellow-500" weight="fill" /> Pembukaan/Ceremony</span>
        <span className="flex items-center gap-1"><ClockCountdown className="h-3.5 w-3.5" /> Registrasi</span>
        <span className="flex items-center gap-1"><Coffee className="h-3.5 w-3.5" /> Break</span>
      </div>
    </PublicLayout>
  )
}

function EventRow({ event }: { event: RundownEvent }) {
  const isCompetition = event.type === 'competition'
  const isHighlight = event.type === 'opening' || event.type === 'ceremony'

  return (
    <div
      className={cn(
        'flex gap-3 rounded-xl border px-4 py-3 transition-colors',
        isCompetition
          ? 'border-stone-200 bg-white shadow-sm dark:border-zinc-700/60 dark:bg-zinc-900'
          : isHighlight
          ? 'border-yellow-200/60 bg-yellow-50/50 dark:border-yellow-900/30 dark:bg-yellow-900/10'
          : 'border-transparent bg-stone-100/60 dark:bg-zinc-900/40',
      )}
    >
      {/* Match number or icon */}
      <div className="flex w-8 shrink-0 items-start justify-center pt-0.5">
        {isCompetition ? (
          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-esi-red/10 text-xs font-bold text-esi-red">
            {event.matchNo}
          </div>
        ) : (
          <div className="mt-0.5">
            {event.type === 'opening' || event.type === 'ceremony'
              ? <Megaphone className="h-4 w-4 text-yellow-500" weight="fill" />
              : event.type === 'registration'
              ? <ClockCountdown className="h-4 w-4 text-stone-400 dark:text-zinc-500" />
              : <Coffee className="h-4 w-4 text-stone-400 dark:text-zinc-500" />
            }
          </div>
        )}
      </div>

      {/* Content */}
      <div className="min-w-0 flex-1">
        <p className={cn(
          'text-sm font-semibold leading-snug',
          isCompetition || isHighlight
            ? 'text-stone-900 dark:text-zinc-100'
            : 'text-stone-500 dark:text-zinc-500',
        )}>
          {event.title}
        </p>

        <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
          <span className="text-xs text-stone-400 dark:text-zinc-500">{event.time}</span>

          {event.level && event.level !== 'ALL' && (
            <span className={cn(
              'rounded border px-1.5 py-0.5 text-[10px] font-bold uppercase leading-none',
              LEVEL_COLORS[event.level] ?? 'border-stone-200 bg-stone-100 text-stone-500',
            )}>
              {event.level}
            </span>
          )}
          {event.level === 'ALL' && (
            <span className="rounded border border-stone-200 bg-stone-100 px-1.5 py-0.5 text-[10px] font-bold uppercase leading-none text-stone-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-400">
              ALL
            </span>
          )}

          {event.game && (
            <span className={cn(
              'rounded border px-1.5 py-0.5 text-[10px] font-semibold leading-none',
              GAME_COLORS[event.game],
            )}>
              {GAME_LABELS[event.game] ?? event.game}
            </span>
          )}

          {event.arena && (
            <span className="rounded border border-stone-200 bg-stone-50 px-1.5 py-0.5 text-[10px] text-stone-400 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-500">
              Arena {event.arena}
            </span>
          )}
        </div>
      </div>
    </div>
  )
}
