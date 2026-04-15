'use client'

import { useEffect, useState } from 'react'
import { Info, Megaphone, Warning, Siren, X } from '@phosphor-icons/react'
import type { Announcement } from '@/types/announcement'

interface Props {
  announcements: Announcement[]
  maxShow?: number
  dismissible?: boolean
}

const PRIORITY_STYLES: Record<Announcement['priority'], { wrap: string; icon: string; Icon: React.ComponentType<{ size?: number; weight?: 'bold' | 'fill' | 'regular' }> }> = {
  low: {
    wrap: 'border-stone-300 bg-stone-50 text-stone-800 dark:border-zinc-700 dark:bg-zinc-900/60 dark:text-zinc-200',
    icon: 'text-stone-500 dark:text-zinc-400',
    Icon: Info,
  },
  normal: {
    wrap: 'border-blue-300 bg-blue-50 text-blue-900 dark:border-blue-800/60 dark:bg-blue-950/40 dark:text-blue-100',
    icon: 'text-blue-600 dark:text-blue-400',
    Icon: Megaphone,
  },
  high: {
    wrap: 'border-amber-300 bg-amber-50 text-amber-900 dark:border-amber-800/60 dark:bg-amber-950/40 dark:text-amber-100',
    icon: 'text-amber-600 dark:text-amber-400',
    Icon: Warning,
  },
  urgent: {
    wrap: 'border-red-300 bg-red-50 text-red-900 dark:border-red-800/60 dark:bg-red-950/40 dark:text-red-100',
    icon: 'text-red-600 dark:text-red-400',
    Icon: Siren,
  },
}

function timeAgo(iso: string): string {
  const then = new Date(iso).getTime()
  if (Number.isNaN(then)) return ''
  const diff = Math.max(0, Date.now() - then)
  const s = Math.floor(diff / 1000)
  if (s < 60) return 'baru saja'
  const m = Math.floor(s / 60)
  if (m < 60) return `${m} menit lalu`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h} jam lalu`
  const d = Math.floor(h / 24)
  if (d < 30) return `${d} hari lalu`
  const mo = Math.floor(d / 30)
  if (mo < 12) return `${mo} bulan lalu`
  return `${Math.floor(mo / 12)} tahun lalu`
}

export function AnnouncementBanner({ announcements, maxShow = 3, dismissible = true }: Props) {
  const [dismissed, setDismissed] = useState<Set<number>>(new Set())
  const [hydrated, setHydrated] = useState(false)

  useEffect(() => {
    if (typeof window === 'undefined') return
    const d = new Set<number>()
    for (const a of announcements) {
      try {
        if (sessionStorage.getItem(`dismissed_announcement_${a.id}`) === '1') d.add(a.id)
      } catch {}
    }
    setDismissed(d)
    setHydrated(true)
  }, [announcements])

  const handleDismiss = (id: number) => {
    try { sessionStorage.setItem(`dismissed_announcement_${id}`, '1') } catch {}
    setDismissed(prev => {
      const next = new Set(prev)
      next.add(id)
      return next
    })
  }

  if (!announcements || announcements.length === 0) return null

  const visible = (hydrated ? announcements.filter(a => !dismissed.has(a.id)) : announcements).slice(0, maxShow)
  if (visible.length === 0) return null

  return (
    <div className="flex flex-col gap-2" aria-live="polite" aria-atomic="false">
      {visible.map(a => {
        const style = PRIORITY_STYLES[a.priority] ?? PRIORITY_STYLES.normal
        const Icon = style.Icon
        return (
          <div
            key={a.id}
            role="alert"
            className={`relative flex items-start gap-3 rounded-xl border px-4 py-3 shadow-sm ${style.wrap}`}
          >
            <div className={`mt-0.5 shrink-0 ${style.icon}`}>
              <Icon size={20} weight="fill" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-baseline gap-x-2">
                <h3 className="text-sm font-bold sm:text-base">{a.title}</h3>
                <span className="text-xs text-stone-600 dark:text-zinc-400">{timeAgo(a.created_at)}</span>
              </div>
              <p className="mt-1 text-sm leading-relaxed opacity-90 whitespace-pre-wrap break-words">{a.message}</p>
            </div>
            {dismissible && (
              <button
                type="button"
                onClick={() => handleDismiss(a.id)}
                aria-label="Tutup pengumuman"
                className="shrink-0 rounded-md p-1 opacity-60 transition hover:bg-black/5 hover:opacity-100 dark:hover:bg-white/10"
              >
                <X size={16} weight="bold" />
              </button>
            )}
          </div>
        )
      })}
    </div>
  )
}

export default AnnouncementBanner
