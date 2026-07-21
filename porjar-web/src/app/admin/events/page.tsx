'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { api } from '@/lib/api'
import { useAuthStore } from '@/store/auth-store'
import { PageHeader } from '@/components/shared/PageHeader'
import { EmptyState } from '@/components/shared/EmptyState'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Skeleton } from '@/components/ui/skeleton'
import Link from 'next/link'
import {
  Trophy, Plus, PencilSimple, Spinner, Medal, GraduationCap,
  Trash, Archive, Rows, UsersThree, UsersFour,
} from '@phosphor-icons/react'
import type { Event } from '@/types'
import { CitywideStrip } from './components/CitywideStrip'
import { EventHealthCard } from './components/EventHealthCard'
import type { EventHealth } from './components/types'

type EventStatus = Event['status']

const STATUS_OPTIONS: { value: EventStatus; label: string }[] = [
  { value: 'draft', label: 'Draft' },
  { value: 'published', label: 'Published' },
  { value: 'ongoing', label: 'Ongoing' },
  { value: 'completed', label: 'Completed' },
  { value: 'archived', label: 'Archived' },
]

const STATUS_VARIANT: Record<EventStatus, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  draft: 'secondary',
  published: 'default',
  ongoing: 'default',
  completed: 'outline',
  archived: 'outline',
}

const HEALTH_REFRESH_MS = 20_000

export default function AdminEventsPage() {
  const router = useRouter()
  const { isAuthenticated, isLoading: authLoading } = useAuthStore()
  const [events, setEvents] = useState<Event[]>([])
  const [loading, setLoading] = useState(true)

  // Event Health (command-center)
  const [health, setHealth] = useState<EventHealth | null>(null)
  const [healthLoading, setHealthLoading] = useState(true)
  const [healthFailed, setHealthFailed] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)

  // Bulk selection
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [bulkConfirmOpen, setBulkConfirmOpen] = useState(false)
  const [bulkProcessing, setBulkProcessing] = useState(false)

  // Archive
  const [archivingId, setArchivingId] = useState<string | null>(null)

  const loadEvents = useCallback(async () => {
    if (!isAuthenticated || authLoading) return
    try {
      setLoading(true)
      const data = await api.get<Event[]>('/admin/events')
      setEvents(Array.isArray(data) ? data : [])
    } catch {
      toast.error('Gagal memuat data event')
    } finally {
      setLoading(false)
    }
  }, [isAuthenticated, authLoading])

  const loadHealth = useCallback(async (isBackgroundRefresh: boolean) => {
    if (!isAuthenticated || authLoading) return
    try {
      if (isBackgroundRefresh) setRefreshing(true)
      const data = await api.get<EventHealth>('/admin/events/health')
      setHealth(data)
      setHealthFailed(false)
      setLastUpdated(new Date())
    } catch {
      setHealthFailed(true)
    } finally {
      setHealthLoading(false)
      setRefreshing(false)
    }
  }, [isAuthenticated, authLoading])

  useEffect(() => {
    loadEvents()
    loadHealth(false)
  }, [loadEvents, loadHealth])

  useEffect(() => {
    if (!isAuthenticated || authLoading) return
    const interval = setInterval(() => {
      loadHealth(true)
    }, HEALTH_REFRESH_MS)
    return () => clearInterval(interval)
  }, [isAuthenticated, authLoading, loadHealth])

  if (authLoading) {
    return (
      <>
        <div className="space-y-4">
          {[1, 2, 3].map(i => (
            <Skeleton key={i} className="h-16 w-full rounded-xl" />
          ))}
        </div>
      </>
    )
  }

  if (!isAuthenticated) return null

  function formatDate(dateStr: string | null): string {
    if (!dateStr) return '-'
    return new Date(dateStr).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })
  }

  function toggleOne(id: string) {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])
  }

  function toggleAll() {
    const pageIds = events.map(e => e.id)
    const allSelected = pageIds.length > 0 && pageIds.every(id => selectedIds.includes(id))
    if (allSelected) {
      setSelectedIds(prev => prev.filter(id => !pageIds.includes(id)))
    } else {
      setSelectedIds(prev => Array.from(new Set([...prev, ...pageIds])))
    }
  }

  function clearSelection() {
    setSelectedIds([])
  }

  async function handleBulkDelete() {
    if (selectedIds.length === 0 || bulkProcessing) return
    const ids = [...selectedIds]
    setBulkProcessing(true)
    try {
      const results = await Promise.allSettled(ids.map(id => api.delete(`/admin/events/${id}`)))
      const ok = results.filter(r => r.status === 'fulfilled').length
      const fail = results.length - ok
      if (ok > 0) toast.success(`${ok} event berhasil dihapus`)
      if (fail > 0) toast.error(`${fail} event gagal dihapus`)
      clearSelection()
      setBulkConfirmOpen(false)
      await loadEvents()
      await loadHealth(true)
    } finally {
      setBulkProcessing(false)
    }
  }

  async function handleArchive(event: Event) {
    if (archivingId) return
    if (!confirm('Arsipkan event ini? Event akan tersembunyi dari halaman publik tapi data tetap ada.')) return
    try {
      setArchivingId(event.id)
      await api.put(`/admin/events/${event.id}`, {
        name: event.name,
        slug: event.slug,
        short_name: event.short_name || null,
        description: event.description || null,
        primary_color: event.primary_color,
        secondary_color: event.secondary_color || null,
        logo_url: event.logo_url || null,
        banner_url: event.banner_url || null,
        poster_url: event.poster_url || null,
        start_date: event.start_date,
        end_date: event.end_date,
        registration_start: event.registration_start,
        registration_end: event.registration_end,
        venue: event.venue || null,
        city: event.city || null,
        organizer: event.organizer || null,
        contact_phone: event.contact_phone || null,
        contact_email: event.contact_email || null,
        instagram_url: event.instagram_url || null,
        website_url: event.website_url || null,
        announcement: event.announcement || null,
        announcement_active: event.announcement_active ?? false,
        status: 'archived',
        registration_open: event.registration_open ?? false,
        rules_published: event.rules_published ?? false,
        requires_school: event.requires_school ?? false,
        sort_order: event.sort_order ?? 0,
      })
      toast.success('Event berhasil diarsipkan')
      await loadEvents()
      await loadHealth(true)
    } catch {
      toast.error('Gagal mengarsipkan event')
    } finally {
      setArchivingId(null)
    }
  }

  const pageIds = events.map(e => e.id)
  const allSelected = pageIds.length > 0 && pageIds.every(id => selectedIds.includes(id))
  const someSelected = pageIds.some(id => selectedIds.includes(id)) && !allSelected

  const healthById = new Map((health?.events ?? []).map(h => [h.id, h]))
  const useCardView = !healthFailed

  function lastUpdatedLabel(): string {
    if (!lastUpdated) return ''
    return lastUpdated.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
  }

  return (
    <>
      <PageHeader
        title="Kelola Event"
        description="Buat dan kelola event turnamen esport"
        actions={
          <div className="flex items-center gap-3">
            {!healthFailed && (
              <span className="hidden sm:flex items-center gap-1.5 text-xs text-esi-muted">
                {refreshing
                  ? <Spinner size={13} className="animate-spin" />
                  : null
                }
                {lastUpdated ? `diperbarui ${lastUpdatedLabel()}` : ''}
              </span>
            )}
            <Button onClick={() => router.push('/admin/events/new')} className="bg-esi-red text-white hover:bg-esi-red/90">
              <Plus size={16} className="mr-1.5" />
              Buat Event
            </Button>
          </div>
        }
      />

      {!healthFailed && (
        <CitywideStrip data={health?.citywide ?? null} loading={healthLoading} />
      )}

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <Skeleton key={i} className="h-16 w-full rounded-xl" />
          ))}
        </div>
      ) : events.length === 0 ? (
        <EmptyState
          icon={Trophy}
          title="Belum ada event"
          description="Buat event pertama untuk memulai pengelolaan turnamen esport."
          actionLabel="Buat Event Pertama"
          onAction={() => router.push('/admin/events/new')}
        />
      ) : useCardView ? (
        <div className={`space-y-3 ${selectedIds.length > 0 ? 'mb-32 sm:mb-24' : ''}`}>
          {events.map(event => (
            <EventHealthCard
              key={event.id}
              event={event}
              health={healthById.get(event.id)}
              checked={selectedIds.includes(event.id)}
              onToggle={() => toggleOne(event.id)}
              archivingId={archivingId}
              onArchive={handleArchive}
            />
          ))}
        </div>
      ) : (
        <div className={`rounded-xl border border-esi-border bg-white dark:bg-zinc-900 overflow-hidden ${selectedIds.length > 0 ? 'mb-32 sm:mb-24' : ''}`}>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-10">
                  <input
                    type="checkbox"
                    className="h-4 w-4 accent-esi-red"
                    checked={allSelected}
                    ref={(el) => { if (el) el.indeterminate = someSelected }}
                    onChange={toggleAll}
                    aria-label="Pilih semua event"
                  />
                </TableHead>
                <TableHead>Event</TableHead>
                <TableHead className="hidden md:table-cell">Slug</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="hidden sm:table-cell">Tanggal Mulai</TableHead>
                <TableHead className="hidden sm:table-cell">Tanggal Selesai</TableHead>
                <TableHead className="hidden md:table-cell text-center">Sekolah</TableHead>
                <TableHead className="text-right">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {events.map(event => {
                const checked = selectedIds.includes(event.id)
                return (
                  <TableRow key={event.id} className={checked ? 'bg-red-50/40 dark:bg-red-950/20' : undefined}>
                    <TableCell>
                      <input
                        type="checkbox"
                        className="h-4 w-4 accent-esi-red"
                        checked={checked}
                        onChange={() => toggleOne(event.id)}
                        aria-label={`Pilih ${event.name}`}
                      />
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg" style={{ background: event.primary_color + '20' }}>
                          <Trophy size={16} weight="fill" style={{ color: event.primary_color }} />
                        </div>
                        <div>
                          <p className="font-semibold text-esi-text">{event.name}</p>
                          {event.short_name && <p className="text-xs text-esi-muted">{event.short_name}</p>}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      <code className="rounded bg-stone-100 dark:bg-zinc-800 px-1.5 py-0.5 text-xs">{event.slug}</code>
                    </TableCell>
                    <TableCell>
                      <Badge variant={STATUS_VARIANT[event.status]}>
                        {STATUS_OPTIONS.find(o => o.value === event.status)?.label || event.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="hidden sm:table-cell text-sm">{formatDate(event.start_date)}</TableCell>
                    <TableCell className="hidden sm:table-cell text-sm">{formatDate(event.end_date)}</TableCell>
                    <TableCell className="hidden md:table-cell text-center">
                      {event.requires_school && <GraduationCap size={16} weight="fill" className="inline text-esi-red" />}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Link href={`/admin/events/${event.id}/teams`}>
                          <Button variant="ghost" size="sm" title="Kelola & Assign Tim">
                            <UsersFour size={16} />
                          </Button>
                        </Link>
                        <Link href={`/admin/events/${event.id}/sections`}>
                          <Button variant="ghost" size="sm" title="Sections">
                            <Rows size={16} />
                          </Button>
                        </Link>
                        <Link href={`/admin/events/${event.id}/admins`}>
                          <Button variant="ghost" size="sm" title="Admin Event">
                            <UsersThree size={16} />
                          </Button>
                        </Link>
                        <Link href={`/admin/events/${event.id}/point-rules`}>
                          <Button variant="ghost" size="sm" title="Point Rules">
                            <Medal size={16} />
                          </Button>
                        </Link>
                        <Link href={`/admin/events/${event.id}/edit`}>
                          <Button variant="ghost" size="sm" title="Edit event">
                            <PencilSimple size={16} />
                          </Button>
                        </Link>
                        {event.status === 'completed' && (
                          <Button
                            variant="ghost" size="sm" title="Arsipkan event"
                            disabled={archivingId === event.id}
                            onClick={() => handleArchive(event)}
                          >
                            {archivingId === event.id
                              ? <Spinner size={16} className="animate-spin" />
                              : <Archive size={16} />
                            }
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Bulk delete confirmation */}
      <Dialog open={bulkConfirmOpen} onOpenChange={(o) => { if (!o && !bulkProcessing) setBulkConfirmOpen(false) }}>
        <DialogContent className="bg-white dark:bg-zinc-900 border-stone-200 dark:border-zinc-700 text-stone-900 dark:text-zinc-100 sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-red-600">Hapus {selectedIds.length} Event</DialogTitle>
            <DialogDescription className="text-stone-500 dark:text-zinc-400">
              Apakah kamu yakin menghapus <strong className="text-stone-900 dark:text-zinc-100">{selectedIds.length} event</strong>? Semua turnamen, tim terdaftar, dan data match di event ini akan terhapus permanen.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBulkConfirmOpen(false)} disabled={bulkProcessing}
              className="border-stone-300 dark:border-zinc-600 text-stone-600 dark:text-zinc-400">
              Batal
            </Button>
            <Button onClick={handleBulkDelete} disabled={bulkProcessing} className="bg-red-600 hover:bg-red-700 text-white">
              {bulkProcessing ? 'Menghapus...' : 'Hapus Semua'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Sticky bulk action bar */}
      {selectedIds.length > 0 && (
        <div className="fixed bottom-0 left-0 right-0 border-t border-stone-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 shadow-lg p-4 z-50">
          <div className="mx-auto flex max-w-7xl flex-col items-stretch justify-between gap-3 sm:flex-row sm:items-center">
            <p className="text-sm text-stone-700 dark:text-zinc-200">
              <b>{selectedIds.length}</b> event dipilih
            </p>
            <div className="flex flex-col gap-2 sm:flex-row">
              <Button variant="outline" onClick={clearSelection} disabled={bulkProcessing}>Batal</Button>
              <Button variant="destructive" onClick={() => setBulkConfirmOpen(true)} disabled={bulkProcessing}>
                <Trash size={14} className="mr-1" /> Hapus Semua
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
