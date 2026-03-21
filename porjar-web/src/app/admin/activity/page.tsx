'use client'

import { useEffect, useState, useCallback } from 'react'
import { toast } from 'sonner'
import { api } from '@/lib/api'
import { useAuthStore } from '@/store/auth-store'
import { AdminLayout } from '@/components/layouts/AdminLayout'
import { PageHeader } from '@/components/shared/PageHeader'
import { EmptyState } from '@/components/shared/EmptyState'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import {
  ClockCounterClockwise,
  CaretLeft,
  CaretRight,
  MagnifyingGlass,
  User as UserIcon,
} from '@phosphor-icons/react'
import { cn } from '@/lib/utils'

// === Types ===

interface ActivityLog {
  id: string
  user_id: string | null
  user_name: string | null
  user_avatar: string | null
  action: string
  entity_type: string
  entity_id: string | null
  details: Record<string, unknown> | null
  ip_address: string | null
  created_at: string
}

interface ActivityResponse {
  items: ActivityLog[]
  meta: {
    page: number
    per_page: number
    total: number
    total_pages: number
  }
}

// === Action labels & colors ===

const ACTION_LABELS: Record<string, string> = {
  TEAM_APPROVED: 'Menyetujui tim',
  MATCH_SCORE_UPDATED: 'Mengupdate skor',
  BRACKET_GENERATED: 'Membuat bracket',
  LOBBY_RESULTS_INPUT: 'Input hasil lobby',
  TOURNAMENT_STATUS_CHANGED: 'Mengubah status turnamen',
  USER_ROLE_CHANGED: 'Mengubah role pengguna',
  TEAM_REJECTED: 'Menolak tim',
  TEAM_CREATED: 'Membuat tim',
  TOURNAMENT_CREATED: 'Membuat turnamen',
  TOURNAMENT_UPDATED: 'Mengupdate turnamen',
  SCHEDULE_CREATED: 'Membuat jadwal',
  SCHEDULE_UPDATED: 'Mengupdate jadwal',
  SCHEDULE_DELETED: 'Menghapus jadwal',
  MATCH_COMPLETED: 'Menyelesaikan pertandingan',
  USER_CREATED: 'Membuat pengguna',
  USER_DELETED: 'Menghapus pengguna',
}

type ActionColor = 'green' | 'blue' | 'red' | 'amber'

function getActionColor(action: string): ActionColor {
  if (['TEAM_APPROVED', 'MATCH_COMPLETED'].includes(action)) return 'green'
  if (['TEAM_REJECTED', 'USER_DELETED', 'SCHEDULE_DELETED'].includes(action)) return 'red'
  if (
    [
      'MATCH_SCORE_UPDATED',
      'LOBBY_RESULTS_INPUT',
      'TOURNAMENT_STATUS_CHANGED',
      'USER_ROLE_CHANGED',
    ].includes(action)
  )
    return 'amber'
  return 'blue'
}

const colorMap: Record<ActionColor, { dot: string; bg: string; text: string; border: string }> = {
  green: {
    dot: 'bg-green-500',
    bg: 'bg-green-50',
    text: 'text-green-700',
    border: 'border-green-200',
  },
  blue: {
    dot: 'bg-blue-500',
    bg: 'bg-blue-50',
    text: 'text-blue-700',
    border: 'border-blue-200',
  },
  red: {
    dot: 'bg-red-500',
    bg: 'bg-red-50',
    text: 'text-red-700',
    border: 'border-red-200',
  },
  amber: {
    dot: 'bg-amber-500',
    bg: 'bg-amber-50',
    text: 'text-amber-700',
    border: 'border-amber-200',
  },
}

const ACTION_TYPE_OPTIONS = [
  { value: '', label: 'Semua Aksi' },
  { value: 'TEAM_APPROVED', label: 'Menyetujui tim' },
  { value: 'TEAM_REJECTED', label: 'Menolak tim' },
  { value: 'MATCH_SCORE_UPDATED', label: 'Mengupdate skor' },
  { value: 'BRACKET_GENERATED', label: 'Membuat bracket' },
  { value: 'LOBBY_RESULTS_INPUT', label: 'Input hasil lobby' },
  { value: 'TOURNAMENT_STATUS_CHANGED', label: 'Mengubah status turnamen' },
  { value: 'USER_ROLE_CHANGED', label: 'Mengubah role pengguna' },
]

export default function AdminActivityPage() {
  const { isAuthenticated, isLoading: authLoading } = useAuthStore()
  const [data, setData] = useState<ActivityResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [actionFilter, setActionFilter] = useState('')
  const [userSearch, setUserSearch] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')

  const loadData = useCallback(async () => {
    if (!isAuthenticated || authLoading) return
    setLoading(true)
    try {
      const params = new URLSearchParams()
      params.set('page', String(page))
      params.set('per_page', '20')
      if (actionFilter) params.set('action', actionFilter)
      if (userSearch.trim()) params.set('user', userSearch.trim())
      if (dateFrom) params.set('from', dateFrom)
      if (dateTo) params.set('to', dateTo)

      const result = await api.get<ActivityResponse>(`/admin/activity?${params.toString()}`)
      if (result) {
        result.items = result.items ?? []
      }
      setData(result)
    } catch {
      toast.error('Gagal memuat log aktivitas')
    } finally {
      setLoading(false)
    }
  }, [page, actionFilter, userSearch, dateFrom, dateTo, isAuthenticated, authLoading])

  useEffect(() => {
    loadData()
  }, [loadData])

  // Reset page when filters change
  useEffect(() => {
    setPage(1)
  }, [actionFilter, userSearch, dateFrom, dateTo])

  function getActionLabel(action: string): string {
    return ACTION_LABELS[action] ?? action.replace(/_/g, ' ').toLowerCase()
  }

  function formatTimestamp(ts: string): string {
    const date = new Date(ts)
    return date.toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  function getUserInitial(name: string | null): string {
    if (!name) return '?'
    return name
      .split(' ')
      .map((w) => w[0])
      .join('')
      .slice(0, 2)
      .toUpperCase()
  }

  return (
    <AdminLayout>
      <PageHeader
        title="Log Aktivitas"
        description="Riwayat aktivitas pengguna dan admin"
      />

      {/* Filters */}
      <div className="mb-4 sm:mb-6 flex flex-wrap items-end gap-3">
        {/* Date range */}
        <div>
          <label className="mb-1 block text-xs font-medium text-stone-500">Dari</label>
          <Input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className="h-9 w-40 bg-white border-stone-300 text-stone-900 text-sm focus:border-porjar-red focus:ring-porjar-red/20"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-stone-500">Sampai</label>
          <Input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            className="h-9 w-40 bg-white border-stone-300 text-stone-900 text-sm focus:border-porjar-red focus:ring-porjar-red/20"
          />
        </div>

        {/* Action type */}
        <div>
          <label className="mb-1 block text-xs font-medium text-stone-500">Tipe Aksi</label>
          <select
            value={actionFilter}
            onChange={(e) => setActionFilter(e.target.value)}
            className="h-9 rounded-md border border-stone-300 bg-white px-3 text-sm text-stone-900 outline-none focus:border-porjar-red focus:ring-porjar-red/20"
          >
            {ACTION_TYPE_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        {/* User search */}
        <div>
          <label className="mb-1 block text-xs font-medium text-stone-500">Cari Pengguna</label>
          <div className="relative">
            <MagnifyingGlass
              size={14}
              className="absolute left-2.5 top-1/2 -translate-y-1/2 text-stone-400"
            />
            <Input
              value={userSearch}
              onChange={(e) => setUserSearch(e.target.value)}
              placeholder="Nama pengguna..."
              className="h-9 w-48 pl-8 bg-white border-stone-300 text-stone-900 text-sm focus:border-porjar-red focus:ring-porjar-red/20"
            />
          </div>
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-16 rounded-lg bg-stone-200" />
          ))}
        </div>
      ) : !data || data.items.length === 0 ? (
        <EmptyState
          icon={ClockCounterClockwise}
          title="Belum Ada Aktivitas"
          description="Log aktivitas akan muncul di sini saat ada perubahan data."
        />
      ) : (
        <>
          {/* Timeline */}
          <div className="relative space-y-1">
            {/* Vertical line */}
            <div className="absolute left-5 top-4 bottom-4 w-px bg-stone-200" />

            {data.items.map((log) => {
              const actionColor = getActionColor(log.action)
              const colors = colorMap[actionColor]

              return (
                <div
                  key={log.id}
                  className="group relative flex items-start gap-4 rounded-lg px-2 py-3 transition-colors hover:bg-red-50/50"
                >
                  {/* Avatar / dot */}
                  <div className="relative z-10 flex-shrink-0">
                    {log.user_avatar ? (
                      <img
                        src={log.user_avatar}
                        alt={log.user_name ?? ''}
                        className="h-10 w-10 rounded-full border-2 border-stone-200 object-cover"
                      />
                    ) : (
                      <div
                        className={cn(
                          'flex h-10 w-10 items-center justify-center rounded-full border-2 text-xs font-bold',
                          colors.bg,
                          colors.border,
                          colors.text
                        )}
                      >
                        {log.user_name ? (
                          getUserInitial(log.user_name)
                        ) : (
                          <UserIcon size={16} />
                        )}
                      </div>
                    )}
                    {/* Color dot indicator */}
                    <div
                      className={cn(
                        'absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-porjar-bg',
                        colors.dot
                      )}
                    />
                  </div>

                  {/* Content */}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-medium text-stone-900">
                        {log.user_name ?? 'Sistem'}
                      </span>
                      <span
                        className={cn(
                          'inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide',
                          colors.bg,
                          colors.text
                        )}
                      >
                        {getActionLabel(log.action)}
                      </span>
                    </div>

                    {/* Entity info */}
                    {log.entity_type && (
                      <p className="mt-0.5 text-xs text-stone-400">
                        {log.entity_type}
                        {log.entity_id && (
                          <span className="ml-1 font-mono text-stone-400">
                            #{log.entity_id.slice(0, 8)}
                          </span>
                        )}
                      </p>
                    )}

                    {/* Details */}
                    {log.details && Object.keys(log.details).length > 0 && (
                      <p className="mt-1 text-xs text-stone-400 line-clamp-1">
                        {JSON.stringify(log.details)}
                      </p>
                    )}
                  </div>

                  {/* Timestamp & IP */}
                  <div className="flex-shrink-0 text-right">
                    <p className="text-xs text-stone-500">{formatTimestamp(log.created_at)}</p>
                    {log.ip_address && (
                      <p className="mt-0.5 font-mono text-[10px] text-stone-400">
                        {log.ip_address}
                      </p>
                    )}
                  </div>
                </div>
              )
            })}
          </div>

          {/* Pagination */}
          {data.meta.total_pages > 1 && (
            <div className="mt-6 flex items-center justify-between">
              <p className="text-xs text-stone-400">
                Halaman {data.meta.page} dari {data.meta.total_pages} ({data.meta.total} aktivitas)
              </p>
              <div className="flex items-center gap-1">
                <Button
                  size="sm"
                  variant="ghost"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => p - 1)}
                  className="text-stone-500 hover:text-stone-900"
                >
                  <CaretLeft size={16} />
                </Button>
                <span className="px-2 text-sm text-stone-700 tabular-nums">{page}</span>
                <Button
                  size="sm"
                  variant="ghost"
                  disabled={page >= data.meta.total_pages}
                  onClick={() => setPage((p) => p + 1)}
                  className="text-stone-500 hover:text-stone-900"
                >
                  <CaretRight size={16} />
                </Button>
              </div>
            </div>
          )}
        </>
      )}
    </AdminLayout>
  )
}
