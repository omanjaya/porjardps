'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { api } from '@/lib/api'
import { DashboardLayout } from '@/components/layouts/DashboardLayout'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { EmptyState } from '@/components/shared/EmptyState'
import { Skeleton } from '@/components/ui/skeleton'
import { relativeTime } from '@/lib/relativeTime'
import {
  ListBullets,
  Clock,
  CheckCircle,
  XCircle,
  WarningCircle,
  CaretRight,
} from '@phosphor-icons/react'
import { useWebSocket } from '@/hooks/useWebSocket'
import { useAuthStore } from '@/store/auth-store'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { useRouter } from 'next/navigation'

interface Submission {
  id: string
  match_id: string
  tournament_name?: string
  status: 'pending' | 'approved' | 'rejected' | 'disputed'
  score_a?: number
  score_b?: number
  screenshots?: string[]
  rejection_reason?: string | null
  created_at: string
  verified_at?: string | null
}

type Filter = 'all' | 'pending' | 'approved' | 'rejected'

export default function SubmissionsPage() {
  const [subs, setSubs] = useState<Submission[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<Filter>('all')
  const userId = useAuthStore((s) => s.user?.id)
  const router = useRouter()

  const load = useCallback(async () => {
    try {
      const data = await api.get<Submission[]>('/submissions/my')
      setSubs(Array.isArray(data) ? data : [])
    } catch {
      setSubs([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  // Channel uses '#' separator — Centrifugo personal channel syntax: user#<id>
  useWebSocket({
    channels: userId ? [`user#${userId}`] : [],
    messageTypes: ['notification'],
    onMessage: (msg) => {
      const inner = (msg.data ?? {}) as Record<string, unknown>
      const notifType = typeof inner.type === 'string' ? inner.type : ''
      if (notifType === 'submission_approved') toast.success('Submission disetujui!')
      if (notifType === 'submission_rejected') toast.error('Submission ditolak')
      load()
    },
  })

  const filtered = useMemo(
    () => (filter === 'all' ? subs : subs.filter((s) => s.status === filter)),
    [subs, filter]
  )

  const counts = useMemo(
    () => ({
      all: subs.length,
      pending: subs.filter((s) => s.status === 'pending').length,
      approved: subs.filter((s) => s.status === 'approved').length,
      rejected: subs.filter((s) => s.status === 'rejected').length,
    }),
    [subs]
  )

  return (
    <DashboardLayout>
      <div className="mx-auto max-w-4xl px-4 sm:px-6 py-6 sm:py-10">
        {/* Breadcrumb */}
        <div className="mb-4 flex items-center gap-2 text-sm text-stone-500 dark:text-zinc-400">
          <Link href="/dashboard" className="hover:text-esi-red">
            Dashboard
          </Link>
          <CaretRight size={12} />
          <span className="text-stone-900 dark:text-zinc-100 font-medium">Pengajuan Saya</span>
        </div>

        {/* Header */}
        <div className="mb-6 sm:mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-esi-red/10">
              <ListBullets size={22} weight="duotone" className="text-esi-red" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-black text-stone-900 dark:text-zinc-100">
                Pengajuan Saya
              </h1>
              <p className="text-sm text-stone-500 dark:text-zinc-400">
                Status semua hasil pertandingan yang kamu ajukan
              </p>
            </div>
          </div>
        </div>

        {/* Filter pills */}
        <div className="flex gap-2 mb-6 overflow-x-auto">
          {([
            { key: 'all', label: 'Semua', count: counts.all },
            { key: 'pending', label: 'Menunggu', count: counts.pending },
            { key: 'approved', label: 'Disetujui', count: counts.approved },
            { key: 'rejected', label: 'Ditolak', count: counts.rejected },
          ] as { key: Filter; label: string; count: number }[]).map((f) => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={cn(
                'flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-semibold whitespace-nowrap transition-all',
                filter === f.key
                  ? 'bg-esi-red text-white'
                  : 'bg-stone-100 dark:bg-zinc-800 text-stone-600 dark:text-zinc-400 hover:bg-stone-200 dark:hover:bg-zinc-700'
              )}
            >
              {f.label}
              <span
                className={cn(
                  'ml-1 rounded-full px-1.5 py-0.5 text-[10px] font-bold',
                  filter === f.key ? 'bg-white/20' : 'bg-stone-200 dark:bg-zinc-700'
                )}
              >
                {f.count}
              </span>
            </button>
          ))}
        </div>

        {/* Loading */}
        {loading && (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-24 rounded-xl bg-stone-100 dark:bg-zinc-800" />
            ))}
          </div>
        )}

        {/* Empty state */}
        {!loading && filtered.length === 0 && (
          <EmptyState
            icon={ListBullets}
            title="Belum ada pengajuan"
            description="Submit hasil pertandingan dari halaman Kirim Bukti"
            actionLabel="Kirim Hasil"
            onAction={() => router.push('/dashboard/submit-result')}
          />
        )}

        {/* List */}
        {!loading && filtered.length > 0 && (
          <div className="space-y-3">
            {filtered.map((sub) => {
              const statusConfig =
                {
                  pending: {
                    icon: Clock,
                    color: 'text-amber-600 dark:text-amber-400',
                    bg: 'bg-amber-50 dark:bg-amber-950/40',
                  },
                  approved: {
                    icon: CheckCircle,
                    color: 'text-green-600 dark:text-green-400',
                    bg: 'bg-green-50 dark:bg-green-950/40',
                  },
                  rejected: {
                    icon: XCircle,
                    color: 'text-red-600 dark:text-red-400',
                    bg: 'bg-red-50 dark:bg-red-950/40',
                  },
                  disputed: {
                    icon: WarningCircle,
                    color: 'text-purple-600 dark:text-purple-400',
                    bg: 'bg-purple-50 dark:bg-purple-950/40',
                  },
                }[sub.status] ?? {
                  icon: Clock,
                  color: 'text-stone-500 dark:text-zinc-400',
                  bg: 'bg-stone-50 dark:bg-zinc-800',
                }

              const StatusIcon = statusConfig.icon

              return (
                <div
                  key={sub.id}
                  className="rounded-xl border border-stone-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 p-4"
                >
                  <div className="flex items-start gap-3">
                    <div
                      className={cn(
                        'flex h-10 w-10 shrink-0 items-center justify-center rounded-lg',
                        statusConfig.bg
                      )}
                    >
                      <StatusIcon size={20} weight="fill" className={statusConfig.color} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="font-bold text-stone-900 dark:text-zinc-100 truncate">
                            {sub.tournament_name ?? 'Match'}
                          </p>
                          <p className="text-xs text-stone-500 dark:text-zinc-400">
                            ID: <span className="font-mono">#{sub.id.slice(0, 8)}</span>
                          </p>
                        </div>
                        <StatusBadge status={sub.status} />
                      </div>
                      {sub.score_a !== undefined && sub.score_b !== undefined && (
                        <p className="mt-2 text-sm font-bold text-stone-900 dark:text-zinc-100">
                          Skor: {sub.score_a} - {sub.score_b}
                        </p>
                      )}
                      {sub.rejection_reason && (
                        <p className="mt-2 text-xs text-red-600 dark:text-red-400">
                          Alasan: {sub.rejection_reason}
                        </p>
                      )}
                      <p className="mt-2 text-xs text-stone-400 dark:text-zinc-500">
                        Diajukan {relativeTime(sub.created_at)}
                      </p>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}
