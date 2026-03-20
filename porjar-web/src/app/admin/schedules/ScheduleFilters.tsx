'use client'

import {
  CalendarDots,
  List as ListIcon,
  Timer,
} from '@phosphor-icons/react'
import { cn } from '@/lib/utils'
import type { Tournament } from '@/types'

interface DayGroup {
  dateKey: string
  dayNum: number
  label: string
  isToday: boolean
  schedules: { id: string }[]
}

interface ScheduleFiltersProps {
  tournaments: Tournament[]
  filterTournament: string
  setFilterTournament: (value: string) => void
  filterDay: string
  setFilterDay: (value: string) => void
  dayGroups: DayGroup[]
  viewMode: 'timeline' | 'list' | 'calendar'
  setViewMode: (mode: 'timeline' | 'list' | 'calendar') => void
  setPage?: (page: number) => void
}

export function ScheduleFilters({
  tournaments,
  filterTournament,
  setFilterTournament,
  filterDay,
  setFilterDay,
  dayGroups,
  viewMode,
  setViewMode,
  setPage,
}: ScheduleFiltersProps) {
  return (
    <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      {/* Tournament filter */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs font-semibold uppercase tracking-wider text-stone-400">Turnamen</span>
        <div className="flex flex-wrap gap-1.5">
          <button
            onClick={() => { setFilterTournament(''); setPage?.(1) }}
            className={cn(
              'rounded-lg border px-3 py-1.5 text-xs font-semibold transition-colors',
              !filterTournament
                ? 'border-porjar-red bg-porjar-red text-white'
                : 'border-stone-200 text-stone-600 hover:bg-stone-50'
            )}
          >
            Semua
          </button>
          {tournaments.map((t) => (
            <button
              key={t.id}
              onClick={() => { setFilterTournament(filterTournament === t.id ? '' : t.id); setPage?.(1) }}
              className={cn(
                'rounded-lg border px-3 py-1.5 text-xs font-semibold transition-colors',
                filterTournament === t.id
                  ? 'border-porjar-red bg-porjar-red text-white'
                  : 'border-stone-200 text-stone-600 hover:bg-stone-50'
              )}
            >
              {t.name}
            </button>
          ))}
        </div>
      </div>

      {/* Day filter */}
      {dayGroups.length > 1 && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-semibold uppercase tracking-wider text-stone-400">Hari</span>
          <div className="flex flex-wrap gap-1">
            <button
              onClick={() => setFilterDay('all')}
              className={cn(
                'rounded-lg border px-3 py-1.5 text-xs font-semibold transition-colors',
                filterDay === 'all'
                  ? 'border-porjar-red bg-porjar-red text-white'
                  : 'border-stone-200 text-stone-600 hover:bg-stone-50'
              )}
            >
              Semua
            </button>
            {dayGroups.map((g) => (
              <button
                key={g.dayNum}
                onClick={() => setFilterDay(filterDay === String(g.dayNum) ? 'all' : String(g.dayNum))}
                className={cn(
                  'rounded-lg border px-3 py-1.5 text-xs font-semibold transition-colors',
                  filterDay === String(g.dayNum)
                    ? 'border-porjar-red bg-porjar-red text-white'
                    : 'border-stone-200 text-stone-600 hover:bg-stone-50'
                )}
              >
                Day {g.dayNum}
                <span className="ml-1 opacity-70">({g.schedules.length})</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* View mode toggle */}
      <div className="flex items-center gap-1 rounded-lg bg-stone-100 p-1 w-fit shrink-0">
        <button
          onClick={() => setViewMode('timeline')}
          className={cn(
            'flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
            viewMode === 'timeline' ? 'bg-porjar-red text-white' : 'text-stone-500 hover:text-stone-900'
          )}
        >
          <Timer size={16} />
          Timeline
        </button>
        <button
          onClick={() => setViewMode('list')}
          className={cn(
            'flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
            viewMode === 'list' ? 'bg-porjar-red text-white' : 'text-stone-500 hover:text-stone-900'
          )}
        >
          <ListIcon size={16} />
          List
        </button>
        <button
          onClick={() => setViewMode('calendar')}
          className={cn(
            'flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
            viewMode === 'calendar' ? 'bg-porjar-red text-white' : 'text-stone-500 hover:text-stone-900'
          )}
        >
          <CalendarDots size={16} />
          Kalender
        </button>
      </div>
    </div>
  )
}
