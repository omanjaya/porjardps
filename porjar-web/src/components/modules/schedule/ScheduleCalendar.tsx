'use client'

import { useState, useMemo } from 'react'
import { CaretLeft, CaretRight, X } from '@phosphor-icons/react'
import { Button } from '@/components/ui/button'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { GAME_CONFIG } from '@/constants/games'
import { cn } from '@/lib/utils'
import type { Schedule, GameSlug } from '@/types'

interface ScheduleCalendarProps {
  schedules: Schedule[]
  onDateClick?: (date: Date) => void
  onScheduleClick?: (schedule: Schedule) => void
}

const DAY_LABELS = ['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min']

const MONTH_NAMES = [
  'Januari',
  'Februari',
  'Maret',
  'April',
  'Mei',
  'Juni',
  'Juli',
  'Agustus',
  'September',
  'Oktober',
  'November',
  'Desember',
]

function getDateKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

function getGameDotClass(slug?: GameSlug | null): string {
  if (!slug) return 'bg-stone-400'
  switch (slug) {
    case 'hok':
      return 'bg-amber-400'
    case 'ml':
      return 'bg-blue-400'
    case 'ff':
      return 'bg-orange-400'
    case 'pubgm':
      return 'bg-yellow-400'
    case 'efootball':
      return 'bg-green-400'
    default:
      return 'bg-stone-400'
  }
}

export function ScheduleCalendar({
  schedules,
  onDateClick,
  onScheduleClick,
}: ScheduleCalendarProps) {
  const today = new Date()
  const [currentMonth, setCurrentMonth] = useState(today.getMonth())
  const [currentYear, setCurrentYear] = useState(today.getFullYear())
  const [selectedDate, setSelectedDate] = useState<string | null>(null)

  // Group schedules by date
  const schedulesByDate = useMemo(() => {
    const map: Record<string, Schedule[]> = {}
    for (const schedule of schedules) {
      const key = getDateKey(new Date(schedule.scheduled_at))
      if (!map[key]) map[key] = []
      map[key].push(schedule)
    }
    return map
  }, [schedules])

  // Check if any schedule on a date is live
  const liveDates = useMemo(() => {
    const set = new Set<string>()
    for (const schedule of schedules) {
      if (schedule.status === 'ongoing') {
        set.add(getDateKey(new Date(schedule.scheduled_at)))
      }
    }
    return set
  }, [schedules])

  // Build calendar grid
  const calendarDays = useMemo(() => {
    const firstDay = new Date(currentYear, currentMonth, 1)
    const lastDay = new Date(currentYear, currentMonth + 1, 0)

    // Monday = 0, Sunday = 6 (shifted from JS getDay where Sunday = 0)
    let startDow = firstDay.getDay() - 1
    if (startDow < 0) startDow = 6

    const days: { date: Date; isCurrentMonth: boolean }[] = []

    // Previous month filler days
    for (let i = startDow - 1; i >= 0; i--) {
      const d = new Date(currentYear, currentMonth, -i)
      days.push({ date: d, isCurrentMonth: false })
    }

    // Current month days
    for (let d = 1; d <= lastDay.getDate(); d++) {
      days.push({ date: new Date(currentYear, currentMonth, d), isCurrentMonth: true })
    }

    // Next month filler days to complete last row
    const remaining = 7 - (days.length % 7)
    if (remaining < 7) {
      for (let i = 1; i <= remaining; i++) {
        days.push({
          date: new Date(currentYear, currentMonth + 1, i),
          isCurrentMonth: false,
        })
      }
    }

    return days
  }, [currentMonth, currentYear])

  function prevMonth() {
    if (currentMonth === 0) {
      setCurrentMonth(11)
      setCurrentYear((y) => y - 1)
    } else {
      setCurrentMonth((m) => m - 1)
    }
    setSelectedDate(null)
  }

  function nextMonth() {
    if (currentMonth === 11) {
      setCurrentMonth(0)
      setCurrentYear((y) => y + 1)
    } else {
      setCurrentMonth((m) => m + 1)
    }
    setSelectedDate(null)
  }

  function handleDateClick(date: Date, isCurrentMonth: boolean) {
    if (!isCurrentMonth) return
    const key = getDateKey(date)
    setSelectedDate((prev) => (prev === key ? null : key))
    onDateClick?.(date)
  }

  const todayKey = getDateKey(today)
  const selectedSchedules = selectedDate ? schedulesByDate[selectedDate] ?? [] : []

  return (
    <div className="space-y-4">
      {/* Month navigation */}
      <div className="flex items-center justify-between">
        <Button
          size="sm"
          variant="ghost"
          onClick={prevMonth}
          className="text-stone-500 hover:text-stone-700"
        >
          <CaretLeft size={18} />
        </Button>
        <h3 className="text-base font-semibold text-stone-900">
          {MONTH_NAMES[currentMonth]} {currentYear}
        </h3>
        <Button
          size="sm"
          variant="ghost"
          onClick={nextMonth}
          className="text-stone-500 hover:text-stone-700"
        >
          <CaretRight size={18} />
        </Button>
      </div>

      {/* Day headers */}
      <div className="grid grid-cols-7 gap-1">
        {DAY_LABELS.map((day) => (
          <div
            key={day}
            className="py-2 text-center text-xs font-semibold uppercase tracking-wider text-stone-400"
          >
            {day}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7 gap-1">
        {calendarDays.map((dayInfo, idx) => {
          const key = getDateKey(dayInfo.date)
          const daySchedules = schedulesByDate[key] ?? []
          const isToday = key === todayKey
          const isSelected = key === selectedDate
          const hasLive = liveDates.has(key)
          const matchCount = daySchedules.length

          return (
            <button
              key={idx}
              onClick={() => handleDateClick(dayInfo.date, dayInfo.isCurrentMonth)}
              disabled={!dayInfo.isCurrentMonth}
              className={cn(
                'relative flex min-h-[72px] flex-col items-center rounded-lg border p-1.5 text-sm transition-all',
                dayInfo.isCurrentMonth
                  ? 'bg-white border-stone-200 hover:bg-stone-50 cursor-pointer'
                  : 'bg-stone-50 border-transparent text-stone-300 cursor-default',
                isToday && 'ring-2 ring-porjar-red/60',
                isSelected && 'bg-red-50/50 border-porjar-red/40'
              )}
            >
              {/* Date number */}
              <span
                className={cn(
                  'text-xs font-medium',
                  dayInfo.isCurrentMonth ? 'text-stone-700' : 'text-stone-300',
                  isToday && 'text-porjar-red font-bold'
                )}
              >
                {dayInfo.date.getDate()}
              </span>

              {/* Schedule dots */}
              {matchCount > 0 && dayInfo.isCurrentMonth && (
                <div className="mt-1 flex flex-wrap items-center justify-center gap-0.5">
                  {matchCount <= 3 ? (
                    daySchedules.map((s, i) => (
                      <span
                        key={i}
                        className={cn(
                          'h-1.5 w-1.5 rounded-full',
                          getGameDotClass(s.game?.slug as GameSlug | undefined)
                        )}
                      />
                    ))
                  ) : (
                    <>
                      {daySchedules.slice(0, 2).map((s, i) => (
                        <span
                          key={i}
                          className={cn(
                            'h-1.5 w-1.5 rounded-full',
                            getGameDotClass(s.game?.slug as GameSlug | undefined)
                          )}
                        />
                      ))}
                      <span className="ml-0.5 text-[9px] font-bold text-stone-400">
                        +{matchCount - 2}
                      </span>
                    </>
                  )}
                </div>
              )}

              {/* Live indicator */}
              {hasLive && dayInfo.isCurrentMonth && (
                <span className="absolute top-1 right-1 h-2 w-2 rounded-full bg-porjar-red animate-pulse" />
              )}
            </button>
          )
        })}
      </div>

      {/* Selected date detail panel */}
      {selectedDate && (
        <div className="rounded-xl border border-stone-200 bg-white p-4 shadow-sm">
          <div className="mb-3 flex items-center justify-between">
            <h4 className="text-sm font-semibold text-stone-900">
              {new Date(selectedDate + 'T00:00:00').toLocaleDateString('id-ID', {
                weekday: 'long',
                day: 'numeric',
                month: 'long',
                year: 'numeric',
              })}
            </h4>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setSelectedDate(null)}
              className="h-6 w-6 p-0 text-stone-400 hover:text-stone-600"
            >
              <X size={14} />
            </Button>
          </div>

          {selectedSchedules.length === 0 ? (
            <p className="text-xs text-stone-400">Tidak ada jadwal pada tanggal ini.</p>
          ) : (
            <div className="space-y-2">
              {selectedSchedules.map((schedule) => {
                const gameSlug = schedule.game?.slug as GameSlug | undefined
                const gameConfig = gameSlug ? GAME_CONFIG[gameSlug] : null

                return (
                  <button
                    key={schedule.id}
                    onClick={() => onScheduleClick?.(schedule)}
                    className={cn(
                      'flex w-full items-center gap-3 rounded-lg border px-3 py-2 text-left transition-colors hover:bg-stone-50',
                      schedule.status === 'ongoing'
                        ? 'border-porjar-red/40'
                        : 'border-stone-200'
                    )}
                  >
                    {/* Game dot */}
                    <span
                      className={cn(
                        'h-2.5 w-2.5 flex-shrink-0 rounded-full',
                        getGameDotClass(gameSlug)
                      )}
                    />

                    {/* Info */}
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-stone-900">
                        {schedule.title}
                      </p>
                      {schedule.team_a && schedule.team_b ? (
                        <p className="truncate text-xs text-stone-500 font-medium">
                          {schedule.team_a.school_name ?? schedule.team_a.name}
                          {' '}
                          <span className="text-stone-300">vs</span>
                          {' '}
                          {schedule.team_b.school_name ?? schedule.team_b.name}
                        </p>
                      ) : (
                        <p className="text-xs text-stone-400">
                          {new Date(schedule.scheduled_at).toLocaleTimeString('id-ID', {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                          {schedule.end_at &&
                            ` – ${new Date(schedule.end_at).toLocaleTimeString('id-ID', {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}`}
                          {schedule.venue && ` · ${schedule.venue}`}
                        </p>
                      )}
                    </div>

                    {/* Status */}
                    <StatusBadge status={schedule.status} />
                  </button>
                )
              })}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
