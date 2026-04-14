'use client'

import { forwardRef } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { Trophy, CalendarBlank, MapPin, ArrowRight, Lightning } from '@phosphor-icons/react'
import { CornerMarks } from '@/components/landing/EsiOrnaments'
import { resolveMediaUrl } from '@/lib/api'
import type { Event } from '@/types'
import { RED, STATUS_BADGE } from '../constants'

interface Props {
  events: Event[]
  loading: boolean
}

export const EventsSection = forwardRef<HTMLElement, Props>(function EventsSection({ events, loading }, ref) {
  return (
    <section id="events" ref={ref} className="mx-auto max-w-7xl px-5 sm:px-6 lg:px-8 py-12 sm:py-16 lg:py-20 scroll-mt-20">
      <div className="mb-8 sm:mb-10 text-center">
        <div className="inline-flex items-center gap-2 rounded-full border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950 px-4 py-1.5 mb-4">
          <Trophy size={14} weight="fill" style={{ color: RED }} />
          <span className="text-xs font-bold uppercase tracking-widest" style={{ color: RED }}>Event Turnamen</span>
        </div>
        <h2 className="text-2xl sm:text-3xl lg:text-4xl font-black text-stone-900 dark:text-zinc-100">Turnamen Esport Pelajar</h2>
        <p className="mt-2 text-sm sm:text-base text-stone-500 dark:text-zinc-400 max-w-md mx-auto">Pilih event untuk melihat turnamen, jadwal, dan klasemen</p>
      </div>

      {loading ? (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-72 rounded-2xl bg-stone-100 dark:bg-zinc-800 animate-pulse" />
          ))}
        </div>
      ) : events.length === 0 ? (
        <div className="mx-auto max-w-xl rounded-2xl border border-stone-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 p-8 text-center shadow-sm">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-red-50 dark:bg-red-950">
            <Trophy size={28} weight="duotone" style={{ color: RED }} />
          </div>
          <p className="text-lg font-bold text-stone-800 dark:text-zinc-200">Belum ada event aktif</p>
          <p className="mt-1 text-sm text-stone-500 dark:text-zinc-400">
            Event turnamen akan muncul di sini. Tertarik berpartisipasi atau menjadi mitra? Hubungi kami:
          </p>
          <div className="mt-4 flex flex-col items-center gap-1 text-sm text-stone-600 dark:text-zinc-400">
            <div><span className="font-bold text-stone-800 dark:text-zinc-200">Bagus Eka</span> · +62 878-6156-9479</div>
            <div><span className="font-bold text-stone-800 dark:text-zinc-200">Arik</span> · +62 877-6038-3825</div>
            <div><span className="font-bold text-stone-800 dark:text-zinc-200">Geni</span> · +62 813-3960-0701</div>
          </div>
        </div>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {events.map(event => {
            const badge = STATUS_BADGE[event.status] || STATUS_BADGE.draft
            return (
              <Link
                key={event.id}
                href={`/events/${event.slug}`}
                className="event-card anim-card group relative overflow-hidden rounded-2xl border border-stone-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 shadow-sm transition-all hover:shadow-xl hover:-translate-y-1"
              >
                <div className="relative h-28 overflow-hidden" style={{ background: event.primary_color }}>
                  <CornerMarks size={20} thickness={1.5} color="rgba(255,255,255,0.25)" />
                  <div className="pointer-events-none absolute inset-0">
                    <svg className="absolute right-0 top-0 h-full w-[120px] opacity-[0.1]" preserveAspectRatio="none" viewBox="0 0 120 120" fill="none">
                      <polygon points="30,0 120,0 120,120 0,120" fill="white" />
                    </svg>
                  </div>
                  <div className="relative z-10 flex h-full items-center justify-center">
                    {event.logo_url ? (
                      <Image
                        src={resolveMediaUrl(event.logo_url) ?? ''}
                        alt={`${event.name} logo`}
                        width={56}
                        height={56}
                        className="h-14 w-14 rounded-xl object-contain bg-white/10 backdrop-blur-sm p-1"
                        unoptimized
                      />
                    ) : (
                      <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-white/15 backdrop-blur-sm">
                        <Trophy size={28} weight="fill" className="text-white" />
                      </div>
                    )}
                  </div>
                </div>

                <div className="p-5">
                  <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider ${badge.class}`}>
                    {event.status === 'ongoing' && <Lightning size={10} weight="fill" />}
                    {badge.label}
                  </span>

                  <h3 className="mt-3 text-lg font-bold text-stone-900 dark:text-zinc-100 transition-colors leading-tight group-hover:text-[#C41E2A]">
                    {event.name}
                  </h3>
                  {event.description && (
                    <p className="mt-1.5 text-sm text-stone-500 dark:text-zinc-400 line-clamp-2">{event.description}</p>
                  )}

                  <div className="mt-3 flex flex-wrap gap-3 text-xs text-stone-400 dark:text-zinc-500">
                    {event.start_date && (
                      <span className="flex items-center gap-1">
                        <CalendarBlank size={12} />
                        {new Date(event.start_date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </span>
                    )}
                    {event.city && (
                      <span className="flex items-center gap-1"><MapPin size={12} />{event.city}</span>
                    )}
                  </div>

                  <div className="mt-4 flex items-center gap-1 text-sm font-semibold transition-colors group-hover:gap-2" style={{ color: event.primary_color }}>
                    Lihat Event
                    <ArrowRight size={14} weight="bold" className="transition-transform group-hover:translate-x-1" />
                  </div>
                </div>
              </Link>
            )
          })}
        </div>
      )}
    </section>
  )
})
