'use client'

import { Megaphone } from '@phosphor-icons/react'
import { AnnouncementBanner } from '@/components/shared/AnnouncementBanner'
import type { Announcement } from '@/types/announcement'

interface Props {
  announcements: Announcement[]
}

export function AnnouncementSection({ announcements }: Props) {
  if (!announcements || announcements.length === 0) return null

  return (
    <section className="announcement-section anim-section mx-auto w-full max-w-7xl px-5 sm:px-6 lg:px-8 py-6 sm:py-8">
      <div className="mb-4 flex items-center gap-2">
        <Megaphone size={22} weight="fill" className="text-red-600 dark:text-red-400" />
        <h2 className="text-lg font-black uppercase tracking-wide text-stone-800 dark:text-zinc-100 sm:text-xl">
          Pengumuman Terbaru
        </h2>
      </div>
      <AnnouncementBanner announcements={announcements} maxShow={3} dismissible />
    </section>
  )
}

export default AnnouncementSection
