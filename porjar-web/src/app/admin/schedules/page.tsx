'use client'

import { useEffect, useState, useCallback, useMemo } from 'react'
import { toast } from 'sonner'
import { api } from '@/lib/api'
import { useAuthStore } from '@/store/auth-store'
import { AdminLayout } from '@/components/layouts/AdminLayout'
import { PageHeader } from '@/components/shared/PageHeader'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { EmptyState } from '@/components/shared/EmptyState'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Skeleton } from '@/components/ui/skeleton'
import {
  CalendarBlank,
  Plus,
  PencilSimple,
  Trash,
  Clock,
  Lightning,
  CaretLeft,
  CaretRight,
  Sparkle,
} from '@phosphor-icons/react'
import { downloadCSV } from '@/lib/csv'
import { ExportButton } from '@/components/shared/ExportButton'
import { ScheduleCalendar } from '@/components/modules/schedule/ScheduleCalendar'
import { ScheduleGeneratorDialog } from './ScheduleGeneratorDialog'
import { GAME_CONFIG } from '@/constants/games'
import { cn, mediaUrl } from '@/lib/utils'
import type { Schedule, GameSlug, PaginationMeta, Tournament } from '@/types'

import { ScheduleFormDialog, emptyForm } from './ScheduleFormDialog'
import type { ScheduleFormData } from './ScheduleFormDialog'
import { ScheduleFilters } from './ScheduleFilters'
import { ScheduleTimelineView } from './ScheduleTimelineView'
import type { MatchDetailData } from './ScheduleTimelineView'
import { ScheduleBulkActions } from './ScheduleBulkActions'

function formatTime(dateStr: string): string {
  return new Date(dateStr).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })
}

function formatDateShort(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })
}

function isToday(dateStr: string): boolean {
  return new Date(dateStr).toDateString() === new Date().toDateString()
}

export default function AdminSchedulesPage() {
  const { isAuthenticated, isLoading: authLoading } = useAuthStore()
  const [schedules, setSchedules] = useState<Schedule[]>([])
  const [tournaments, setTournaments] = useState<Tournament[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [generatorOpen, setGeneratorOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState<ScheduleFormData>(emptyForm)
  const [submitting, setSubmitting] = useState(false)
  const [viewMode, setViewMode] = useState<'timeline' | 'list' | 'calendar'>('timeline')
  const [deleteTarget, setDeleteTarget] = useState<Schedule | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [bulkDeleting, setBulkDeleting] = useState(false)
  const [bulkDeleteConfirm, setBulkDeleteConfirm] = useState(false)
  const [shiftOpen, setShiftOpen] = useState(false)
  const [shiftTarget, setShiftTarget] = useState<'selected' | number>('selected')
  const [shiftMinutes, setShiftMinutes] = useState('')
  const [shifting, setShifting] = useState(false)
  const [expandedSchedule, setExpandedSchedule] = useState<string | null>(null)
  const [matchDetails, setMatchDetails] = useState<Record<string, MatchDetailData>>({})

  async function loadMatchDetail(scheduleId: string, matchId: string) {
    if (expandedSchedule === scheduleId) { setExpandedSchedule(null); return }
    setExpandedSchedule(scheduleId)
    if (matchDetails[matchId]) return
    try {
      const m = await api.get<any>(`/matches/${matchId}`)
      if (m) {
        setMatchDetails(prev => ({
          ...prev,
          [matchId]: {
            team_a: m.team_a?.name ?? 'TBD',
            team_b: m.team_b?.name ?? 'TBD',
            logo_a: mediaUrl(m.team_a?.logo_url) ?? undefined,
            logo_b: mediaUrl(m.team_b?.logo_url) ?? undefined,
            school_a: m.team_a?.school_name ?? undefined,
            school_b: m.team_b?.school_name ?? undefined,
            status: m.status,
            score_a: m.score_a,
            score_b: m.score_b,
          }
        }))
      }
    } catch {}
  }

  // Filters & pagination
  const [filterTournament, setFilterTournament] = useState<string>('')
  const [filterDay, setFilterDay] = useState<string>('all')
  const [page, setPage] = useState(1)
  const [meta, setMeta] = useState<PaginationMeta | null>(null)
  const perPage = 50

  const loadData = useCallback(async () => {
    if (!isAuthenticated || authLoading) return
    try {
      const params = new URLSearchParams({ page: String(page), per_page: String(perPage) })
      if (filterTournament) params.set('tournament_id', filterTournament)

      const [scheduleResult, tournamentData] = await Promise.all([
        api.getPaginated<Schedule[]>(`/schedules?${params.toString()}`),
        api.get<Tournament[]>('/tournaments'),
      ])
      setSchedules(scheduleResult.data ?? [])
      setMeta(scheduleResult.meta)
      setTournaments(tournamentData ?? [])
    } catch {
      toast.error('Gagal memuat data jadwal')
    } finally {
      setLoading(false)
    }
  }, [isAuthenticated, authLoading, page, filterTournament])

  useEffect(() => {
    loadData()
  }, [loadData])

  // ─── Quick stats ───
  const stats = useMemo(() => {
    const now = new Date()
    const todaySchedules = schedules.filter((s) => isToday(s.scheduled_at))
    const ongoing = schedules.filter((s) => s.status === 'ongoing')
    const upcoming = schedules.filter((s) => s.status === 'upcoming' && new Date(s.scheduled_at) > now)
    return { today: todaySchedules.length, ongoing: ongoing.length, upcoming: upcoming.length }
  }, [schedules])

  // ─── Group schedules by day for timeline ───
  const groupedByDay = useMemo(() => {
    const sorted = [...schedules].sort(
      (a, b) => new Date(a.scheduled_at).getTime() - new Date(b.scheduled_at).getTime()
    )
    const groups: { dateKey: string; dayNum: number; label: string; isToday: boolean; schedules: Schedule[] }[] = []
    for (const schedule of sorted) {
      const dateKey = new Date(schedule.scheduled_at).toDateString()
      const existing = groups.find((g) => g.dateKey === dateKey)
      if (existing) {
        existing.schedules.push(schedule)
      } else {
        const d = new Date(schedule.scheduled_at)
        groups.push({
          dateKey,
          dayNum: groups.length + 1,
          label: d.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }),
          isToday: isToday(schedule.scheduled_at),
          schedules: [schedule],
        })
      }
    }
    return groups
  }, [schedules])

  // Filter groups by day
  const filteredDayGroups = useMemo(() => {
    if (filterDay === 'all') return groupedByDay
    const dayNum = parseInt(filterDay)
    return groupedByDay.filter((g) => g.dayNum === dayNum)
  }, [groupedByDay, filterDay])

  // ─── Handlers ───
  function openCreate() {
    setEditingId(null)
    setForm(emptyForm)
    setDialogOpen(true)
  }

  function openEdit(schedule: Schedule) {
    setEditingId(schedule.id)
    setForm({
      title: schedule.title,
      tournament_id: schedule.tournament?.id ?? '',
      description: '',
      scheduled_at: schedule.scheduled_at ? schedule.scheduled_at.slice(0, 16) : '',
      end_at: schedule.end_at ? schedule.end_at.slice(0, 16) : '',
      venue: schedule.venue ?? '',
      status: schedule.status,
      bracket_match_id: schedule.bracket_match_id ?? '',
    })
    setDialogOpen(true)
  }

  async function handleSubmit() {
    if (!form.title.trim() || !form.scheduled_at) {
      toast.error('Judul dan waktu mulai wajib diisi')
      return
    }
    if (!form.tournament_id) {
      toast.error('Turnamen wajib dipilih')
      return
    }
    setSubmitting(true)
    try {
      const payload: Record<string, unknown> = {
        title: form.title.trim(),
        tournament_id: form.tournament_id,
        scheduled_at: form.scheduled_at ? new Date(form.scheduled_at).toISOString() : undefined,
        venue: form.venue.trim() || undefined,
        description: form.description.trim() || undefined,
      }
      if (editingId && form.status) {
        payload.status = form.status
      }
      if (form.end_at) {
        const d = new Date(form.end_at)
        if (!isNaN(d.getTime())) payload.end_at = d.toISOString()
      }

      if (editingId) {
        await api.put(`/admin/schedules/${editingId}`, payload)
        if (form.bracket_match_id && form.scheduled_at) {
          try {
            await api.put(`/admin/matches/${form.bracket_match_id}/schedule`, {
              scheduled_at: new Date(form.scheduled_at).toISOString(),
            })
          } catch {}
        }
        toast.success('Jadwal berhasil diperbarui')
      } else {
        await api.post('/admin/schedules', payload)
        toast.success('Jadwal berhasil dibuat')
      }
      setDialogOpen(false)
      await loadData()
    } catch {
      toast.error('Gagal menyimpan jadwal')
    } finally {
      setSubmitting(false)
    }
  }

  function toggleSelect(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function toggleSelectAll() {
    if (selectedIds.size === schedules.length) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(schedules.map((s) => s.id)))
    }
  }

  async function handleShift() {
    const mins = parseInt(shiftMinutes)
    if (!mins || mins === 0) { toast.error('Masukkan menit geser (misal: 60 atau -30)'); return }
    setShifting(true)

    let targetSchedules: Schedule[]
    if (shiftTarget === 'selected') {
      targetSchedules = schedules.filter((s) => selectedIds.has(s.id))
    } else {
      const dayGroup = groupedByDay.find((g) => g.dayNum === shiftTarget)
      targetSchedules = dayGroup?.schedules ?? []
    }

    let shifted = 0
    for (const s of targetSchedules) {
      try {
        const newStart = new Date(new Date(s.scheduled_at).getTime() + mins * 60_000)
        const payload: Record<string, unknown> = { scheduled_at: newStart.toISOString() }
        if (s.end_at) {
          payload.end_at = new Date(new Date(s.end_at).getTime() + mins * 60_000).toISOString()
        }
        await api.put(`/admin/schedules/${s.id}`, payload)

        if (s.bracket_match_id) {
          try {
            await api.put(`/admin/matches/${s.bracket_match_id}/schedule`, {
              scheduled_at: newStart.toISOString(),
            })
          } catch {}
        }
        shifted++
      } catch {}
    }

    toast.success(`${shifted} jadwal digeser ${mins > 0 ? '+' : ''}${mins} menit`)
    setShiftOpen(false)
    setShiftMinutes('')
    setShifting(false)
    await loadData()
  }

  async function handleBulkDelete() {
    setBulkDeleting(true)
    try {
      let deleted = 0
      for (const id of selectedIds) {
        try {
          await api.delete(`/admin/schedules/${id}`)
          deleted++
        } catch {}
      }
      toast.success(`${deleted} jadwal berhasil dihapus`)
      setSelectedIds(new Set())
      setBulkDeleteConfirm(false)
      await loadData()
    } catch {
      toast.error('Gagal menghapus')
    } finally {
      setBulkDeleting(false)
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      await api.delete(`/admin/schedules/${deleteTarget.id}`)
      toast.success('Jadwal berhasil dihapus')
      setDeleteTarget(null)
      await loadData()
    } catch {
      toast.error('Gagal menghapus jadwal')
    } finally {
      setDeleting(false)
    }
  }

  function handleExportCSV() {
    const data = schedules.map((s) => ({
      title: s.title,
      tournament: s.tournament?.name ?? '-',
      game: s.game?.name ?? '-',
      scheduled_at: new Date(s.scheduled_at).toLocaleString('id-ID'),
      end_at: s.end_at ? new Date(s.end_at).toLocaleString('id-ID') : '-',
      venue: s.venue ?? '-',
      status: s.status,
    }))
    downloadCSV(data, 'schedules.csv', [
      { key: 'title', header: 'Judul' },
      { key: 'tournament', header: 'Turnamen' },
      { key: 'game', header: 'Game' },
      { key: 'scheduled_at', header: 'Waktu Mulai' },
      { key: 'end_at', header: 'Waktu Selesai' },
      { key: 'venue', header: 'Venue' },
      { key: 'status', header: 'Status' },
    ])
  }

  // ─── Loading state ───
  if (loading) {
    return (
      <AdminLayout>
        <Skeleton className="h-10 w-64 bg-stone-200" />
        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
          <Skeleton className="h-24 rounded-xl bg-stone-100" />
          <Skeleton className="h-24 rounded-xl bg-stone-100" />
          <Skeleton className="h-24 rounded-xl bg-stone-100" />
        </div>
        <Skeleton className="mt-4 h-96 w-full bg-stone-200" />
      </AdminLayout>
    )
  }

  return (
    <AdminLayout>
      <PageHeader
        title="Manajemen Jadwal"
        description="Kelola jadwal pertandingan dan acara turnamen"
        actions={
          <div className="flex items-center gap-2">
            {schedules.length > 0 && (
              <ExportButton
                options={[
                  { label: 'Export CSV', type: 'csv', onExport: handleExportCSV },
                ]}
              />
            )}
            <Button
              variant="outline"
              onClick={openCreate}
              className="border-stone-300 text-stone-600 hover:bg-stone-50"
            >
              <Plus size={16} className="mr-1" />
              Tambah Manual
            </Button>
            <Button
              onClick={() => setGeneratorOpen(true)}
              className="bg-porjar-red hover:bg-porjar-red-dark text-white"
            >
              <Sparkle size={16} className="mr-1" />
              Generate Jadwal
            </Button>
          </div>
        }
      />

      {/* Quick Stats */}
      <div className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="flex items-center gap-4 rounded-xl border border-stone-200 bg-white p-4 shadow-sm">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-100">
            <CalendarBlank size={22} weight="duotone" className="text-blue-600" />
          </div>
          <div>
            <p className="text-2xl font-bold text-stone-900">{stats.today}</p>
            <p className="text-xs text-stone-500">Jadwal Hari Ini</p>
          </div>
        </div>
        <div className="flex items-center gap-4 rounded-xl border border-stone-200 bg-white p-4 shadow-sm">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-red-100">
            <Lightning size={22} weight="duotone" className="text-red-600" />
          </div>
          <div>
            <p className="text-2xl font-bold text-stone-900">{stats.ongoing}</p>
            <p className="text-xs text-stone-500">Sedang Berlangsung</p>
          </div>
        </div>
        <div className="flex items-center gap-4 rounded-xl border border-stone-200 bg-white p-4 shadow-sm">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-green-100">
            <Clock size={22} weight="duotone" className="text-green-600" />
          </div>
          <div>
            <p className="text-2xl font-bold text-stone-900">{stats.upcoming}</p>
            <p className="text-xs text-stone-500">Akan Datang</p>
          </div>
        </div>
      </div>

      <ScheduleFilters
        tournaments={tournaments}
        filterTournament={filterTournament}
        setFilterTournament={setFilterTournament}
        filterDay={filterDay}
        setFilterDay={setFilterDay}
        dayGroups={groupedByDay}
        viewMode={viewMode}
        setViewMode={setViewMode}
        setPage={setPage}
      />

      <ScheduleBulkActions
        selectedIds={selectedIds}
        toggleSelectAll={toggleSelectAll}
        totalCount={schedules.length}
        onBulkDelete={() => setBulkDeleteConfirm(true)}
        onShift={() => { setShiftTarget('selected'); setShiftOpen(true) }}
        onClearSelection={() => setSelectedIds(new Set())}
        shiftOpen={shiftOpen}
        setShiftOpen={setShiftOpen}
        shiftTarget={shiftTarget}
        shiftMinutes={shiftMinutes}
        setShiftMinutes={setShiftMinutes}
        shifting={shifting}
        onShiftSubmit={handleShift}
      />

      {/* Content Views */}
      {schedules.length === 0 ? (
        <EmptyState
          icon={CalendarBlank}
          title="Belum Ada Jadwal"
          description={filterTournament ? 'Tidak ada jadwal untuk turnamen ini.' : 'Buat jadwal pertandingan pertama.'}
          actionLabel="Tambah Jadwal"
          onAction={openCreate}
        />
      ) : viewMode === 'timeline' ? (
        <ScheduleTimelineView
          groups={filteredDayGroups}
          selectedIds={selectedIds}
          toggleSelect={toggleSelect}
          expandedSchedule={expandedSchedule}
          matchDetails={matchDetails}
          loadMatchDetail={loadMatchDetail}
          openEdit={openEdit}
          setDeleteTarget={setDeleteTarget}
          onShiftDay={(dayNum) => { setShiftTarget(dayNum); setShiftOpen(true) }}
        />
      ) : viewMode === 'calendar' ? (
        <div className="rounded-xl border border-stone-200 bg-white shadow-sm p-4">
          <ScheduleCalendar schedules={schedules} onScheduleClick={openEdit} />
        </div>
      ) : (
        /* List View */
        <div className="rounded-xl border border-stone-200 bg-white shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-stone-200 hover:bg-transparent bg-stone-50">
                  <TableHead className="text-stone-600 uppercase text-xs tracking-wider whitespace-nowrap">Judul</TableHead>
                  <TableHead className="text-stone-600 uppercase text-xs tracking-wider">Game</TableHead>
                  <TableHead className="text-stone-600 uppercase text-xs tracking-wider">Waktu</TableHead>
                  <TableHead className="text-stone-600 uppercase text-xs tracking-wider">Venue</TableHead>
                  <TableHead className="text-stone-600 uppercase text-xs tracking-wider">Status</TableHead>
                  <TableHead className="text-right text-stone-600 uppercase text-xs tracking-wider">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {schedules.map((schedule) => {
                  const gameSlug = schedule.game?.slug as GameSlug | undefined
                  const gameConfig = gameSlug ? GAME_CONFIG[gameSlug] : null

                  return (
                    <TableRow key={schedule.id} className="border-stone-100 hover:bg-red-50/50">
                      <TableCell>
                        <div>
                          <span className="font-medium text-stone-900">{schedule.title}</span>
                          {schedule.tournament && (
                            <p className="text-xs text-stone-400">{schedule.tournament.name}</p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        {gameConfig ? (
                          <div className="flex items-center gap-1.5">
                            <img src={gameConfig.logo} alt="" className="h-5 w-5 object-contain" />
                            <span className="text-xs text-stone-600">{schedule.game?.name}</span>
                          </div>
                        ) : (
                          <span className="text-xs text-stone-400">-</span>
                        )}
                      </TableCell>
                      <TableCell className="text-sm text-stone-500 whitespace-nowrap">
                        <div>
                          <p>{formatDateShort(schedule.scheduled_at)}</p>
                          <p className="text-xs">
                            {formatTime(schedule.scheduled_at)}
                            {schedule.end_at && ` - ${formatTime(schedule.end_at)}`}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm text-stone-500">
                        {schedule.venue ?? '-'}
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={schedule.status} />
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            size="icon-xs"
                            variant="ghost"
                            onClick={() => openEdit(schedule)}
                            className="text-stone-500 hover:text-stone-900"
                          >
                            <PencilSimple size={14} />
                          </Button>
                          <Button
                            size="icon-xs"
                            variant="ghost"
                            onClick={() => setDeleteTarget(schedule)}
                            className="text-red-400 hover:text-red-600"
                          >
                            <Trash size={14} />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </div>
        </div>
      )}

      {/* Pagination */}
      {meta && meta.total_pages > 1 && (
        <div className="mt-4 flex flex-col gap-2 rounded-xl border border-stone-200 bg-white px-4 py-3 shadow-sm sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-stone-500">
            Menampilkan {(page - 1) * perPage + 1}-{Math.min(page * perPage, meta.total)} dari {meta.total} jadwal
          </p>
          <div className="flex items-center gap-1">
            <Button
              size="sm"
              variant="outline"
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
              className="border-stone-300 text-stone-600"
            >
              <CaretLeft size={14} />
            </Button>
            {Array.from({ length: meta.total_pages }, (_, i) => i + 1)
              .filter((p) => p === 1 || p === meta.total_pages || Math.abs(p - page) <= 1)
              .map((p, idx, arr) => {
                const prev = arr[idx - 1]
                const showGap = prev !== undefined && p - prev > 1
                return (
                  <span key={p} className="flex items-center">
                    {showGap && <span className="px-1 text-xs text-stone-400">...</span>}
                    <button
                      onClick={() => setPage(p)}
                      className={cn(
                        'h-8 w-8 rounded-md text-xs font-medium transition-colors',
                        p === page
                          ? 'bg-porjar-red text-white'
                          : 'text-stone-600 hover:bg-stone-100'
                      )}
                    >
                      {p}
                    </button>
                  </span>
                )
              })}
            <Button
              size="sm"
              variant="outline"
              disabled={page >= (meta.total_pages ?? 1)}
              onClick={() => setPage((p) => p + 1)}
              className="border-stone-300 text-stone-600"
            >
              <CaretRight size={14} />
            </Button>
          </div>
        </div>
      )}

      {/* Generate from Bracket Dialog */}
      <ScheduleGeneratorDialog
        open={generatorOpen}
        onOpenChange={setGeneratorOpen}
        tournaments={tournaments}
        onSaved={loadData}
      />

      {/* Create/Edit Dialog (Manual) */}
      <ScheduleFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        form={form}
        setForm={setForm}
        editingId={editingId}
        tournaments={tournaments}
        onSubmit={handleSubmit}
        submitting={submitting}
      />

      {/* Delete Confirmation */}
      <ConfirmDialog
        open={!!deleteTarget}
        title="Hapus Jadwal"
        description={`Yakin ingin menghapus jadwal "${deleteTarget?.title}"? Tindakan ini tidak bisa dibatalkan.`}
        confirmLabel={deleting ? 'Menghapus...' : 'Hapus'}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
        loading={deleting}
        variant="destructive"
      />

      {/* Bulk delete confirmation */}
      <ConfirmDialog
        open={bulkDeleteConfirm}
        title="Hapus Jadwal"
        description={`Yakin ingin menghapus ${selectedIds.size} jadwal? Tindakan ini tidak bisa dibatalkan.`}
        confirmLabel={bulkDeleting ? 'Menghapus...' : `Hapus ${selectedIds.size} Jadwal`}
        onConfirm={handleBulkDelete}
        onCancel={() => setBulkDeleteConfirm(false)}
        loading={bulkDeleting}
        variant="destructive"
      />
    </AdminLayout>
  )
}
