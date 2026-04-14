'use client'

import { useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'
import Link from 'next/link'
import { EventNavbar } from '@/components/shared/EventNavbar'
import { EventBreadcrumb } from '@/components/shared/EventBreadcrumb'
import { FooterCredit } from '@/components/shared/FooterCredit'
import { AnnouncementBanner } from '@/components/shared/AnnouncementBanner'
import { useEvent } from '@/contexts/EventContext'
import { api } from '@/lib/api'
import { Trophy } from '@phosphor-icons/react'
import type { Announcement } from '@/types/announcement'

export function EventPublicLayout({ children }: { children: React.ReactNode }) {
  const event = useEvent()
  const pathname = usePathname()
  const [announcements, setAnnouncements] = useState<Announcement[]>([])

  useEffect(() => {
    if (!event?.slug) return
    api.get<Announcement[]>(`/events/${event.slug}/announcements`)
      .then(list => setAnnouncements(Array.isArray(list) ? list : []))
      .catch(() => setAnnouncements([]))
  }, [event?.slug])

  // Skip breadcrumb on event home page (redundant with hero)
  const isEventHome = pathname === `/events/${event.slug}`

  return (
    <div className="min-h-[100dvh] bg-esi-bg flex flex-col">
      <EventNavbar position="sticky" />
      {event.status === 'completed' && (
        <div className="bg-stone-100 dark:bg-zinc-800 border-b border-stone-200 dark:border-zinc-700">
          <div className="mx-auto max-w-7xl px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm font-semibold text-stone-700 dark:text-zinc-300">
              <Trophy size={16} weight="fill" className="text-amber-500" />
              Event ini telah selesai — Lihat hasil final
            </div>
            <Link href={`/events/${event.slug}/leaderboard`} className="text-sm font-bold text-esi-red hover:underline">
              Lihat Leaderboard &rarr;
            </Link>
          </div>
        </div>
      )}
      {!isEventHome && (
        <EventBreadcrumb
          eventSlug={event.slug}
          eventName={event.short_name || event.name}
          eventStatus={event.status}
          startDate={event.start_date}
          endDate={event.end_date}
        />
      )}
      <main className="flex-1">
        <div className="mx-auto max-w-7xl px-4 py-6">
          {announcements.length > 0 && (
            <div className="mb-6">
              <AnnouncementBanner announcements={announcements} maxShow={3} dismissible />
            </div>
          )}
          {children}
        </div>
      </main>
      <footer className="border-t border-esi-border bg-white dark:bg-zinc-900 py-5">
        <div className="mx-auto max-w-7xl px-4 text-center text-sm text-esi-muted">
          <p>{event.organizer ?? 'ESI Kota Denpasar'} &middot; {event.city ?? 'Denpasar, Bali'}</p>
          <FooterCredit />
        </div>
      </footer>
    </div>
  )
}
