'use client'

import { useCallback, useEffect, useState } from 'react'
import { useAuthStore } from '@/store/auth-store'
import {
  BellSimple,
  Trophy,
  XCircle,
  Sword,
  Target,
  CheckCircle,
  FunnelSimple,
} from '@phosphor-icons/react'
import { api } from '@/lib/api'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { DashboardLayout } from '@/components/layouts/DashboardLayout'
import { Button } from '@/components/ui/button'
import type { PaginationMeta } from '@/types'

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

const typeIcons: Record<string, typeof Trophy> = {
  team_approved: CheckCircle,
  team_rejected: XCircle,
  match_starting: Sword,
  score_update: Target,
  registration_confirmed: Trophy,
}

const typeColors: Record<string, string> = {
  team_approved: 'bg-emerald-50 text-emerald-600',
  team_rejected: 'bg-red-50 text-red-500',
  match_starting: 'bg-amber-50 text-amber-600',
  score_update: 'bg-blue-50 text-blue-600',
  registration_confirmed: 'bg-purple-50 text-purple-600',
}

function formatDate(dateStr: string): string {
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
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function getDateLabel(dateStr: string): string {
  const date = new Date(dateStr)
  const now = new Date()
  const diffDays = Math.floor((now.getTime() - date.getTime()) / 86400000)
  if (diffDays === 0) return 'Hari ini'
  if (diffDays === 1) return 'Kemarin'
  if (diffDays < 7) return `${diffDays} hari lalu`
  return date.toLocaleDateString('id-ID', { day: 'numeric', month: 'long' })
}

type FilterType = 'all' | 'unread'

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
      const { data, meta } = await api.getPaginated<Notification[]>(`/notifications?page=${page}&limit=20`)
      let items: Notification[] = data ?? []
      if (filter === 'unread') {
        items = items.filter((n: Notification) => !n.is_read)
      }
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

  const totalPages = meta?.total_pages ?? 1

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-xl font-bold text-stone-900">Notifikasi</h1>
            <p className="mt-1 text-sm text-stone-500">
              Pantau semua pemberitahuan terkait tim dan pertandingan Anda
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={handleMarkAllRead} className="text-stone-600 hover:text-stone-900">
              Tandai semua dibaca
            </Button>
          </div>
        </div>

        {/* Filter */}
        <div className="flex items-center gap-2">
          <FunnelSimple size={16} className="text-stone-400" />
          <button
            onClick={() => { setFilter('all'); setPage(1) }}
            className={cn(
              'rounded-lg px-3 py-1.5 text-xs font-medium transition-colors',
              filter === 'all'
                ? 'bg-porjar-red text-white'
                : 'text-stone-500 hover:text-stone-700'
            )}
          >
            Semua
          </button>
          <button
            onClick={() => { setFilter('unread'); setPage(1) }}
            className={cn(
              'rounded-lg px-3 py-1.5 text-xs font-medium transition-colors',
              filter === 'unread'
                ? 'bg-porjar-red text-white'
                : 'text-stone-500 hover:text-stone-700'
            )}
          >
            Belum dibaca
          </button>
        </div>

        {/* Notification list */}
        <div className="overflow-hidden rounded-xl border border-stone-200 bg-white shadow-sm">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-stone-300 border-t-porjar-red" />
            </div>
          ) : notifications.length === 0 ? (
            <div className="py-12 text-center">
              <BellSimple size={40} className="mx-auto text-stone-300" />
              <p className="mt-3 text-sm text-stone-400">
                {filter === 'unread'
                  ? 'Tidak ada notifikasi yang belum dibaca'
                  : 'Belum ada notifikasi'}
              </p>
            </div>
          ) : (
            <div className="divide-y divide-stone-100">
              {notifications.map((notif, index) => {
                const IconComp = typeIcons[notif.type] || BellSimple
                const colorClass = typeColors[notif.type] || 'bg-stone-100 text-stone-500'
                const label = getDateLabel(notif.created_at)
                const prevLabel = index > 0 ? getDateLabel(notifications[index - 1].created_at) : null
                const showLabel = label !== prevLabel

                return (
                  <div key={notif.id}>
                    {showLabel && (
                      <div className="sticky top-0 z-10 border-b border-stone-100 bg-stone-50 px-4 py-2">
                        <span className="text-xs font-semibold uppercase tracking-wider text-stone-400">
                          {label}
                        </span>
                      </div>
                    )}
                    <button
                      onClick={() => !notif.is_read && handleMarkRead(notif.id)}
                      className={cn(
                        'flex w-full items-start gap-4 px-4 py-4 text-left transition-colors hover:bg-stone-50',
                        !notif.is_read && 'bg-red-50/30'
                      )}
                    >
                      <div
                        className={cn(
                          'mt-0.5 flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full',
                          colorClass
                        )}
                      >
                        <IconComp size={20} weight="fill" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p
                            className={cn(
                              'text-sm',
                              notif.is_read ? 'text-stone-500' : 'font-semibold text-stone-900'
                            )}
                          >
                            {notif.title}
                          </p>
                          {!notif.is_read && (
                            <span className="h-2 w-2 flex-shrink-0 rounded-full bg-porjar-red" />
                          )}
                        </div>
                        <p className="mt-1 text-sm text-stone-400">{notif.message}</p>
                        <p className="mt-2 text-xs text-stone-400">
                          {formatDate(notif.created_at)}
                        </p>
                      </div>
                    </button>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
              className="text-stone-600"
            >
              Sebelumnya
            </Button>
            <span className="text-sm text-stone-500">
              Halaman {page} dari {totalPages}
            </span>
            <Button
              variant="ghost"
              size="sm"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => p + 1)}
              className="text-stone-600"
            >
              Selanjutnya
            </Button>
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}
