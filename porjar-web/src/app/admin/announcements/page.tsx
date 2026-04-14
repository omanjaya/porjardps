'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import { api, ApiError } from '@/lib/api'
import { AdminLayout } from '@/components/layouts/AdminLayout'
import { PageHeader } from '@/components/shared/PageHeader'
import { EmptyState } from '@/components/shared/EmptyState'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Megaphone, Plus, Trash } from '@phosphor-icons/react'
import type { Event } from '@/types'
import {
  useAnnouncements,
  type Announcement,
  type AnnouncementPriority,
} from './hooks/useAnnouncements'
import { AnnouncementFormDialog } from './dialogs/AnnouncementFormDialog'

const PRIORITY_STYLES: Record<AnnouncementPriority, { label: string; className: string }> = {
  low: {
    label: 'Rendah',
    className:
      'bg-stone-100 dark:bg-zinc-800 text-stone-600 dark:text-zinc-400 border-stone-200 dark:border-zinc-700',
  },
  normal: {
    label: 'Normal',
    className:
      'bg-blue-50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-800',
  },
  high: {
    label: 'Tinggi',
    className:
      'bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-800',
  },
  urgent: {
    label: 'Mendesak',
    className:
      'bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-400 border-red-200 dark:border-red-800',
  },
}

function PriorityBadge({ priority }: { priority: AnnouncementPriority }) {
  const cfg = PRIORITY_STYLES[priority] ?? PRIORITY_STYLES.normal
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${cfg.className}`}
    >
      {cfg.label}
    </span>
  )
}

function formatDateTime(iso: string): string {
  const d = new Date(iso)
  if (isNaN(d.getTime())) return iso
  return d.toLocaleString('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export default function AdminAnnouncementsPage() {
  const [events, setEvents] = useState<Event[]>([])
  const [eventsLoading, setEventsLoading] = useState(true)
  const [selectedEventId, setSelectedEventId] = useState<string>('')
  const [showCreate, setShowCreate] = useState(false)

  const { items, loading, processing, list, create, remove } = useAnnouncements()

  const selectedEvent = useMemo(
    () => events.find((e) => e.id === selectedEventId) ?? null,
    [events, selectedEventId],
  )

  useEffect(() => {
    let mounted = true
    ;(async () => {
      try {
        setEventsLoading(true)
        const data = await api.get<Event[]>('/admin/events')
        if (!mounted) return
        const list = Array.isArray(data) ? data : []
        setEvents(list)
        if (list.length > 0) setSelectedEventId(list[0].id)
      } catch (err) {
        const msg = err instanceof ApiError ? err.message : 'Gagal memuat daftar event'
        toast.error(msg)
      } finally {
        if (mounted) setEventsLoading(false)
      }
    })()
    return () => {
      mounted = false
    }
  }, [])

  useEffect(() => {
    if (selectedEvent?.slug) {
      list(selectedEvent.slug)
    }
  }, [selectedEvent?.slug, list])

  const handleCreate = useCallback(
    async (form: Parameters<typeof create>[2]) => {
      if (!selectedEvent) {
        toast.error('Pilih event terlebih dahulu')
        return false
      }
      return create(selectedEvent.id, selectedEvent.slug, form)
    },
    [create, selectedEvent],
  )

  const handleDelete = useCallback(
    async (a: Announcement) => {
      if (!confirm(`Hapus pengumuman "${a.title}"?`)) return
      await remove(a.id)
    },
    [remove],
  )

  return (
    <AdminLayout>
      <PageHeader
        title="Pengumuman Event"
        description="Kirim pengumuman ke peserta event"
        actions={
          <Button
            onClick={() => setShowCreate(true)}
            disabled={!selectedEvent}
            className="bg-esi-red hover:bg-esi-red/90 text-white"
          >
            <Plus size={16} weight="bold" className="mr-1" />
            Buat Pengumuman
          </Button>
        }
      />

      <div className="mb-6">
        <label className="mb-1 block text-sm font-medium text-stone-700 dark:text-zinc-300">
          Event
        </label>
        {eventsLoading ? (
          <Skeleton className="h-10 w-full max-w-md rounded-lg" />
        ) : events.length === 0 ? (
          <p className="text-sm text-stone-500 dark:text-zinc-400">Belum ada event.</p>
        ) : (
          <select
            value={selectedEventId}
            onChange={(e) => setSelectedEventId(e.target.value)}
            className="w-full max-w-md rounded-lg border border-stone-300 dark:border-zinc-600 bg-white dark:bg-zinc-900 px-3 py-2 text-sm text-stone-900 dark:text-zinc-100 focus:border-esi-red focus:outline-none focus:ring-1 focus:ring-esi-red"
          >
            {events.map((ev) => (
              <option key={ev.id} value={ev.id}>
                {ev.name}
              </option>
            ))}
          </select>
        )}
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-24 w-full rounded-xl" />
          ))}
        </div>
      ) : !selectedEvent ? null : items.length === 0 ? (
        <EmptyState
          icon={Megaphone}
          title="Belum ada pengumuman"
          description="Buat pengumuman pertama untuk event ini"
        />
      ) : (
        <div className="space-y-3">
          {items.map((a) => (
            <div
              key={a.id}
              className="rounded-xl border border-esi-border bg-white dark:bg-zinc-900 p-4 shadow-sm"
            >
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0 flex-1">
                  <div className="mb-2 flex flex-wrap items-center gap-2">
                    <PriorityBadge priority={a.priority} />
                    <h3 className="text-base font-semibold text-stone-900 dark:text-zinc-100">
                      {a.title}
                    </h3>
                  </div>
                  <p className="whitespace-pre-wrap break-words text-sm text-stone-700 dark:text-zinc-300">
                    {a.message.length > 240 ? a.message.slice(0, 240) + '…' : a.message}
                  </p>
                  <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-stone-500 dark:text-zinc-500">
                    <span>Dibuat: {formatDateTime(a.created_at)}</span>
                    {a.expires_at && <span>Kadaluarsa: {formatDateTime(a.expires_at)}</span>}
                  </div>
                </div>
                <div className="shrink-0">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDelete(a)}
                    disabled={processing}
                    className="text-red-600 hover:bg-red-50 hover:text-red-700 dark:hover:bg-red-950/30"
                  >
                    <Trash size={14} className="mr-1" />
                    Hapus
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <AnnouncementFormDialog
        open={showCreate}
        onOpenChange={setShowCreate}
        processing={processing}
        onSubmit={handleCreate}
      />
    </AdminLayout>
  )
}
