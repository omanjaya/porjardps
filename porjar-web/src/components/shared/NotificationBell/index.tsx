'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import {
  BellSimple,
  Trophy,
  XCircle,
  Sword,
  Target,
  CheckCircle,
} from '@phosphor-icons/react'
import { api } from '@/lib/api'
import { getLiveScoreClient } from '@/lib/ws'
import { useAuthStore } from '@/store/auth-store'
import { cn } from '@/lib/utils'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'

function getActionLink(type: string): { label: string; href: string } | null {
  switch (type) {
    case 'submission_approved':
    case 'submission_rejected':
      return { label: 'Lihat Submission', href: '/dashboard/submit-result' }
    case 'match_starting':
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

interface NotificationsResponse {
  items: Notification[]
  total: number
}

const typeIcons: Record<string, typeof Trophy> = {
  team_approved: CheckCircle,
  team_rejected: XCircle,
  match_starting: Sword,
  match_result: Trophy,
  score_update: Target,
  registration_confirmed: Trophy,
}

function timeAgo(dateStr: string): string {
  const now = new Date()
  const date = new Date(dateStr)
  const diffMs = now.getTime() - date.getTime()
  const diffMin = Math.floor(diffMs / 60000)

  if (diffMin < 1) return 'baru saja'
  if (diffMin < 60) return `${diffMin} menit lalu`

  const diffHr = Math.floor(diffMin / 60)
  if (diffHr < 24) return `${diffHr} jam lalu`

  const diffDay = Math.floor(diffHr / 24)
  if (diffDay < 7) return `${diffDay} hari lalu`

  return date.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })
}

export function NotificationBell() {
  const { user, isAuthenticated } = useAuthStore()
  const router = useRouter()
  const [isOpen, setIsOpen] = useState(false)
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [isLoading, setIsLoading] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const bellRef = useRef<HTMLButtonElement>(null)
  const [dropdownPos, setDropdownPos] = useState<{ top: number; right: number } | null>(null)

  // Calculate dropdown position from bell button
  useEffect(() => {
    if (!isOpen || !bellRef.current) return
    const rect = bellRef.current.getBoundingClientRect()
    setDropdownPos({
      top: rect.bottom + 8,
      right: window.innerWidth - rect.right,
    })
  }, [isOpen])

  // Fetch unread count
  const fetchUnreadCount = useCallback(async () => {
    if (!isAuthenticated) return
    try {
      const data = await api.get<{ count: number }>('/notifications/unread-count')
      setUnreadCount(data.count)
    } catch (err) {
      console.error('Gagal memuat jumlah notifikasi:', err)
    }
  }, [isAuthenticated])

  // Fetch recent notifications (merges personal + active announcements)
  const fetchNotifications = useCallback(async () => {
    if (!isAuthenticated) return
    setIsLoading(true)
    try {
      const data = await api.get<Notification[]>('/notifications?limit=5')
      let merged: Notification[] = data ?? []

      // Try to fetch active announcements (endpoint may not exist yet — fail silently)
      try {
        const announcements = await api.get<Notification[]>('/announcements/active')
        if (Array.isArray(announcements) && announcements.length > 0) {
          const mapped = announcements.map((a) => ({
            ...a,
            type: a.type || 'announcement',
            is_read: true, // announcements are global, not per-user read state
          }))
          merged = [...mapped, ...merged]
        }
      } catch {
        // endpoint not available yet — ignore
      }

      setNotifications(merged.slice(0, 5))
    } catch (err) {
      console.error('Gagal memuat notifikasi:', err)
    } finally {
      setIsLoading(false)
    }
  }, [isAuthenticated])

  // Initial fetch + 60s polling fallback (in case WS drops)
  useEffect(() => {
    fetchUnreadCount()
    if (!isAuthenticated) return
    const id = setInterval(fetchUnreadCount, 60000)
    return () => clearInterval(id)
  }, [fetchUnreadCount, isAuthenticated])

  // Fetch notifications when dropdown opens
  useEffect(() => {
    if (isOpen) {
      fetchNotifications()
    }
  }, [isOpen, fetchNotifications])

  // WebSocket subscription for real-time notifications
  useEffect(() => {
    if (!isAuthenticated || !user?.id) return

    const wsClient = getLiveScoreClient()
    wsClient.connect()
    wsClient.subscribe(`user#${user.id}`)

    const unsubscribe = wsClient.on('notification', (msg) => {
      const notif = msg.data as Notification
      setNotifications((prev) => [notif, ...prev].slice(0, 10))
      setUnreadCount((prev) => prev + 1)
    })

    const unsubscribeNewSubmission = wsClient.on('new_submission', (msg) => {
      if (user?.role !== 'admin' && user?.role !== 'superadmin') return
      const data = msg.data as { submission_id?: string; match_type?: string; game_name?: string }
      setUnreadCount((prev) => prev + 1)
      toast('Submission baru masuk', {
        description: `${data.game_name || 'Pertandingan'} - menunggu verifikasi`,
        action: {
          label: 'Lihat',
          onClick: () => router.push('/admin/submissions'),
        },
        duration: 8000,
      })
    })

    return () => {
      unsubscribe()
      unsubscribeNewSubmission()
      wsClient.unsubscribe(`user#${user.id}`)
    }
  }, [isAuthenticated, user?.id, user?.role, router])

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Mark single as read
  async function handleMarkRead(id: string) {
    try {
      await api.put(`/notifications/${id}/read`)
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, is_read: true } : n))
      )
      setUnreadCount((prev) => Math.max(0, prev - 1))
    } catch (err) {
      console.error('Gagal menandai notifikasi:', err)
    }
  }

  // Mark all as read
  async function handleMarkAllRead() {
    try {
      await api.put('/notifications/read-all')
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })))
      setUnreadCount(0)
    } catch (err) {
      console.error('Gagal menandai semua notifikasi:', err)
    }
  }

  if (!isAuthenticated) return null

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        ref={bellRef}
        onClick={() => setIsOpen(!isOpen)}
        className="relative rounded-lg p-2 text-stone-500 dark:text-zinc-400 transition-colors hover:bg-stone-100 dark:hover:bg-zinc-800 hover:text-stone-800 dark:hover:text-zinc-100"
        aria-label="Notifikasi"
      >
        <BellSimple size={20} weight={isOpen ? 'fill' : 'regular'} />
        {unreadCount > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div
          className="fixed inset-x-3 z-[100] overflow-hidden rounded-xl border border-stone-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 shadow-xl sm:inset-x-auto sm:w-96"
          style={dropdownPos ? { top: dropdownPos.top, right: Math.max(dropdownPos.right, 12) } : { top: '4rem' }}
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-stone-200 dark:border-zinc-700 px-4 py-3">
            <h3 className="text-sm font-semibold text-stone-900 dark:text-zinc-100">Notifikasi</h3>
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllRead}
                className="text-xs text-esi-red transition-colors hover:text-red-700"
              >
                Tandai semua dibaca
              </button>
            )}
          </div>

          {/* Notification list */}
          <div className="max-h-96 overflow-y-auto">
            {isLoading ? (
              <div role="status" aria-live="polite" className="flex items-center justify-center py-8">
                <div className="h-5 w-5 animate-spin rounded-full border-2 border-stone-200 dark:border-zinc-700 border-t-esi-red" />
                <span className="sr-only">Memuat notifikasi...</span>
              </div>
            ) : notifications.length === 0 ? (
              <div role="status" className="py-8 text-center text-sm text-stone-400 dark:text-zinc-500">
                Tidak ada notifikasi
              </div>
            ) : (
              notifications.map((notif) => {
                const IconComp = typeIcons[notif.type] || BellSimple
                const action = getActionLink(notif.type)
                return (
                  <button
                    key={notif.id}
                    onClick={() => {
                      if (!notif.is_read) handleMarkRead(notif.id)
                      if (action) {
                        setIsOpen(false)
                        router.push(action.href)
                      }
                    }}
                    className={cn(
                      'flex w-full items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-stone-50 dark:hover:bg-zinc-800',
                      !notif.is_read && 'bg-stone-50/50 dark:bg-zinc-800/50',
                      action && 'cursor-pointer'
                    )}
                  >
                    <div
                      className={cn(
                        'mt-0.5 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full',
                        notif.type === 'team_approved'
                          ? 'bg-emerald-500/20 text-emerald-400'
                          : notif.type === 'team_rejected'
                            ? 'bg-red-500/20 text-red-400'
                            : notif.type === 'match_starting'
                              ? 'bg-amber-500/20 text-amber-400'
                              : notif.type === 'match_result'
                                ? 'bg-yellow-500/20 text-yellow-500'
                                : 'bg-blue-500/20 text-blue-400'
                      )}
                    >
                      <IconComp size={16} weight="fill" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p
                          className={cn(
                            'text-sm truncate',
                            notif.is_read ? 'text-stone-400 dark:text-zinc-500' : 'font-medium text-stone-900 dark:text-zinc-100'
                          )}
                        >
                          {notif.title}
                        </p>
                        {!notif.is_read && (
                          <span className="h-2 w-2 flex-shrink-0 rounded-full bg-esi-red" />
                        )}
                      </div>
                      <p className="mt-0.5 text-xs text-stone-500 dark:text-zinc-400 line-clamp-2">
                        {notif.message}
                      </p>
                      <div className="mt-1 flex items-center gap-2">
                        <p className="text-[10px] text-stone-400 dark:text-zinc-500">
                          {timeAgo(notif.created_at)}
                        </p>
                        {action && (
                          <span className="text-[10px] font-medium text-esi-red">
                            {action.label} →
                          </span>
                        )}
                      </div>
                    </div>
                  </button>
                )
              })
            )}
          </div>

          {/* Footer */}
          <div className="border-t border-stone-200 dark:border-zinc-700 px-4 py-2.5">
            <Link
              href="/dashboard/notifications"
              onClick={() => setIsOpen(false)}
              className="block text-center text-xs font-medium text-esi-red transition-colors hover:text-red-700"
            >
              Lihat semua
            </Link>
          </div>
        </div>
      )}
    </div>
  )
}
