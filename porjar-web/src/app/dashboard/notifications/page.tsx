'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useAuthStore } from '@/store/auth-store'
import {
  BellSimple,
  Trophy,
  XCircle,
  Lightning,
  Target,
  CheckCircle,
  Clock,
  UsersThree,
  FunnelSimple,
  ArrowRight,
} from '@phosphor-icons/react'
import { api } from '@/lib/api'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { DashboardLayout } from '@/components/layouts/DashboardLayout'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import type { PaginationMeta } from '@/types'

/* ─── Action link resolver ─── */

function getActionLink(type: string): { label: string; href: string } | null {
  switch (type) {
    case 'submission_approved':
    case 'submission_rejected':
      return { label: 'Lihat Submission', href: '/dashboard/submit-result' }
    case 'match_starting':
    case 'match_reminder':
    case 'match_result':
    case 'match_completed':
    case 'score_update':
      return { label: 'Lihat Match', href: '/dashboard/my-matches' }
    case 'new_submission':
      return { label: 'Lihat Submission', href: '/admin/submissions' }
    case 'team_approved':
    case 'team_rejected':
      return { label: 'Lihat Tim', href: '/dashboard/teams' }
    case 'registration_confirmed':
      return { label: 'Lihat Turnamen', href: '/dashboard/tournament' }
    default:
      return null
  }
}

/* ─── Types ─── */

interface Notification {
  id: string
  user_id: string
  type: string
  title: string
  message: string
  data: Record<string, unknown> | null
  is_read: boolean
  created_at: string
}

type FilterType = 'all' | 'unread'

/* ─── Icon + color mapping per notification type ─── */

const typeConfig: Record<
  string,
  {
    icon: typeof Trophy
    iconBg: string
    iconColor: string
    borderColor: string
  }
> = {
  submission_approved: {
    icon: CheckCircle,
    iconBg: 'bg-emerald-100',
    iconColor: 'text-emerald-600',
    borderColor: 'border-l-emerald-500',
  },
  submission_rejected: {
    icon: XCircle,
    iconBg: 'bg-red-100',
    iconColor: 'text-red-500',
    borderColor: 'border-l-red-500',
  },
  match_reminder: {
    icon: Clock,
    iconBg: 'bg-amber-100',
    iconColor: 'text-amber-600',
    borderColor: 'border-l-amber-500',
  },
  match_starting: {
    icon: Lightning,
    iconBg: 'bg-red-100',
    iconColor: 'text-red-500',
    borderColor: 'border-l-red-500',
  },
  match_result: {
    icon: Trophy,
    iconBg: 'bg-amber-100',
    iconColor: 'text-amber-600',
    borderColor: 'border-l-amber-500',
  },
  score_update: {
    icon: Target,
    iconBg: 'bg-blue-100',
    iconColor: 'text-blue-600',
    borderColor: 'border-l-blue-500',
  },
  team_approved: {
    icon: UsersThree,
    iconBg: 'bg-emerald-100',
    iconColor: 'text-emerald-600',
    borderColor: 'border-l-emerald-500',
  },
  team_rejected: {
    icon: UsersThree,
    iconBg: 'bg-red-100',
    iconColor: 'text-red-500',
    borderColor: 'border-l-red-500',
  },
  registration_confirmed: {
    icon: Trophy,
    iconBg: 'bg-purple-100',
    iconColor: 'text-purple-600',
    borderColor: 'border-l-purple-500',
  },
}

const defaultConfig = {
  icon: BellSimple,
  iconBg: 'bg-stone-100 dark:bg-zinc-800',
  iconColor: 'text-stone-500 dark:text-zinc-400',
  borderColor: 'border-l-stone-300 dark:border-l-zinc-600',
}

/* ─── Date helpers ─── */

function formatRelativeDate(dateStr: string): string {
  const date = new Date(dateStr)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMin = Math.floor(diffMs / 60000)

  if (diffMin < 1) return 'baru saja'
  if (diffMin < 60) return `${diffMin} menit lalu`

  const diffHr = Math.floor(diffMin / 60)
  if (diffHr < 24) return `${diffHr} jam lalu`

  const diffDay = Math.floor(diffHr / 24)
  if (diffDay < 7) return `${diffDay} hari lalu`

  return date.toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

function formatAbsoluteDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('id-ID', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function getGroupLabel(dateStr: string): string {
  const date = new Date(dateStr)
  const now = new Date()

  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const startOfYesterday = new Date(startOfToday.getTime() - 86400000)
  const startOfWeek = new Date(startOfToday.getTime() - startOfToday.getDay() * 86400000)

  if (date >= startOfToday) return 'Hari Ini'
  if (date >= startOfYesterday) return 'Kemarin'
  if (date >= startOfWeek) return 'Minggu Ini'

  return date.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })
}

/* ─── Component ─── */

export default function NotificationsPage() {
  const { isAuthenticated, isLoading: authLoading } = useAuthStore()
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [meta, setMeta] = useState<PaginationMeta | null>(null)
  const [page, setPage] = useState(1)
  const [filter, setFilter] = useState<FilterType>('all')
  const [isLoading, setIsLoading] = useState(true)

  const fetchNotifications = useCallback(async () => {
    if (!isAuthenticated || authLoading) return
    setIsLoading(true)
    try {
      const { data, meta } = await api.getPaginated<Notification[]>(
        `/notifications?page=${page}&limit=20`
      )
      const items: Notification[] = data ?? []
      setNotifications(items)
      setMeta(meta)
    } catch {
      toast.error('Gagal memuat notifikasi')
    } finally {
      setIsLoading(false)
    }
  }, [page, filter, isAuthenticated, authLoading])

  useEffect(() => {
    fetchNotifications()
  }, [fetchNotifications])

  const displayedNotifications = useMemo(
    () => filter === 'unread' ? notifications.filter((n) => !n.is_read) : notifications,
    [notifications, filter]
  )

  const unreadCount = useMemo(
    () => notifications.filter((n) => !n.is_read).length,
    [notifications]
  )

  async function handleMarkRead(id: string) {
    try {
      await api.put(`/notifications/${id}/read`)
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, is_read: true } : n))
      )
    } catch {
      toast.error('Gagal menandai notifikasi')
    }
  }

  async function handleMarkAllRead() {
    try {
      await api.put('/notifications/read-all')
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })))
    } catch {
      toast.error('Gagal menandai semua notifikasi')
    }
  }

  /* Group notifications by date label */
  const grouped = useMemo(() => {
    const groups: { label: string; items: Notification[] }[] = []
    for (const notif of displayedNotifications) {
      const label = getGroupLabel(notif.created_at)
      const last = groups[groups.length - 1]
      if (last && last.label === label) {
        last.items.push(notif)
      } else {
        groups.push({ label, items: [notif] })
      }
    }
    return groups
  }, [notifications])

  const totalPages = meta?.total_pages ?? 1

  return (
    <DashboardLayout>
      <div className="space-y-5">
        {/* Header */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-xl font-bold text-stone-900 dark:text-zinc-100">Notifikasi</h1>
            <p className="mt-0.5 text-sm text-stone-500 dark:text-zinc-400">
              {unreadCount > 0 && !isLoading ? (
                <>
                  <span className="font-medium text-esi-red">{unreadCount} belum dibaca</span>
                  {' \u00b7 '}
                </>
              ) : null}
              Pantau semua pemberitahuan terkait tim dan pertandingan Anda
            </p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleMarkAllRead}
            className="self-start text-stone-600 dark:text-zinc-400 hover:text-stone-900 dark:hover:text-zinc-100"
          >
            Tandai semua dibaca
          </Button>
        </div>

        {/* Filter pills */}
        <div className="flex items-center gap-2">
          <FunnelSimple size={16} className="text-stone-400 dark:text-zinc-500" />
          <button
            onClick={() => {
              setFilter('all')
              setPage(1)
            }}
            className={cn(
              'rounded-lg px-3 py-1.5 text-xs font-medium transition-colors',
              filter === 'all'
                ? 'bg-esi-red text-white'
                : 'text-stone-500 dark:text-zinc-400 hover:text-stone-700 dark:hover:text-zinc-300'
            )}
          >
            Semua
          </button>
          <button
            onClick={() => {
              setFilter('unread')
              setPage(1)
            }}
            className={cn(
              'rounded-lg px-3 py-1.5 text-xs font-medium transition-colors',
              filter === 'unread'
                ? 'bg-esi-red text-white'
                : 'text-stone-500 dark:text-zinc-400 hover:text-stone-700 dark:hover:text-zinc-300'
            )}
          >
            Belum dibaca
          </button>
        </div>

        {/* Notification list */}
        {isLoading ? (
          <div className="flex items-center justify-center rounded-xl border border-stone-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 py-16 shadow-sm">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-stone-300 dark:border-zinc-600 border-t-esi-red" />
          </div>
        ) : displayedNotifications.length === 0 ? (
          /* ── Empty state ── */
          <div className="flex flex-col items-center justify-center rounded-xl border border-stone-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 py-16 shadow-sm">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-stone-100 dark:bg-zinc-800">
              <BellSimple size={32} className="text-stone-300 dark:text-zinc-600" weight="fill" />
            </div>
            <p className="mt-4 text-base font-semibold text-stone-700 dark:text-zinc-300">
              Tidak ada notifikasi
            </p>
            <p className="mt-1 max-w-xs text-center text-sm text-stone-400 dark:text-zinc-500">
              {filter === 'unread'
                ? 'Semua notifikasi sudah dibaca. Bagus!'
                : 'Notifikasi tentang pertandingan, tim, dan submission akan muncul di sini.'}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {grouped.map((group) => (
              <div key={group.label}>
                {/* Date group header */}
                <div className="mb-2 flex items-center gap-2 px-1">
                  <span className="text-xs font-semibold uppercase tracking-wider text-stone-400 dark:text-zinc-500">
                    {group.label}
                  </span>
                  <div className="h-px flex-1 bg-stone-200 dark:bg-zinc-700" />
                </div>

                {/* Cards in group */}
                <div className="space-y-2">
                  {group.items.map((notif) => {
                    const config = typeConfig[notif.type] ?? defaultConfig
                    const IconComp = config.icon
                    const action = getActionLink(notif.type)

                    return (
                      <div
                        key={notif.id}
                        className={cn(
                          'group relative overflow-hidden rounded-xl border border-stone-200 dark:border-zinc-700 border-l-4 bg-white dark:bg-zinc-900 shadow-sm transition-all',
                          config.borderColor,
                          !notif.is_read && 'ring-1 ring-stone-200/60 dark:ring-zinc-700/60 bg-white dark:bg-zinc-900'
                        )}
                      >
                        <button
                          onClick={() => !notif.is_read && handleMarkRead(notif.id)}
                          className={cn(
                            'flex w-full items-start gap-3 p-3 text-left transition-colors sm:gap-4 sm:p-4',
                            !notif.is_read
                              ? 'hover:bg-stone-50/80 dark:hover:bg-zinc-800/80'
                              : 'opacity-75 hover:opacity-100'
                          )}
                        >
                          {/* Icon */}
                          <div
                            className={cn(
                              'mt-0.5 flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full sm:h-11 sm:w-11',
                              config.iconBg,
                              config.iconColor
                            )}
                          >
                            <IconComp size={22} weight="fill" />
                          </div>

                          {/* Content */}
                          <div className="min-w-0 flex-1">
                            <div className="flex items-start justify-between gap-2">
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-2">
                                  <p
                                    className={cn(
                                      'truncate text-sm leading-snug',
                                      notif.is_read
                                        ? 'text-stone-500 dark:text-zinc-400'
                                        : 'font-semibold text-stone-900 dark:text-zinc-100'
                                    )}
                                  >
                                    {notif.title}
                                  </p>
                                  {!notif.is_read && (
                                    <span className="mt-0.5 h-2 w-2 flex-shrink-0 rounded-full bg-esi-red" />
                                  )}
                                </div>
                                <p className="mt-0.5 text-sm leading-relaxed text-stone-500 dark:text-zinc-400 line-clamp-2">
                                  {notif.message}
                                </p>
                              </div>

                              {/* Timestamp (desktop) */}
                              <span
                                className="hidden flex-shrink-0 text-xs text-stone-400 dark:text-zinc-500 sm:block"
                                title={formatAbsoluteDate(notif.created_at)}
                              >
                                {formatRelativeDate(notif.created_at)}
                              </span>
                            </div>

                            {/* Bottom row: timestamp (mobile) + action link */}
                            <div className="mt-2 flex items-center gap-3">
                              <span
                                className="text-xs text-stone-400 dark:text-zinc-500 sm:hidden"
                                title={formatAbsoluteDate(notif.created_at)}
                              >
                                {formatRelativeDate(notif.created_at)}
                              </span>

                              {action && (
                                <Link
                                  href={action.href}
                                  onClick={(e) => e.stopPropagation()}
                                  className={cn(
                                    'inline-flex items-center gap-1 rounded-md px-2.5 py-1 text-xs font-medium transition-colors',
                                    'bg-stone-100 dark:bg-zinc-800 text-stone-700 dark:text-zinc-300 hover:bg-esi-red hover:text-white'
                                  )}
                                >
                                  {action.label}
                                  <ArrowRight size={12} weight="bold" />
                                </Link>
                              )}

                              {/* Tap to read hint (mobile, unread only) */}
                              {!notif.is_read && (
                                <span className="ml-auto text-[10px] text-stone-300 dark:text-zinc-600 sm:hidden">
                                  ketuk untuk tandai dibaca
                                </span>
                              )}
                            </div>
                          </div>
                        </button>
                      </div>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-2 pt-2">
            <Button
              variant="ghost"
              size="sm"
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
              className="text-stone-600 dark:text-zinc-400"
            >
              Sebelumnya
            </Button>
            <span className="text-sm text-stone-500 dark:text-zinc-400">
              Halaman {page} dari {totalPages}
            </span>
            <Button
              variant="ghost"
              size="sm"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => p + 1)}
              className="text-stone-600 dark:text-zinc-400"
            >
              Selanjutnya
            </Button>
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}
