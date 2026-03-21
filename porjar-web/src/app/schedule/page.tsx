'use client'

import { useEffect, useState, useMemo, useRef } from 'react'
import { api } from '@/lib/api'
import { usePageAnimation } from '@/hooks/usePageAnimation'
import { PublicLayout } from '@/components/layouts/PublicLayout'
import { ScheduleCalendar } from '@/components/modules/schedule/ScheduleCalendar'
import { ScheduleDetailModal } from '@/components/modules/schedule/ScheduleDetailModal'
import { Skeleton } from '@/components/ui/skeleton'
import {
  List as ListIcon, CalendarDots, Lightning, CalendarBlank, Clock,
  ArrowsLeftRight, X, FunnelSimple,
} from '@phosphor-icons/react'
import { GAME_CONFIG } from '@/constants/games'
import { cn } from '@/lib/utils'
import type { Schedule, Game, GameSlug } from '@/types'

function isToday(dateStr: string): boolean {
  const d = new Date(dateStr)
  const now = new Date()
  return d.getDate() === now.getDate() && d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
}

export default function SchedulePage() {
  const [schedules, setSchedules] = useState<Schedule[]>([])
  const [games, setGames] = useState<{ slug: GameSlug; name: string }[]>([])
  const [activeGame, setActiveGame] = useState<GameSlug | null>(null)
  const [activeDay, setActiveDay] = useState<string>('all')
  const [loading, setLoading] = useState(true)
  const [viewMode, setViewMode] = useState<'timeline' | 'calendar'>('timeline')
  const [selectedSchedule, setSelectedSchedule] = useState<Schedule | null>(null)
  const dayScrollRef = useRef<HTMLDivElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    async function load() {
      try {
        const [s, g] = await Promise.all([
          api.get<Schedule[]>('/schedules?per_page=200'),
          api.get<Game[]>('/games'),
        ])
        const loaded = s ?? []
        setSchedules(loaded)
        setGames((g ?? []).filter(x => x.is_active).map(x => ({ slug: x.slug, name: x.name })))

        // Auto-select today if there are schedules today
        const hasTodaySchedule = loaded.some(sc => isToday(sc.scheduled_at))
        if (hasTodaySchedule) {
          const todayKey = new Date().toDateString()
          setActiveDay(todayKey)
          // Scroll today button into view after render
          setTimeout(() => {
            const el = dayScrollRef.current?.querySelector(`[data-day="${todayKey}"]`) as HTMLElement | null
            el?.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' })
          }, 100)
        }
      } catch {} finally { setLoading(false) }
    }
    load()
  }, [])

  const liveCount = useMemo(() => schedules.filter(s => s.status === 'ongoing').length, [schedules])
  const todayCount = useMemo(() => schedules.filter(s => isToday(s.scheduled_at)).length, [schedules])

  // Day groups with counts
  const dayGroups = useMemo(() => {
    const sorted = [...schedules].sort((a, b) => new Date(a.scheduled_at).getTime() - new Date(b.scheduled_at).getTime())
    const groups: { key: string; label: string; shortLabel: string; isToday: boolean; count: number }[] = []
    for (const s of sorted) {
      const key = new Date(s.scheduled_at).toDateString()
      const existing = groups.find(g => g.key === key)
      if (existing) { existing.count++ } else {
        const d = new Date(s.scheduled_at)
        groups.push({
          key,
          label: d.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }),
          shortLabel: d.toLocaleDateString('id-ID', { weekday: 'short', day: 'numeric', month: 'short' }),
          isToday: isToday(s.scheduled_at),
          count: 1,
        })
      }
    }
    return groups
  }, [schedules])

  const filtered = useMemo(() => {
    let result = schedules
    if (activeGame) result = result.filter(s => s.game?.slug === activeGame)
    if (activeDay !== 'all') result = result.filter(s => new Date(s.scheduled_at).toDateString() === activeDay)
    return result
  }, [schedules, activeGame, activeDay])

  usePageAnimation(containerRef, [filtered.length, loading])

  return (
    <PublicLayout>
      <div ref={containerRef}>
      {/* Header */}
      <div className="mb-5 anim-header">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-stone-900">Jadwal Pertandingan</h1>
            <div className="mt-1 flex flex-wrap items-center gap-3 text-sm text-stone-500">
              <span>{schedules.length} jadwal</span>
              {liveCount > 0 && (
                <span className="flex items-center gap-1 text-porjar-red font-semibold animate-pulse">
                  <Lightning size={14} weight="fill" />
                  {liveCount} LIVE
                </span>
              )}
              {todayCount > 0 && (
                <span className="flex items-center gap-1 text-stone-500">
                  <CalendarBlank size={14} />
                  {todayCount} hari ini
                </span>
              )}
            </div>
          </div>

          {/* View toggle — top right */}
          <div className="flex shrink-0 items-center rounded-xl border border-stone-200 bg-white p-1 shadow-sm">
            <button
              onClick={() => setViewMode('timeline')}
              className={cn(
                'flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors',
                viewMode === 'timeline' ? 'bg-porjar-red text-white' : 'text-stone-500 hover:text-stone-700'
              )}
            >
              <ListIcon size={14} />
              <span className="hidden sm:inline">Timeline</span>
            </button>
            <button
              onClick={() => setViewMode('calendar')}
              className={cn(
                'flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors',
                viewMode === 'calendar' ? 'bg-porjar-red text-white' : 'text-stone-500 hover:text-stone-700'
              )}
            >
              <CalendarDots size={14} />
              <span className="hidden sm:inline">Kalender</span>
            </button>
          </div>
        </div>
      </div>

      {/* Sticky filter section */}
      <div className="sticky top-0 z-20 -mx-4 bg-white/95 px-4 pb-3 pt-2 backdrop-blur-sm sm:-mx-6 sm:px-6 border-b border-stone-100 mb-5 shadow-sm">
        {/* Game filter — horizontal scroll on mobile */}
        <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-hide pb-0.5 mb-2.5" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
          <button
            onClick={() => setActiveGame(null)}
            className={cn(
              'shrink-0 flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold transition-all',
              !activeGame ? 'border-porjar-red bg-porjar-red text-white' : 'border-stone-200 bg-white text-stone-600 hover:border-stone-300'
            )}
          >
            Semua Game
          </button>
          {games.map(g => {
            const cfg = GAME_CONFIG[g.slug]
            return (
              <button
                key={g.slug}
                onClick={() => setActiveGame(activeGame === g.slug ? null : g.slug)}
                className={cn(
                  'shrink-0 flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold transition-all',
                  activeGame === g.slug ? 'border-porjar-red bg-porjar-red text-white' : 'border-stone-200 bg-white text-stone-600 hover:border-stone-300'
                )}
              >
                {cfg?.logo && <img src={cfg.logo} alt="" className="h-3.5 w-3.5 object-contain" />}
                {g.name}
              </button>
            )
          })}
        </div>

        {/* Clear filters button — shown when any filter is active */}
        {(activeGame || activeDay !== 'all') && (
          <div className="mb-2 flex items-center gap-2">
            <span className="flex items-center gap-1 text-[11px] text-stone-500">
              <FunnelSimple size={11} />
              Filter aktif
            </span>
            <button
              onClick={() => { setActiveGame(null); setActiveDay('all') }}
              className="flex items-center gap-1 rounded-full border border-stone-200 bg-white px-2.5 py-1 text-[11px] font-semibold text-stone-600 transition hover:border-stone-300 hover:bg-stone-50"
            >
              <X size={10} weight="bold" />
              Reset Filter
            </button>
          </div>
        )}

        {/* Day filter — horizontal scroll on mobile, no wrap */}
        <div
          ref={dayScrollRef}
          className="flex items-center gap-1.5 overflow-x-auto scrollbar-hide pb-0.5"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
          <button
            data-day="all"
            onClick={() => setActiveDay('all')}
            className={cn(
              'shrink-0 rounded-full border px-3 py-1.5 text-xs font-semibold transition-all',
              activeDay === 'all' ? 'border-stone-900 bg-stone-900 text-white' : 'border-stone-200 bg-white text-stone-600 hover:border-stone-300'
            )}
          >
            Semua Hari
          </button>
          {dayGroups.map(g => (
            <button
              key={g.key}
              data-day={g.key}
              onClick={() => setActiveDay(activeDay === g.key ? 'all' : g.key)}
              className={cn(
                'shrink-0 flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold transition-all',
                activeDay === g.key
                  ? g.isToday ? 'border-porjar-red bg-porjar-red text-white shadow-sm shadow-porjar-red/20' : 'border-stone-900 bg-stone-900 text-white'
                  : g.isToday ? 'border-porjar-red/50 bg-porjar-red/5 text-porjar-red font-bold' : 'border-stone-200 bg-white text-stone-600 hover:border-stone-300'
              )}
            >
              {g.shortLabel}
              {/* "Hari Ini" badge */}
              {g.isToday && (
                <span className={cn(
                  'rounded-full px-1.5 py-0.5 text-[9px] font-bold leading-none uppercase tracking-wide',
                  activeDay === g.key ? 'bg-white/25 text-white' : 'bg-porjar-red text-white'
                )}>
                  Hari Ini
                </span>
              )}
              {/* count badge */}
              <span className={cn(
                'rounded-full px-1.5 py-0.5 text-[10px] font-bold leading-none',
                activeDay === g.key ? 'bg-white/20 text-white' : 'bg-stone-100 text-stone-500'
              )}>
                {g.count}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-20 rounded-xl bg-stone-100" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-stone-200 bg-white py-20 text-center px-6">
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-stone-50 border border-stone-100">
            <CalendarBlank size={32} weight="thin" className="text-stone-300" />
          </div>
          <p className="text-sm font-semibold text-stone-700">Tidak ada pertandingan dijadwalkan</p>
          <p className="mt-1.5 text-xs text-stone-400 max-w-xs leading-relaxed">
            {activeGame && activeDay !== 'all'
              ? 'Tidak ada pertandingan untuk game dan hari yang dipilih. Coba ubah kombinasi filter.'
              : activeGame
              ? 'Tidak ada pertandingan untuk game ini. Coba pilih game lain atau tampilkan semua.'
              : activeDay !== 'all'
              ? 'Tidak ada pertandingan di hari ini. Coba pilih hari lain atau tampilkan semua hari.'
              : 'Belum ada jadwal pertandingan yang ditambahkan.'}
          </p>
          {(activeGame || activeDay !== 'all') && (
            <button
              onClick={() => { setActiveGame(null); setActiveDay('all') }}
              className="mt-4 flex items-center gap-1.5 rounded-full border border-stone-200 bg-white px-4 py-2 text-xs font-semibold text-stone-600 transition hover:border-porjar-red/30 hover:bg-porjar-red/5 hover:text-porjar-red"
            >
              <X size={11} weight="bold" />
              Reset Semua Filter
            </button>
          )}
        </div>
      ) : viewMode === 'calendar' ? (
        <div className="rounded-xl border border-stone-200 bg-white p-4 shadow-sm">
          <ScheduleCalendar schedules={filtered} onScheduleClick={setSelectedSchedule} />
        </div>
      ) : (
        <div className="space-y-8">
          {(() => {
            const sorted = [...filtered].sort((a, b) => new Date(a.scheduled_at).getTime() - new Date(b.scheduled_at).getTime())
            const groups: { key: string; label: string; isToday: boolean; items: Schedule[] }[] = []
            for (const s of sorted) {
              const key = new Date(s.scheduled_at).toDateString()
              const existing = groups.find(g => g.key === key)
              if (existing) { existing.items.push(s) } else {
                const d = new Date(s.scheduled_at)
                groups.push({
                  key,
                  label: d.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }),
                  isToday: isToday(s.scheduled_at),
                  items: [s],
                })
              }
            }
            return groups.map(group => (
              <div key={group.key}>
                {/* Day header */}
                <div className="mb-3 flex items-center gap-3">
                  <div className={cn(
                    'rounded-xl px-3 py-1.5 text-xs font-bold',
                    group.isToday ? 'bg-porjar-red text-white' : 'bg-stone-100 text-stone-700'
                  )}>
                    {group.label}
                    {group.isToday && ' — Hari Ini'}
                  </div>
                  <span className="text-xs text-stone-400">{group.items.length} jadwal</span>
                  <div className="flex-1 border-t border-stone-100" />
                </div>

                {/* Schedule cards */}
                <div className="space-y-2">
                  {group.items.map(s => {
                    const gSlug = s.game?.slug as GameSlug | undefined
                    const gCfg = gSlug ? GAME_CONFIG[gSlug] : null
                    const time = new Date(s.scheduled_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })
                    const endTime = s.end_at ? new Date(s.end_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) : null
                    const hasTeams = s.team_a || s.team_b
                    const isLive = s.status === 'ongoing'
                    const isDone = s.status === 'completed'
                    const isPostponed = s.status === 'postponed' || s.status === 'cancelled'

                    return (
                      <button
                        key={s.id}
                        onClick={() => setSelectedSchedule(s)}
                        className={cn(
                          'anim-list-item group w-full text-left rounded-xl border bg-white transition-all hover:shadow-md',
                          isLive
                            ? 'border-porjar-red/30 ring-1 ring-porjar-red/20 hover:border-porjar-red/50'
                            : isDone
                            ? 'border-stone-100 opacity-70 hover:opacity-100'
                            : isPostponed
                            ? 'border-stone-200 opacity-60 hover:opacity-100'
                            : 'border-stone-200 hover:border-stone-300'
                        )}
                      >
                        <div className="flex items-stretch">
                          {/* Left: game color stripe + logo */}
                          <div className={cn(
                            'flex w-10 sm:w-14 shrink-0 flex-col items-center justify-center gap-1 rounded-l-xl py-3',
                            gCfg ? gCfg.bgColor : 'bg-stone-50'
                          )}>
                            {gCfg ? (
                              <img src={gCfg.logo} alt="" className="h-5 w-5 sm:h-7 sm:w-7 object-contain" />
                            ) : (
                              <CalendarBlank size={18} className="text-stone-400" />
                            )}
                          </div>

                          {/* Right: content */}
                          <div className="flex min-w-0 flex-1 items-center gap-2 sm:gap-3 px-3 sm:px-4 py-3">
                            {/* Time block */}
                            <div className="w-12 sm:w-16 shrink-0 text-center">
                              <p className={cn(
                                'text-xs sm:text-sm font-bold tabular-nums',
                                isLive ? 'text-porjar-red' : 'text-stone-900'
                              )}>
                                {time}
                              </p>
                              {endTime && (
                                <p className="text-[10px] text-stone-400 tabular-nums mt-0.5 hidden sm:block">{endTime}</p>
                              )}
                            </div>

                            {/* Vertical divider */}
                            <div className={cn('h-8 w-px shrink-0', isLive ? 'bg-porjar-red/30' : 'bg-stone-100')} />

                            {/* Info */}
                            <div className="min-w-0 flex-1">
                              {hasTeams ? (
                                /* Show team matchup */
                                <>
                                  <div className="flex items-center gap-1.5">
                                    <span className="truncate text-xs sm:text-sm font-semibold text-stone-900">
                                      {s.team_a?.name ?? 'TBD'}
                                    </span>
                                    <ArrowsLeftRight size={10} className="shrink-0 text-stone-400" weight="bold" />
                                    <span className="truncate text-xs sm:text-sm font-semibold text-stone-900">
                                      {s.team_b?.name ?? 'TBD'}
                                    </span>
                                  </div>
                                  <div className="mt-0.5 flex items-center gap-2 text-[10px] sm:text-xs text-stone-400">
                                    <span className="truncate">{s.title}</span>
                                    {s.venue && (
                                      <>
                                        <span className="hidden sm:inline text-stone-200">·</span>
                                        <span className="hidden sm:inline shrink-0">{s.venue}</span>
                                      </>
                                    )}
                                  </div>
                                </>
                              ) : (
                                /* No teams yet — show title + venue */
                                <>
                                  <p className="text-xs sm:text-sm font-semibold text-stone-900 truncate">{s.title}</p>
                                  <div className="mt-0.5 flex items-center gap-2 text-[10px] sm:text-xs text-stone-400">
                                    {s.venue && <span className="hidden sm:inline truncate">{s.venue}</span>}
                                    {s.venue && s.tournament && <span className="hidden sm:inline text-stone-200">·</span>}
                                    {s.tournament && <span className="truncate">{s.tournament.name}</span>}
                                  </div>
                                </>
                              )}
                            </div>

                            {/* Status badge */}
                            <div className="shrink-0">
                              {isLive ? (
                                <span className="flex items-center gap-1 rounded-full bg-porjar-red px-2 py-1 text-[10px] font-bold text-white">
                                  <span className="h-1.5 w-1.5 rounded-full bg-white animate-ping" />
                                  LIVE
                                </span>
                              ) : isDone ? (
                                <span className="hidden sm:inline rounded-full bg-stone-100 px-2.5 py-1 text-[10px] font-semibold text-stone-400">
                                  Selesai
                                </span>
                              ) : isPostponed ? (
                                <span className="rounded-full bg-amber-50 border border-amber-200 px-2 py-1 text-[10px] font-semibold text-amber-600">
                                  {s.status === 'cancelled' ? 'Batal' : 'Tunda'}
                                </span>
                              ) : (
                                <Clock size={13} className="text-stone-300 group-hover:text-stone-400 transition-colors" />
                              )}
                            </div>
                          </div>
                        </div>
                      </button>
                    )
                  })}
                </div>
              </div>
            ))
          })()}
        </div>
      )}

      <ScheduleDetailModal schedule={selectedSchedule} onClose={() => setSelectedSchedule(null)} />
      </div>
    </PublicLayout>
  )
}
