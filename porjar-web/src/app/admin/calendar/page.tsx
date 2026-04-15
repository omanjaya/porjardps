'use client'

import { useEffect, useState, useCallback, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { api } from '@/lib/api'
import { useAuthStore } from '@/store/auth-store'
import { PageHeader } from '@/components/shared/PageHeader'
import { EmptyState } from '@/components/shared/EmptyState'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet'
import {
  CalendarBlank,
  CaretLeft,
  CaretRight,
  Trophy,
  Buildings,
  ArrowSquareOut,
  GameController,
} from '@phosphor-icons/react'
import Link from 'next/link'
import { cn } from '@/lib/utils'

// ═══════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════

interface CalendarEvent {
  id: string
  name: string
  slug: string
  status: string
  organizer: string | null
  start_date: string
  end_date: string
  registration_start: string | null
  registration_end: string | null
  primary_color: string
  logo_url: string | null
  tournaments: { id: string; name: string; game_name: string; status: string }[]
}

interface CalendarResponse {
  year: number
  month: number
  events: CalendarEvent[]
}

type ViewMode = 'monthly' | 'weekly' | 'daily'

// ═══════════════════════════════════════════════
// Constants
// ═══════════════════════════════════════════════

const DAYS_SHORT = ['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min']
const DAYS_FULL = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu', 'Minggu']
const MONTHS_ID = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
]

// ═══════════════════════════════════════════════
// Helpers
// ═══════════════════════════════════════════════

function parseLocalDate(dateStr: string): Date {
  // Parse only the date portion as local midnight to avoid UTC-offset shifting days
  const datePart = dateStr.split('T')[0]
  const [year, month, day] = datePart.split('-').map(Number)
  return new Date(year, month - 1, day)
}

function toDateKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

/** Returns Monday=0 ... Sunday=6 index for a JS Date (JS uses 0=Sun) */
function getMondayBasedDay(date: Date): number {
  return (date.getDay() + 6) % 7
}

/** Get the Monday of the week containing a given date */
function getWeekStart(date: Date): Date {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  const dayOffset = getMondayBasedDay(d)
  d.setDate(d.getDate() - dayOffset)
  return d
}

function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
  return result
    ? { r: parseInt(result[1], 16), g: parseInt(result[2], 16), b: parseInt(result[3], 16) }
    : null
}

function eventBgStyle(color: string, opacity = 0.15): React.CSSProperties {
  const rgb = hexToRgb(color)
  if (!rgb) return { backgroundColor: color }
  return { backgroundColor: `rgba(${rgb.r},${rgb.g},${rgb.b},${opacity})`, borderColor: color }
}

function formatDateRange(start: string, end: string): string {
  const s = parseLocalDate(start)
  const e = parseLocalDate(end)
  const fmt = (d: Date) => d.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })
  if (s.toDateString() === e.toDateString()) return fmt(s)
  return `${fmt(s)} – ${fmt(e)}`
}

// ═══════════════════════════════════════════════
// EventBlock
// ═══════════════════════════════════════════════

function EventBlock({
  event,
  compact = false,
  onClick,
}: {
  event: CalendarEvent
  compact?: boolean
  onClick: (e: CalendarEvent) => void
}) {
  return (
    <button
      onClick={() => onClick(event)}
      className={cn(
        'w-full text-left rounded border px-1.5 transition-all hover:brightness-95 active:scale-[0.98] focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-1',
        compact ? 'py-0.5 text-[11px] leading-tight' : 'py-1 text-xs',
      )}
      style={eventBgStyle(event.primary_color || '#C41E2A')}
      title={event.name}
    >
      <span
        className="block truncate font-medium"
        style={{ color: event.primary_color || '#C41E2A' }}
      >
        {event.name}
      </span>
      {!compact && event.organizer && (
        <span className="block truncate text-stone-500 dark:text-zinc-400 text-[10px]">
          {event.organizer}
        </span>
      )}
    </button>
  )
}

// ═══════════════════════════════════════════════
// EventDetailSheet
// ═══════════════════════════════════════════════

function EventDetailSheet({
  event,
  open,
  onClose,
}: {
  event: CalendarEvent | null
  open: boolean
  onClose: () => void
}) {
  if (!event) return null

  return (
    <Sheet open={open} onOpenChange={(o) => { if (!o) onClose() }}>
      <SheetContent side="right" className="w-full sm:max-w-md overflow-y-auto p-0">
        {/* Colored header strip */}
        <div
          className="h-2 rounded-t w-full"
          style={{ backgroundColor: event.primary_color || '#C41E2A' }}
        />
        <SheetHeader className="px-5 pt-4 pb-2">
          <SheetTitle className="text-base font-bold leading-snug">
            {event.name}
          </SheetTitle>
          <SheetDescription className="text-xs text-stone-500 dark:text-zinc-400">
            {formatDateRange(event.start_date, event.end_date)}
          </SheetDescription>
          <div className="mt-1">
            <StatusBadge status={event.status} />
          </div>
        </SheetHeader>

        <div className="px-5 space-y-5 pb-8">
          {/* Organizer */}
          {event.organizer && (
            <div className="flex items-start gap-2">
              <Buildings size={16} className="mt-0.5 shrink-0 text-stone-400" />
              <div>
                <p className="text-xs font-medium text-stone-500 dark:text-zinc-400 uppercase tracking-wide">Penyelenggara</p>
                <p className="text-sm font-medium text-stone-900 dark:text-zinc-100">{event.organizer}</p>
              </div>
            </div>
          )}

          {/* Registration period */}
          {(event.registration_start || event.registration_end) && (
            <div className="flex items-start gap-2">
              <CalendarBlank size={16} className="mt-0.5 shrink-0 text-stone-400" />
              <div>
                <p className="text-xs font-medium text-stone-500 dark:text-zinc-400 uppercase tracking-wide">Pendaftaran</p>
                <p className="text-sm text-stone-700 dark:text-zinc-300">
                  {event.registration_start && event.registration_end
                    ? formatDateRange(event.registration_start, event.registration_end)
                    : event.registration_start
                      ? `Mulai ${parseLocalDate(event.registration_start).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}`
                      : `Hingga ${parseLocalDate(event.registration_end!).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}`
                  }
                </p>
              </div>
            </div>
          )}

          {/* Tournaments */}
          {event.tournaments && event.tournaments.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Trophy size={16} className="shrink-0 text-stone-400" />
                <p className="text-xs font-medium text-stone-500 dark:text-zinc-400 uppercase tracking-wide">
                  Turnamen ({event.tournaments.length})
                </p>
              </div>
              <ul className="space-y-2">
                {event.tournaments.map((t) => (
                  <li
                    key={t.id}
                    className="flex items-center justify-between gap-2 rounded-lg border border-stone-200 dark:border-zinc-700 px-3 py-2 bg-stone-50 dark:bg-zinc-800/50"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-stone-900 dark:text-zinc-100 truncate">{t.name}</p>
                      <div className="flex items-center gap-1 mt-0.5">
                        <GameController size={12} className="text-stone-400 shrink-0" />
                        <span className="text-xs text-stone-500 dark:text-zinc-400 truncate">{t.game_name}</span>
                      </div>
                    </div>
                    <StatusBadge status={t.status} />
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* No tournaments */}
          {(!event.tournaments || event.tournaments.length === 0) && (
            <div className="flex items-center gap-2 text-sm text-stone-400 dark:text-zinc-500">
              <Trophy size={16} />
              <span>Belum ada turnamen</span>
            </div>
          )}

          {/* Links to event management */}
          <div className="pt-2 flex flex-wrap gap-2">
            <Link href={`/admin/events/${event.id}/sections`}>
              <Button variant="outline" size="sm" className="gap-1.5 text-xs">
                <ArrowSquareOut size={14} />
                Sections
              </Button>
            </Link>
            <Link href={`/admin/events/${event.id}/admins`}>
              <Button variant="outline" size="sm" className="gap-1.5 text-xs">
                <ArrowSquareOut size={14} />
                Admins
              </Button>
            </Link>
            <Link href={`/admin/events`}>
              <Button variant="outline" size="sm" className="gap-1.5 text-xs">
                <ArrowSquareOut size={14} />
                Semua Event
              </Button>
            </Link>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}

// ═══════════════════════════════════════════════
// Monthly View
// ═══════════════════════════════════════════════

function MonthlyView({
  year,
  month,
  events,
  onEventClick,
}: {
  year: number
  month: number // 1-based
  events: CalendarEvent[]
  onEventClick: (e: CalendarEvent) => void
}) {
  const today = new Date()

  // Build grid: pad with nulls for days before the 1st (Mon-based)
  const firstDay = new Date(year, month - 1, 1)
  const lastDay = new Date(year, month, 0)
  const startOffset = getMondayBasedDay(firstDay) // 0-6
  const totalDays = lastDay.getDate()

  // Pre-fill prev-month tail days + current month days + next-month leading days
  const cells: (Date | null)[] = []
  for (let i = 0; i < startOffset; i++) {
    const d = new Date(firstDay)
    d.setDate(d.getDate() - (startOffset - i))
    cells.push(d)
  }
  for (let d = 1; d <= totalDays; d++) {
    cells.push(new Date(year, month - 1, d))
  }
  const trailing = 7 - (cells.length % 7)
  if (trailing < 7) {
    for (let i = 1; i <= trailing; i++) {
      cells.push(new Date(year, month, i))
    }
  }

  // Map date keys to events (events spanning multiple days appear on each day)
  const eventsByDay = useMemo(() => {
    const map = new Map<string, CalendarEvent[]>()
    for (const ev of events) {
      const start = parseLocalDate(ev.start_date)
      const end = parseLocalDate(ev.end_date)
      start.setHours(0, 0, 0, 0)
      end.setHours(0, 0, 0, 0)
      const cur = new Date(start)
      while (cur <= end) {
        const key = toDateKey(cur)
        if (!map.has(key)) map.set(key, [])
        map.get(key)!.push(ev)
        cur.setDate(cur.getDate() + 1)
      }
    }
    return map
  }, [events])

  return (
    <div className="overflow-hidden rounded-xl border border-stone-200 dark:border-zinc-700">
      {/* Day headers */}
      <div className="grid grid-cols-7 border-b border-stone-200 dark:border-zinc-700 bg-stone-50 dark:bg-zinc-800/50">
        {DAYS_SHORT.map((day) => (
          <div key={day} className="py-2 text-center text-xs font-semibold text-stone-500 dark:text-zinc-400 uppercase tracking-wide">
            {day}
          </div>
        ))}
      </div>

      {/* Weeks */}
      <div className="divide-y divide-stone-200 dark:divide-zinc-700">
        {Array.from({ length: cells.length / 7 }).map((_, weekIdx) => (
          <div key={weekIdx} className="grid grid-cols-7 divide-x divide-stone-200 dark:divide-zinc-700">
            {cells.slice(weekIdx * 7, weekIdx * 7 + 7).map((date, dayIdx) => {
              if (!date) return <div key={dayIdx} className="min-h-[100px]" />
              const key = toDateKey(date)
              const isCurrentMonth = date.getMonth() === month - 1
              const isToday = toDateKey(date) === toDateKey(today)
              const dayEvents = eventsByDay.get(key) ?? []

              return (
                <div
                  key={key}
                  className={cn(
                    'min-h-[100px] p-1.5 space-y-1',
                    !isCurrentMonth && 'bg-stone-50/60 dark:bg-zinc-900/30',
                    isToday && 'bg-blue-50/40 dark:bg-blue-950/10',
                  )}
                >
                  <div className="flex justify-center">
                    <span
                      className={cn(
                        'flex h-6 w-6 items-center justify-center rounded-full text-xs font-medium',
                        isToday
                          ? 'bg-esi-red text-white'
                          : isCurrentMonth
                            ? 'text-stone-800 dark:text-zinc-200'
                            : 'text-stone-400 dark:text-zinc-600',
                      )}
                    >
                      {date.getDate()}
                    </span>
                  </div>
                  <div className="space-y-0.5">
                    {dayEvents.slice(0, 3).map((ev) => (
                      <EventBlock key={ev.id} event={ev} compact onClick={onEventClick} />
                    ))}
                    {dayEvents.length > 3 && (
                      <button
                        className="w-full text-left text-[10px] text-stone-500 dark:text-zinc-400 pl-1 hover:underline"
                        onClick={() => onEventClick(dayEvents[3])}
                      >
                        +{dayEvents.length - 3} lainnya
                      </button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        ))}
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════
// Weekly View
// ═══════════════════════════════════════════════

function WeeklyView({
  weekStart,
  events,
  onEventClick,
}: {
  weekStart: Date
  events: CalendarEvent[]
  onEventClick: (e: CalendarEvent) => void
}) {
  const today = new Date()

  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart)
    d.setDate(d.getDate() + i)
    return d
  })

  const eventsByDay = useMemo(() => {
    const map = new Map<string, CalendarEvent[]>()
    for (const ev of events) {
      const start = parseLocalDate(ev.start_date)
      const end = parseLocalDate(ev.end_date)
      start.setHours(0, 0, 0, 0)
      end.setHours(0, 0, 0, 0)
      const cur = new Date(start)
      while (cur <= end) {
        const key = toDateKey(cur)
        if (!map.has(key)) map.set(key, [])
        map.get(key)!.push(ev)
        cur.setDate(cur.getDate() + 1)
      }
    }
    return map
  }, [events])

  return (
    <div className="overflow-hidden rounded-xl border border-stone-200 dark:border-zinc-700">
      <div className="grid grid-cols-7 divide-x divide-stone-200 dark:divide-zinc-700">
        {days.map((day, i) => {
          const key = toDateKey(day)
          const isToday = toDateKey(day) === toDateKey(today)
          const dayEvents = eventsByDay.get(key) ?? []

          return (
            <div key={key} className="flex flex-col">
              {/* Day header */}
              <div
                className={cn(
                  'py-3 text-center border-b border-stone-200 dark:border-zinc-700 bg-stone-50 dark:bg-zinc-800/50',
                  isToday && 'bg-blue-50 dark:bg-blue-950/20',
                )}
              >
                <p className="text-xs font-semibold text-stone-500 dark:text-zinc-400 uppercase tracking-wide">
                  {DAYS_SHORT[i]}
                </p>
                <div className="flex justify-center mt-1">
                  <span
                    className={cn(
                      'flex h-7 w-7 items-center justify-center rounded-full text-sm font-bold',
                      isToday
                        ? 'bg-esi-red text-white'
                        : 'text-stone-800 dark:text-zinc-200',
                    )}
                  >
                    {day.getDate()}
                  </span>
                </div>
              </div>

              {/* Events */}
              <div className="p-1.5 space-y-1 min-h-[200px]">
                {dayEvents.map((ev) => (
                  <EventBlock key={ev.id} event={ev} onClick={onEventClick} />
                ))}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════
// Daily View
// ═══════════════════════════════════════════════

function DailyView({
  date,
  events,
  onEventClick,
}: {
  date: Date
  events: CalendarEvent[]
  onEventClick: (e: CalendarEvent) => void
}) {
  const key = toDateKey(date)

  const dayEvents = useMemo(() => {
    return events.filter((ev) => {
      const start = parseLocalDate(ev.start_date)
      const end = parseLocalDate(ev.end_date)
      start.setHours(0, 0, 0, 0)
      end.setHours(0, 0, 0, 0)
      const d = new Date(date)
      d.setHours(0, 0, 0, 0)
      return d >= start && d <= end
    })
  }, [events, key])

  return (
    <div className="overflow-hidden rounded-xl border border-stone-200 dark:border-zinc-700">
      {/* Active events */}
      <div className="p-4 border-b border-stone-200 dark:border-zinc-700 bg-stone-50 dark:bg-zinc-800/50">
        <p className="text-xs font-semibold text-stone-500 dark:text-zinc-400 uppercase tracking-wide mb-2">
          Event Aktif hari ini ({dayEvents.length})
        </p>
        {dayEvents.length === 0 ? (
          <p className="text-sm text-stone-400 dark:text-zinc-500">Tidak ada event</p>
        ) : (
          <div className="space-y-2">
            {dayEvents.map((ev) => (
              <EventBlock key={ev.id} event={ev} onClick={onEventClick} />
            ))}
          </div>
        )}
      </div>

      {/* Hour slots */}
      <div className="divide-y divide-stone-100 dark:divide-zinc-800">
        {Array.from({ length: 24 }, (_, hour) => {
          const label = `${String(hour).padStart(2, '0')}:00`
          // For daily view, show events that are active (multi-day events during their start hour = 0, or just mark all-day)
          const slotEvents = hour === 0 ? dayEvents : []

          return (
            <div key={hour} className="flex gap-3 px-4 py-2 min-h-[44px]">
              <span className="w-12 shrink-0 text-xs text-stone-400 dark:text-zinc-500 font-mono">{label}</span>
              <div className="flex-1 space-y-1">
                {slotEvents.map((ev) => (
                  <EventBlock key={ev.id} event={ev} onClick={onEventClick} />
                ))}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════
// Skeleton
// ═══════════════════════════════════════════════

function CalendarSkeleton({ view }: { view: ViewMode }) {
  if (view === 'monthly') {
    return (
      <div className="overflow-hidden rounded-xl border border-stone-200 dark:border-zinc-700">
        <div className="grid grid-cols-7 border-b border-stone-200 dark:border-zinc-700 bg-stone-50 dark:bg-zinc-800/50">
          {DAYS_SHORT.map((d) => (
            <div key={d} className="py-2 flex justify-center">
              <Skeleton className="h-3 w-6" />
            </div>
          ))}
        </div>
        {Array.from({ length: 5 }).map((_, weekIdx) => (
          <div key={weekIdx} className="grid grid-cols-7 divide-x divide-stone-200 dark:divide-zinc-700 border-b border-stone-200 dark:border-zinc-700 last:border-b-0">
            {Array.from({ length: 7 }).map((_, dayIdx) => (
              <div key={dayIdx} className="min-h-[100px] p-1.5 space-y-1.5">
                <div className="flex justify-center">
                  <Skeleton className="h-6 w-6 rounded-full" />
                </div>
                {dayIdx % 3 === 0 && <Skeleton className="h-5 w-full rounded" />}
                {dayIdx % 5 === 0 && <Skeleton className="h-5 w-full rounded" />}
              </div>
            ))}
          </div>
        ))}
      </div>
    )
  }

  if (view === 'weekly') {
    return (
      <div className="overflow-hidden rounded-xl border border-stone-200 dark:border-zinc-700">
        <div className="grid grid-cols-7 divide-x divide-stone-200 dark:divide-zinc-700">
          {Array.from({ length: 7 }).map((_, i) => (
            <div key={i} className="flex flex-col">
              <div className="py-3 px-2 border-b border-stone-200 dark:border-zinc-700 bg-stone-50 dark:bg-zinc-800/50 text-center space-y-1">
                <Skeleton className="h-3 w-8 mx-auto" />
                <Skeleton className="h-7 w-7 rounded-full mx-auto" />
              </div>
              <div className="p-1.5 min-h-[200px] space-y-1.5">
                {i % 2 === 0 && <Skeleton className="h-10 w-full rounded" />}
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  // daily
  return (
    <div className="overflow-hidden rounded-xl border border-stone-200 dark:border-zinc-700">
      <div className="p-4 border-b border-stone-200 dark:border-zinc-700 bg-stone-50 dark:bg-zinc-800/50 space-y-2">
        <Skeleton className="h-3 w-32" />
        <Skeleton className="h-10 w-full rounded" />
      </div>
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className="flex gap-3 px-4 py-2 min-h-[44px] border-b border-stone-100 dark:border-zinc-800 last:border-b-0">
          <Skeleton className="h-3 w-12 shrink-0 mt-1" />
          <div className="flex-1" />
        </div>
      ))}
    </div>
  )
}

// ═══════════════════════════════════════════════
// Main Page
// ═══════════════════════════════════════════════

export default function AdminCalendarPage() {
  const router = useRouter()
  const { isAuthenticated, isLoading: authLoading } = useAuthStore()

  const today = new Date()
  const [viewMode, setViewMode] = useState<ViewMode>('monthly')
  const [currentDate, setCurrentDate] = useState<Date>(() => {
    const d = new Date()
    d.setDate(1)
    d.setHours(0, 0, 0, 0)
    return d
  })
  const [weekStart, setWeekStart] = useState<Date>(() => getWeekStart(new Date()))
  const [dailyDate, setDailyDate] = useState<Date>(() => {
    const d = new Date()
    d.setHours(0, 0, 0, 0)
    return d
  })

  const [events, setEvents] = useState<CalendarEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null)
  const [sheetOpen, setSheetOpen] = useState(false)

  // For weekly/daily we may need adjacent months, so fetch the month(s) of visible range
  const fetchYear = useMemo(() => {
    if (viewMode === 'monthly') return currentDate.getFullYear()
    if (viewMode === 'weekly') return weekStart.getFullYear()
    return dailyDate.getFullYear()
  }, [viewMode, currentDate, weekStart, dailyDate])

  const fetchMonth = useMemo(() => {
    if (viewMode === 'monthly') return currentDate.getMonth() + 1
    if (viewMode === 'weekly') return weekStart.getMonth() + 1
    return dailyDate.getMonth() + 1
  }, [viewMode, currentDate, weekStart, dailyDate])

  const fetchEvents = useCallback(async () => {
    if (!isAuthenticated) return
    setLoading(true)
    try {
      const data = await api.get<CalendarResponse>(
        `/admin/calendar?year=${fetchYear}&month=${fetchMonth}`,
      )
      setEvents(data.events ?? [])
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Gagal memuat data kalender')
      setEvents([])
    } finally {
      setLoading(false)
    }
  }, [isAuthenticated, fetchYear, fetchMonth])

  useEffect(() => {
    if (!authLoading && isAuthenticated) {
      fetchEvents()
    }
  }, [authLoading, isAuthenticated, fetchEvents])

  // ── Navigation ──────────────────────────────

  function navigatePrev() {
    if (viewMode === 'monthly') {
      setCurrentDate((d) => {
        const n = new Date(d)
        n.setMonth(n.getMonth() - 1)
        return n
      })
    } else if (viewMode === 'weekly') {
      setWeekStart((d) => {
        const n = new Date(d)
        n.setDate(n.getDate() - 7)
        return n
      })
    } else {
      setDailyDate((d) => {
        const n = new Date(d)
        n.setDate(n.getDate() - 1)
        return n
      })
    }
  }

  function navigateNext() {
    if (viewMode === 'monthly') {
      setCurrentDate((d) => {
        const n = new Date(d)
        n.setMonth(n.getMonth() + 1)
        return n
      })
    } else if (viewMode === 'weekly') {
      setWeekStart((d) => {
        const n = new Date(d)
        n.setDate(n.getDate() + 7)
        return n
      })
    } else {
      setDailyDate((d) => {
        const n = new Date(d)
        n.setDate(n.getDate() + 1)
        return n
      })
    }
  }

  function goToToday() {
    const d = new Date()
    d.setHours(0, 0, 0, 0)
    setCurrentDate(new Date(d.getFullYear(), d.getMonth(), 1))
    setWeekStart(getWeekStart(d))
    setDailyDate(d)
  }

  // ── Header label ────────────────────────────

  const headerLabel = useMemo(() => {
    if (viewMode === 'monthly') {
      return `${MONTHS_ID[currentDate.getMonth()]} ${currentDate.getFullYear()}`
    }
    if (viewMode === 'weekly') {
      const weekEnd = new Date(weekStart)
      weekEnd.setDate(weekEnd.getDate() + 6)
      if (weekStart.getMonth() === weekEnd.getMonth()) {
        return `${weekStart.getDate()}–${weekEnd.getDate()} ${MONTHS_ID[weekStart.getMonth()]} ${weekStart.getFullYear()}`
      }
      return `${weekStart.getDate()} ${MONTHS_ID[weekStart.getMonth()]} – ${weekEnd.getDate()} ${MONTHS_ID[weekEnd.getMonth()]} ${weekEnd.getFullYear()}`
    }
    // daily
    return dailyDate.toLocaleDateString('id-ID', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    })
  }, [viewMode, currentDate, weekStart, dailyDate])

  // ── Event click ─────────────────────────────

  function handleEventClick(ev: CalendarEvent) {
    setSelectedEvent(ev)
    setSheetOpen(true)
  }

  // ── Empty check ─────────────────────────────

  const isEmpty = !loading && events.length === 0

  if (authLoading) return null

  return (
    <>
      <PageHeader
        title="Kalender Event"
        description="Tampilan kalender semua event dan turnamen esport."
        breadcrumbs={[
          { label: 'Admin', href: '/admin' },
          { label: 'Kalender Event' },
        ]}
      />

      {/* Toolbar */}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        {/* Navigation */}
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon-sm" onClick={navigatePrev} aria-label="Sebelumnya">
            <CaretLeft size={16} />
          </Button>
          <Button variant="outline" size="sm" onClick={goToToday} className="text-xs">
            Hari Ini
          </Button>
          <Button variant="outline" size="icon-sm" onClick={navigateNext} aria-label="Berikutnya">
            <CaretRight size={16} />
          </Button>
          <span className="ml-2 text-sm font-semibold text-stone-800 dark:text-zinc-100 min-w-[200px]">
            {headerLabel}
          </span>
        </div>

        {/* View toggle */}
        <div className="flex items-center gap-1 rounded-lg border border-stone-200 dark:border-zinc-700 p-0.5 bg-stone-50 dark:bg-zinc-800/50">
          {(['monthly', 'weekly', 'daily'] as ViewMode[]).map((mode) => {
            const labels: Record<ViewMode, string> = {
              monthly: 'Bulanan',
              weekly: 'Mingguan',
              daily: 'Harian',
            }
            return (
              <Button
                key={mode}
                variant={viewMode === mode ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewMode(mode)}
                className={cn(
                  'text-xs h-7 px-3',
                  viewMode === mode && 'bg-esi-red text-white hover:bg-esi-red/90',
                )}
              >
                {labels[mode]}
              </Button>
            )
          })}
        </div>
      </div>

      {/* Calendar body */}
      {loading ? (
        <CalendarSkeleton view={viewMode} />
      ) : isEmpty ? (
        <EmptyState
          icon={CalendarBlank}
          title="Tidak ada event di bulan ini"
          description="Belum ada event yang terdaftar pada periode ini."
          actionLabel="Buat Event"
          onAction={() => router.push('/admin/events')}
        />
      ) : (
        <>
          {viewMode === 'monthly' && (
            <MonthlyView
              year={fetchYear}
              month={fetchMonth}
              events={events}
              onEventClick={handleEventClick}
            />
          )}
          {viewMode === 'weekly' && (
            <WeeklyView
              weekStart={weekStart}
              events={events}
              onEventClick={handleEventClick}
            />
          )}
          {viewMode === 'daily' && (
            <DailyView
              date={dailyDate}
              events={events}
              onEventClick={handleEventClick}
            />
          )}
        </>
      )}

      {/* Event detail sheet */}
      <EventDetailSheet
        event={selectedEvent}
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
      />
    </>
  )
}
