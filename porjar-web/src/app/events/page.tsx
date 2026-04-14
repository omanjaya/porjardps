'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { api, resolveMediaUrl } from '@/lib/api'
import { PublicLayout } from '@/components/layouts/PublicLayout'
import { EmptyState } from '@/components/shared/EmptyState'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { Skeleton } from '@/components/ui/skeleton'
import { Trophy, CalendarBlank, MapPin, ArrowRight, Lightning, Buildings, Users, Crown } from '@phosphor-icons/react'
import type { Event } from '@/types'

function formatDateRange(start?: string, end?: string): string {
  if (!start) return ''
  const s = new Date(start)
  const e = end ? new Date(end) : null
  const opts: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short', year: 'numeric' }
  if (!e) return s.toLocaleDateString('id-ID', opts)
  const sameMonth = s.getMonth() === e.getMonth() && s.getFullYear() === e.getFullYear()
  if (sameMonth) return `${s.getDate()}-${e.getDate()} ${e.toLocaleDateString('id-ID', { month: 'short', year: 'numeric' })}`
  return `${s.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })} - ${e.toLocaleDateString('id-ID', opts)}`
}

export default function EventsListPage() {
  const [events, setEvents] = useState<Event[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get<Event[]>('/events')
      .then(data => setEvents(Array.isArray(data) ? data : []))
      .catch(() => setEvents([]))
      .finally(() => setLoading(false))
  }, [])

  const ongoing = events.filter(e => e.status === 'ongoing')
  const upcoming = events.filter(e => e.status === 'published' || e.status === 'draft')
  const completed = events.filter(e => e.status === 'completed' || e.status === 'archived')

  return (
    <PublicLayout>
      <div className="mx-auto max-w-5xl px-4 sm:px-6 py-8 sm:py-12">
        {/* Header */}
        <div className="mb-8 sm:mb-10">
          <div className="flex items-center gap-3 mb-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-esi-red/10">
              <Trophy size={22} weight="duotone" className="text-esi-red" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-black text-stone-900 dark:text-zinc-100">Event</h1>
              <p className="text-sm text-stone-500 dark:text-zinc-400">Semua event ESI Kota Denpasar</p>
            </div>
          </div>
        </div>

        {loading && (
          <div className="space-y-6">
            <Skeleton className="h-48 rounded-2xl bg-stone-100 dark:bg-zinc-800" />
            <div className="grid gap-6 sm:grid-cols-2">
              <Skeleton className="h-56 rounded-2xl bg-stone-100 dark:bg-zinc-800" />
              <Skeleton className="h-56 rounded-2xl bg-stone-100 dark:bg-zinc-800" />
            </div>
          </div>
        )}

        {!loading && events.length === 0 && (
          <EmptyState icon={Trophy} title="Belum ada event" description="Event turnamen akan muncul di sini saat dibuat oleh admin" />
        )}

        {!loading && events.length > 0 && (
          <div className="space-y-10">
            {/* Sedang Berlangsung — featured full-width */}
            {ongoing.map(event => (
              <section key={event.id}>
                <h2 className="text-sm font-bold uppercase tracking-widest text-green-600 dark:text-green-400 mb-4 flex items-center gap-2">
                  <Lightning size={14} weight="fill" /> Sedang Berlangsung
                </h2>
                <FeaturedEventCard event={event} />
              </section>
            ))}

            {/* Akan Datang */}
            {upcoming.length > 0 && (
              <section>
                <h2 className="text-sm font-bold uppercase tracking-widest text-blue-600 dark:text-blue-400 mb-4">
                  Akan Datang
                </h2>
                <div className="grid gap-6 sm:grid-cols-2">
                  {upcoming.map(event => <EventCard key={event.id} event={event} />)}
                </div>
              </section>
            )}

            {/* Selesai */}
            {completed.length > 0 && (
              <section>
                <h2 className="text-sm font-bold uppercase tracking-widest text-stone-400 dark:text-zinc-500 mb-4">
                  Selesai
                </h2>
                <div className="grid gap-6 sm:grid-cols-2">
                  {completed.map(event => <EventCard key={event.id} event={event} />)}
                </div>
              </section>
            )}
          </div>
        )}
      </div>
    </PublicLayout>
  )
}

/** Full-width hero card for ongoing event */
function FeaturedEventCard({ event }: { event: Event }) {
  const champion = event.champion_team_name ?? undefined
  return (
    <Link
      href={`/events/${event.slug}`}
      className="group relative block overflow-hidden rounded-2xl border-2 border-green-300 dark:border-green-700 border-l-4 shadow-lg transition-all duration-300 hover:shadow-xl hover:shadow-stone-200/50 dark:hover:shadow-black/30 hover:-translate-y-1.5 will-change-transform"
      style={{ borderLeftColor: event.primary_color || '#C41E2A' }}
    >
      <div className="relative overflow-hidden" style={{ background: event.primary_color || '#C41E2A' }}>
        <div className="pointer-events-none absolute inset-0">
          <svg className="absolute right-0 top-0 h-full w-[250px] opacity-[0.08]" preserveAspectRatio="none" viewBox="0 0 250 200" fill="none">
            <polygon points="80,0 250,0 250,200 0,200" fill="white" />
          </svg>
        </div>
        {/* Shimmer sweep */}
        <div className="pointer-events-none absolute inset-0 -translate-x-full animate-[shimmer_3s_ease-in-out_infinite] bg-gradient-to-r from-transparent via-white/10 to-transparent" />
        {/* Live badge */}
        <div className="absolute top-4 right-4 flex items-center gap-1.5 rounded-full bg-green-500 px-3 py-1 text-xs font-bold text-white shadow-md">
          <span className="h-2 w-2 rounded-full bg-white animate-pulse" /> LIVE
        </div>
        <div className="relative z-10 flex flex-col sm:flex-row items-center gap-6 px-6 py-10 sm:px-10 sm:py-12">
          {/* Logo */}
          <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-2xl bg-white/15 backdrop-blur-sm">
            {event.logo_url ? (
              <Image src={resolveMediaUrl(event.logo_url) ?? ''} alt="" width={64} height={64} className="h-16 w-16 rounded-xl object-contain" unoptimized />
            ) : (
              <Trophy size={40} weight="fill" className="text-white" />
            )}
          </div>
          {/* Info */}
          <div className="text-center sm:text-left text-white flex-1">
            <h3 className="text-2xl sm:text-3xl font-black tracking-tight">{event.name}</h3>
            <p className="mt-2 text-white/70 max-w-lg">
              {event.description || 'Turnamen esport resmi pelajar se-Kota Denpasar'}
            </p>
            <div className="mt-4 flex flex-wrap justify-center sm:justify-start gap-4 text-sm text-white/60">
              {event.start_date && (
                <span className="flex items-center gap-1.5">
                  <CalendarBlank size={14} />
                  {formatDateRange(event.start_date, event.end_date ?? undefined)}
                </span>
              )}
              {event.venue && (
                <span className="flex items-center gap-1.5">
                  <Buildings size={14} />
                  {event.venue}
                </span>
              )}
              {event.city && (
                <span className="flex items-center gap-1.5">
                  <MapPin size={14} />
                  {event.city}
                </span>
              )}
            </div>
          </div>
          {/* CTA */}
          <div className="shrink-0">
            <span className="inline-flex items-center gap-2 rounded-xl bg-white px-6 py-3 font-bold transition group-hover:shadow-lg" style={{ color: event.primary_color || '#C41E2A' }}>
              Masuk Event <ArrowRight size={16} weight="bold" className="transition-transform duration-300 group-hover:translate-x-2" />
            </span>
          </div>
        </div>
      </div>
    </Link>
  )
}

/** Standard event card for upcoming/completed */
function EventCard({ event }: { event: Event }) {
  const isCompleted = event.status === 'completed' || event.status === 'archived'
  const champion = event.champion_team_name ?? undefined

  return (
    <Link
      href={`/events/${event.slug}`}
      className="group relative overflow-hidden rounded-2xl border border-stone-200 dark:border-zinc-700 border-l-4 bg-white dark:bg-zinc-900 shadow-sm transition-all duration-300 hover:shadow-xl hover:shadow-stone-200/50 dark:hover:shadow-black/30 hover:-translate-y-1.5 will-change-transform"
      style={{ borderLeftColor: isCompleted ? '#44403c' : (event.primary_color || '#C41E2A') }}
    >
      {/* Color header */}
      <div className="relative h-24 overflow-hidden" style={{ background: isCompleted ? '#44403c' : (event.primary_color || '#C41E2A') }}>
        {isCompleted && (
          <div className="pointer-events-none absolute inset-0 opacity-[0.03]" style={{ backgroundImage: 'repeating-linear-gradient(45deg, transparent, transparent 10px, white 10px, white 11px)' }} />
        )}
        <div className="pointer-events-none absolute inset-0">
          <svg className="absolute right-0 top-0 h-full w-[120px] opacity-[0.1]" preserveAspectRatio="none" viewBox="0 0 120 120" fill="none">
            <polygon points="30,0 120,0 120,120 0,120" fill="white" />
          </svg>
        </div>
        <div className="relative z-10 flex h-full items-center justify-center">
          {event.logo_url ? (
            <Image src={resolveMediaUrl(event.logo_url) ?? ''} alt="" width={48} height={48} className="h-12 w-12 rounded-xl object-contain bg-white/10 backdrop-blur-sm p-1" unoptimized />
          ) : (
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/15 backdrop-blur-sm">
              <Trophy size={24} weight="fill" className="text-white" />
            </div>
          )}
        </div>
      </div>

      <div className="p-5">
        <StatusBadge status={event.status} className="text-sm px-3 py-1" />

        <h3 className="mt-3 text-lg font-bold text-stone-900 dark:text-zinc-100 group-hover:text-esi-red transition-colors leading-tight">
          {event.name}
        </h3>
        <p className="mt-1.5 text-sm text-stone-500 dark:text-zinc-400 line-clamp-2">
          {event.description || 'Turnamen esport pelajar se-Kota Denpasar'}
        </p>

        {/* Champion for completed */}
        {isCompleted && champion && (
          <div className="mt-2 flex items-center gap-2 rounded-lg bg-gradient-to-r from-amber-50 to-yellow-50 dark:from-amber-950/40 dark:to-yellow-950/30 px-3 py-1.5 text-xs font-semibold text-amber-600 dark:text-amber-400">
            <Crown size={16} weight="fill" /> Juara: {champion}
          </div>
        )}

        {/* Meta */}
        <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs tabular-nums text-stone-400 dark:text-zinc-500">
          {event.start_date && (
            <span className="flex items-center gap-1">
              <CalendarBlank size={12} />
              {formatDateRange(event.start_date, event.end_date ?? undefined)}
            </span>
          )}
          {event.venue && (
            <span className="flex items-center gap-1">
              <Buildings size={12} />
              {event.venue}
            </span>
          )}
          {event.city && (
            <span className="flex items-center gap-1">
              <MapPin size={12} />
              {event.city}
            </span>
          )}
        </div>

        <div className="mt-4 flex items-center gap-1 text-sm font-semibold text-esi-red transition-colors group-hover:gap-2">
          {isCompleted ? 'Lihat Hasil' : 'Lihat Event'}
          <ArrowRight size={14} weight="bold" className="transition-transform duration-300 group-hover:translate-x-2" />
        </div>
      </div>
    </Link>
  )
}
