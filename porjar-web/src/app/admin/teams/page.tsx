'use client'

import { useEffect, useState, useCallback } from 'react'
import { toast } from 'sonner'
import { api } from '@/lib/api'
import { useAuthStore } from '@/store/auth-store'
import { AdminLayout } from '@/components/layouts/AdminLayout'
import { PageHeader } from '@/components/shared/PageHeader'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { GameSelector } from '@/components/shared/GameSelector'
import { EmptyState } from '@/components/shared/EmptyState'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
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
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Users,
  CheckCircle,
  XCircle,
  WarningCircle,
  PencilSimple,
  Trash,
  Eye,
  Plus,
} from '@phosphor-icons/react'
import { downloadCSV } from '@/lib/csv'
import { ExportButton } from '@/components/shared/ExportButton'
import type { Team, TeamDetail, Game, GameSlug, TeamStatus } from '@/types'

const statusFilters: { value: TeamStatus | 'all'; label: string }[] = [
  { value: 'all', label: 'Semua' },
  { value: 'pending', label: 'Pending' },
  { value: 'approved', label: 'Approved' },
  { value: 'rejected', label: 'Rejected' },
]

interface School {
  id: string
  name: string
  level: string
}

export default function AdminTeamsPage() {
  const { isAuthenticated, isLoading: authLoading } = useAuthStore()
  const [teams, setTeams] = useState<Team[]>([])
  const [games, setGames] = useState<{ id: string; slug: GameSlug; name: string }[]>([])
  const [schools, setSchools] = useState<School[]>([])
  const [loading, setLoading] = useState(true)
  const [activeGame, setActiveGame] = useState<GameSlug | null>(null)
  const [statusFilter, setStatusFilter] = useState<TeamStatus | 'all'>('all')
  const [currentPage, setCurrentPage] = useState(1)
  const perPage = 20
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [bulkProcessing, setBulkProcessing] = useState(false)
  const [processing, setProcessing] = useState(false)

  // Dialogs state
  const [confirmAction, setConfirmAction] = useState<{
    teamId: string
    teamName: string
    action: 'approve' | 'reject' | 'delete'
  } | null>(null)

  // Create dialog
  const [createOpen, setCreateOpen] = useState(false)
  const [createForm, setCreateForm] = useState({ name: '', game_id: '', school_id: '' })
  const [createLoading, setCreateLoading] = useState(false)

  // Edit dialog
  const [editTeam, setEditTeam] = useState<Team | null>(null)
  const [editName, setEditName] = useState('')
  const [editLoading, setEditLoading] = useState(false)

  // Detail sheet
  const [detailTeam, setDetailTeam] = useState<TeamDetail | null>(null)
  const [detailOpen, setDetailOpen] = useState(false)
  const [detailLoading, setDetailLoading] = useState(false)

  const loadData = useCallback(async () => {
    if (!isAuthenticated || authLoading) return
    try {
      let allTeams: Team[] = []
      let page = 1
      let totalPages = 1
      while (page <= totalPages) {
        const res = await api.getPaginated<Team[]>(`/teams?per_page=100&page=${page}`)
        const pageData = Array.isArray(res.data) ? res.data : []
        allTeams = [...allTeams, ...pageData]
        totalPages = res.meta?.total_pages ?? 1
        page++
      }
      const g = await api.get<(Game & { id: string })[]>('/games')
      const s = await api.getPaginated<School[]>('/schools?per_page=200')
      setTeams(allTeams)
      setGames(
        (g ?? []).filter((game) => game.is_active).map((game) => ({ id: game.id, slug: game.slug, name: game.name }))
      )
      setSchools(Array.isArray(s.data) ? s.data : [])
    } catch {
      toast.error('Gagal memuat data')
    } finally {
      setLoading(false)
    }
  }, [isAuthenticated, authLoading])

  useEffect(() => {
    loadData()
  }, [loadData])

  const filteredTeams = (teams ?? []).filter((team) => {
    if (activeGame && team.game.slug !== activeGame) return false
    if (statusFilter !== 'all' && team.status !== statusFilter) return false
    return true
  })

  const totalFiltered = filteredTeams.length
  const totalPages = Math.ceil(totalFiltered / perPage)
  const paginatedTeams = filteredTeams.slice((currentPage - 1) * perPage, currentPage * perPage)

  useEffect(() => {
    setCurrentPage(1)
    setSelectedIds(new Set())
  }, [activeGame, statusFilter])

  const pendingOnPage = paginatedTeams.filter((t) => t.status === 'pending')
  const allPendingSelected =
    pendingOnPage.length > 0 && pendingOnPage.every((t) => selectedIds.has(t.id))

  function toggleSelectAll() {
    if (allPendingSelected) {
      setSelectedIds((prev) => {
        const next = new Set(prev)
        pendingOnPage.forEach((t) => next.delete(t.id))
        return next
      })
    } else {
      setSelectedIds((prev) => {
        const next = new Set(prev)
        pendingOnPage.forEach((t) => next.add(t.id))
        return next
      })
    }
  }

  function toggleSelectOne(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  async function handleBulkAction(action: 'approve' | 'reject') {
    if (selectedIds.size === 0) return
    setBulkProcessing(true)
    const ids = Array.from(selectedIds)
    try {
      if (action === 'approve') {
        await Promise.all(ids.map((id) => api.put(`/admin/teams/${id}/approve`)))
        toast.success(`${ids.length} tim disetujui`)
      } else {
        await Promise.all(
          ids.map((id) =>
            api.put(`/admin/teams/${id}/reject`, { reason: 'Ditolak massal oleh admin' })
          )
        )
        toast.success(`${ids.length} tim ditolak`)
      }
      setSelectedIds(new Set())
      await loadData()
    } catch {
      toast.error('Gagal memproses beberapa tim')
    } finally {
      setBulkProcessing(false)
    }
  }

  async function handleAction() {
    if (!confirmAction) return
    setProcessing(true)
    try {
      if (confirmAction.action === 'approve') {
        await api.put(`/admin/teams/${confirmAction.teamId}/approve`)
        toast.success(`${confirmAction.teamName} disetujui`)
      } else if (confirmAction.action === 'reject') {
        await api.put(`/admin/teams/${confirmAction.teamId}/reject`, { reason: 'Ditolak oleh admin' })
        toast.success(`${confirmAction.teamName} ditolak`)
      } else if (confirmAction.action === 'delete') {
        await api.delete(`/admin/teams/${confirmAction.teamId}`)
        toast.success(`${confirmAction.teamName} dihapus`)
      }
      setConfirmAction(null)
      await loadData()
    } catch {
      toast.error('Gagal melakukan aksi')
    } finally {
      setProcessing(false)
    }
  }

  async function handleCreate() {
    if (!createForm.name || !createForm.game_id || !createForm.school_id) {
      toast.error('Semua field wajib diisi')
      return
    }
    setCreateLoading(true)
    try {
      await api.post('/teams', createForm)
      toast.success('Tim berhasil dibuat')
      setCreateOpen(false)
      setCreateForm({ name: '', game_id: '', school_id: '' })
      await loadData()
    } catch (e: unknown) {
      const msg = (e as { message?: string })?.message ?? 'Gagal membuat tim'
      toast.error(msg)
    } finally {
      setCreateLoading(false)
    }
  }

  async function handleEdit() {
    if (!editTeam || !editName.trim()) return
    setEditLoading(true)
    try {
      await api.put(`/admin/teams/${editTeam.id}`, { name: editName.trim() })
      toast.success('Nama tim diperbarui')
      setEditTeam(null)
      await loadData()
    } catch (e: unknown) {
      const msg = (e as { message?: string })?.message ?? 'Gagal mengubah tim'
      toast.error(msg)
    } finally {
      setEditLoading(false)
    }
  }

  async function openDetail(team: Team) {
    setDetailOpen(true)
    setDetailLoading(true)
    try {
      const data = await api.get<TeamDetail>(`/teams/${team.id}`)
      setDetailTeam(data)
    } catch {
      toast.error('Gagal memuat detail tim')
      setDetailOpen(false)
    } finally {
      setDetailLoading(false)
    }
  }

  async function handleRemoveMember(memberId: string) {
    if (!detailTeam) return
    try {
      await api.delete(`/teams/${detailTeam.id}/members/${memberId}`)
      toast.success('Anggota dihapus')
      const data = await api.get<TeamDetail>(`/teams/${detailTeam.id}`)
      setDetailTeam(data)
    } catch {
      toast.error('Gagal menghapus anggota')
    }
  }

  if (loading) {
    return (
      <AdminLayout>
        <Skeleton className="h-10 w-64 bg-stone-200" />
        <Skeleton className="mt-4 h-96 w-full bg-stone-200" />
      </AdminLayout>
    )
  }

  return (
    <AdminLayout>
      <PageHeader
        title="Manajemen Tim"
        description="Kelola dan approve pendaftaran tim"
        actions={
          <div className="flex items-center gap-2">
            {filteredTeams.length > 0 && (
              <ExportButton
                options={[
                  {
                    label: 'Export CSV',
                    type: 'csv',
                    onExport: () => {
                      const data = filteredTeams.map((t) => ({
                        name: t.name,
                        game: t.game.name,
                        school: t.school?.name ?? '-',
                        status: t.status,
                        member_count: t.member_count,
                      }))
                      downloadCSV(data, 'teams.csv', [
                        { key: 'name', header: 'Nama Tim' },
                        { key: 'game', header: 'Game' },
                        { key: 'school', header: 'Sekolah' },
                        { key: 'status', header: 'Status' },
                        { key: 'member_count', header: 'Jumlah Anggota' },
                      ])
                    },
                  },
                ]}
              />
            )}
            <Button size="sm" onClick={() => setCreateOpen(true)} className="bg-porjar-red hover:bg-red-700">
              <Plus size={16} className="mr-1" />
              Tambah Tim
            </Button>
          </div>
        }
      />

      {/* Filters */}
      <div className="mb-4 flex flex-wrap items-center gap-4">
        <div className="flex items-center gap-1">
          {statusFilters.map((sf) => (
            <button
              key={sf.value}
              onClick={() => setStatusFilter(sf.value)}
              className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                statusFilter === sf.value
                  ? 'bg-porjar-red text-white'
                  : 'text-stone-500 hover:text-stone-900 hover:bg-stone-100'
              }`}
            >
              {sf.label}
            </button>
          ))}
        </div>

        {games.length > 0 && (
          <div className="flex items-center gap-1">
            <button
              onClick={() => setActiveGame(null)}
              className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                activeGame === null
                  ? 'bg-porjar-red text-white'
                  : 'text-stone-500 hover:text-stone-900 hover:bg-stone-100'
              }`}
            >
              Semua Game
            </button>
            <GameSelector games={games} activeSlug={activeGame} onSelect={setActiveGame} />
          </div>
        )}
      </div>

      {/* Bulk action bar */}
      {selectedIds.size > 0 && (
        <div className="mb-4 flex items-center gap-3 rounded-xl border border-stone-200 bg-stone-50 px-4 py-2.5 shadow-sm">
          <span className="flex-1 text-sm font-medium text-stone-700">
            {selectedIds.size} tim dipilih
          </span>
          <Button size="xs" onClick={() => handleBulkAction('approve')} disabled={bulkProcessing} className="bg-green-600 hover:bg-green-700">
            <CheckCircle size={14} className="mr-1" />
            {bulkProcessing ? 'Memproses...' : 'Approve Semua'}
          </Button>
          <Button size="xs" variant="destructive" onClick={() => handleBulkAction('reject')} disabled={bulkProcessing}>
            <XCircle size={14} className="mr-1" />
            {bulkProcessing ? 'Memproses...' : 'Reject Semua'}
          </Button>
          <Button size="xs" variant="outline" onClick={() => setSelectedIds(new Set())} disabled={bulkProcessing} className="border-stone-300 text-stone-600">
            Batal
          </Button>
        </div>
      )}

      {/* Total counter */}
      <div className="mb-4 flex items-center gap-3 text-sm text-stone-500">
        <span>Menampilkan <span className="font-semibold text-stone-900">{totalFiltered}</span> dari <span className="font-semibold text-stone-900">{teams.length}</span> tim</span>
        {totalPages > 1 && <span className="text-stone-400">· Halaman {currentPage} dari {totalPages}</span>}
      </div>

      {totalFiltered === 0 ? (
        <EmptyState icon={Users} title="Tidak Ada Tim" description="Tidak ada tim yang cocok dengan filter." />
      ) : (
        <div className="rounded-xl border border-stone-200 bg-white shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-stone-200 hover:bg-transparent bg-stone-50">
                  <TableHead className="w-10 pl-4">
                    {pendingOnPage.length > 0 && (
                      <input
                        type="checkbox"
                        checked={allPendingSelected}
                        onChange={toggleSelectAll}
                        className="h-4 w-4 cursor-pointer rounded border-stone-300 accent-porjar-red"
                        aria-label="Pilih semua pending"
                      />
                    )}
                  </TableHead>
                  <TableHead className="text-stone-600 uppercase text-xs tracking-wider whitespace-nowrap">Nama Tim</TableHead>
                  <TableHead className="text-stone-600 uppercase text-xs tracking-wider whitespace-nowrap">Game</TableHead>
                  <TableHead className="hidden sm:table-cell text-stone-600 uppercase text-xs tracking-wider whitespace-nowrap">Sekolah</TableHead>
                  <TableHead className="hidden sm:table-cell text-center text-stone-600 uppercase text-xs tracking-wider">Anggota</TableHead>
                  <TableHead className="text-stone-600 uppercase text-xs tracking-wider whitespace-nowrap">Status</TableHead>
                  <TableHead className="text-right text-stone-600 uppercase text-xs tracking-wider">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedTeams.map((team) => (
                  <TableRow key={team.id} className="border-stone-100 hover:bg-red-50/50">
                    <TableCell className="pl-4">
                      {team.status === 'pending' && (
                        <input
                          type="checkbox"
                          checked={selectedIds.has(team.id)}
                          onChange={() => toggleSelectOne(team.id)}
                          className="h-4 w-4 cursor-pointer rounded border-stone-300 accent-porjar-red"
                          aria-label={`Pilih ${team.name}`}
                        />
                      )}
                    </TableCell>
                    <TableCell>
                      <span className="font-medium text-stone-900">{team.name}</span>
                    </TableCell>
                    <TableCell className="text-stone-500 text-sm">{team.game.name}</TableCell>
                    <TableCell className="hidden sm:table-cell text-stone-500 text-sm">{team.school?.name ?? '-'}</TableCell>
                    <TableCell className="hidden sm:table-cell text-center text-stone-500 tabular-nums">{team.member_count}</TableCell>
                    <TableCell><StatusBadge status={team.status} /></TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        {/* View detail */}
                        <Button size="xs" variant="ghost" onClick={() => openDetail(team)} className="text-stone-500 hover:text-stone-900 hover:bg-stone-100">
                          <Eye size={14} />
                        </Button>
                        {/* Edit */}
                        <Button size="xs" variant="ghost" onClick={() => { setEditTeam(team); setEditName(team.name) }} className="text-stone-500 hover:text-stone-900 hover:bg-stone-100">
                          <PencilSimple size={14} />
                        </Button>
                        {/* Approve/Reject for pending */}
                        {team.status === 'pending' && (
                          <>
                            <Button size="xs" onClick={() => setConfirmAction({ teamId: team.id, teamName: team.name, action: 'approve' })} className="bg-green-600 hover:bg-green-700">
                              <CheckCircle size={14} className="mr-0.5" />
                              Approve
                            </Button>
                            <Button size="xs" variant="destructive" onClick={() => setConfirmAction({ teamId: team.id, teamName: team.name, action: 'reject' })}>
                              <XCircle size={14} className="mr-0.5" />
                              Reject
                            </Button>
                          </>
                        )}
                        {/* Delete */}
                        <Button size="xs" variant="ghost" onClick={() => setConfirmAction({ teamId: team.id, teamName: team.name, action: 'delete' })} className="text-red-500 hover:text-red-700 hover:bg-red-50">
                          <Trash size={14} />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex flex-col gap-2 border-t border-stone-200 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-xs text-stone-500">
                {(currentPage - 1) * perPage + 1}–{Math.min(currentPage * perPage, totalFiltered)} dari {totalFiltered} tim
              </p>
              <div className="flex items-center gap-1">
                <button onClick={() => setCurrentPage((p) => Math.max(1, p - 1))} disabled={currentPage === 1} className="rounded-lg border border-stone-200 px-3 py-1.5 text-xs font-medium text-stone-600 transition-colors hover:bg-stone-50 disabled:opacity-40 disabled:cursor-not-allowed">
                  Sebelumnya
                </button>
                {Array.from({ length: totalPages }, (_, i) => i + 1)
                  .filter((p) => p === 1 || p === totalPages || Math.abs(p - currentPage) <= 1)
                  .reduce<(number | string)[]>((acc, p, i, arr) => {
                    if (i > 0 && p - (arr[i - 1] as number) > 1) acc.push('...')
                    acc.push(p)
                    return acc
                  }, [])
                  .map((p, i) =>
                    typeof p === 'string' ? (
                      <span key={`dot-${i}`} className="px-1 text-xs text-stone-400">...</span>
                    ) : (
                      <button key={p} onClick={() => setCurrentPage(p)} className={`min-w-[32px] rounded-lg border px-2 py-1.5 text-xs font-medium transition-colors ${currentPage === p ? 'border-porjar-red bg-porjar-red text-white' : 'border-stone-200 text-stone-600 hover:bg-stone-50'}`}>
                        {p}
                      </button>
                    )
                  )}
                <button onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} className="rounded-lg border border-stone-200 px-3 py-1.5 text-xs font-medium text-stone-600 transition-colors hover:bg-stone-50 disabled:opacity-40 disabled:cursor-not-allowed">
                  Berikutnya
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Confirm dialog (approve / reject / delete) */}
      <Dialog open={!!confirmAction} onOpenChange={(open) => !open && setConfirmAction(null)}>
        <DialogContent className="bg-white border-stone-200 text-stone-900">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-stone-900">
              <WarningCircle size={20} className={confirmAction?.action === 'delete' ? 'text-red-500' : 'text-amber-500'} />
              Konfirmasi {confirmAction?.action === 'approve' ? 'Approve' : confirmAction?.action === 'reject' ? 'Reject' : 'Hapus'}
            </DialogTitle>
            <DialogDescription className="text-stone-500">
              {confirmAction?.action === 'approve' && `Setujui tim "${confirmAction?.teamName}" untuk mengikuti turnamen?`}
              {confirmAction?.action === 'reject' && `Tolak pendaftaran tim "${confirmAction?.teamName}"?`}
              {confirmAction?.action === 'delete' && `Hapus tim "${confirmAction?.teamName}" secara permanen? Tindakan ini tidak bisa dibatalkan.`}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmAction(null)} className="border-stone-300 text-stone-600">Batal</Button>
            <Button
              onClick={handleAction}
              disabled={processing}
              className={confirmAction?.action === 'approve' ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'}
            >
              {processing ? 'Memproses...' : confirmAction?.action === 'approve' ? 'Ya, Approve' : confirmAction?.action === 'reject' ? 'Ya, Reject' : 'Ya, Hapus'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create dialog */}
      <Dialog open={createOpen} onOpenChange={(open) => { setCreateOpen(open); if (!open) setCreateForm({ name: '', game_id: '', school_id: '' }) }}>
        <DialogContent className="bg-white border-stone-200 text-stone-900">
          <DialogHeader>
            <DialogTitle className="text-stone-900">Tambah Tim Baru</DialogTitle>
            <DialogDescription className="text-stone-500">Buat tim baru. Admin akan menjadi kapten sementara.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div>
              <label className="mb-1 block text-xs font-medium text-stone-700">Nama Tim</label>
              <Input
                placeholder="Nama tim (3-50 karakter)"
                value={createForm.name}
                onChange={(e) => setCreateForm((f) => ({ ...f, name: e.target.value }))}
                className="border-stone-300"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-stone-700">Game</label>
              <select
                value={createForm.game_id}
                onChange={(e) => setCreateForm((f) => ({ ...f, game_id: e.target.value }))}
                className="w-full rounded-md border border-stone-300 bg-white px-3 py-2 text-sm text-stone-900 focus:outline-none focus:ring-2 focus:ring-porjar-red"
              >
                <option value="">Pilih game...</option>
                {games.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-stone-700">Sekolah</label>
              <select
                value={createForm.school_id}
                onChange={(e) => setCreateForm((f) => ({ ...f, school_id: e.target.value }))}
                className="w-full rounded-md border border-stone-300 bg-white px-3 py-2 text-sm text-stone-900 focus:outline-none focus:ring-2 focus:ring-porjar-red"
              >
                <option value="">Pilih sekolah...</option>
                {schools.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)} className="border-stone-300 text-stone-600">Batal</Button>
            <Button onClick={handleCreate} disabled={createLoading} className="bg-porjar-red hover:bg-red-700">
              {createLoading ? 'Menyimpan...' : 'Buat Tim'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit dialog */}
      <Dialog open={!!editTeam} onOpenChange={(open) => !open && setEditTeam(null)}>
        <DialogContent className="bg-white border-stone-200 text-stone-900">
          <DialogHeader>
            <DialogTitle className="text-stone-900">Edit Tim</DialogTitle>
            <DialogDescription className="text-stone-500">Ubah nama tim &quot;{editTeam?.name}&quot;.</DialogDescription>
          </DialogHeader>
          <div className="py-2">
            <label className="mb-1 block text-xs font-medium text-stone-700">Nama Tim</label>
            <Input
              placeholder="Nama tim (3-50 karakter)"
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              className="border-stone-300"
              onKeyDown={(e) => e.key === 'Enter' && handleEdit()}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditTeam(null)} className="border-stone-300 text-stone-600">Batal</Button>
            <Button onClick={handleEdit} disabled={editLoading} className="bg-porjar-red hover:bg-red-700">
              {editLoading ? 'Menyimpan...' : 'Simpan'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Detail sheet */}
      <Sheet open={detailOpen} onOpenChange={setDetailOpen}>
        <SheetContent className="w-full sm:max-w-lg bg-white overflow-y-auto">
          <SheetHeader className="mb-4">
            <SheetTitle className="text-stone-900">{detailTeam?.name ?? 'Detail Tim'}</SheetTitle>
            <SheetDescription className="text-stone-500">
              {detailTeam && `${detailTeam.game.name} · ${detailTeam.school?.name ?? 'Tanpa Sekolah'}`}
            </SheetDescription>
          </SheetHeader>

          {detailLoading ? (
            <div className="space-y-3">
              <Skeleton className="h-8 w-full bg-stone-200" />
              <Skeleton className="h-8 w-full bg-stone-200" />
              <Skeleton className="h-8 w-full bg-stone-200" />
            </div>
          ) : detailTeam ? (
            <div className="space-y-4">
              {/* Info */}
              <div className="grid grid-cols-2 gap-3 rounded-xl border border-stone-200 bg-stone-50 p-4 text-sm">
                <div>
                  <p className="text-xs text-stone-500">Status</p>
                  <StatusBadge status={detailTeam.status} />
                </div>
                <div>
                  <p className="text-xs text-stone-500">Kapten</p>
                  <p className="font-medium text-stone-900">{detailTeam.captain?.full_name ?? '-'}</p>
                </div>
                <div>
                  <p className="text-xs text-stone-500">Total Anggota</p>
                  <p className="font-medium text-stone-900">{detailTeam.member_count}</p>
                </div>
                <div>
                  <p className="text-xs text-stone-500">Seed</p>
                  <p className="font-medium text-stone-900">{detailTeam.seed ?? '-'}</p>
                </div>
              </div>

              {/* Members */}
              <div>
                <h3 className="mb-2 text-sm font-semibold text-stone-700">Anggota Tim</h3>
                {detailTeam.members?.length === 0 ? (
                  <p className="text-sm text-stone-400">Belum ada anggota.</p>
                ) : (
                  <div className="space-y-2">
                    {detailTeam.members?.map((member) => (
                      <div key={member.id} className="flex items-center justify-between rounded-lg border border-stone-200 bg-white px-3 py-2">
                        <div>
                          <p className="text-sm font-medium text-stone-900">{member.full_name}</p>
                          <p className="text-xs text-stone-500">{member.in_game_name} · <span className="capitalize">{member.role}</span></p>
                        </div>
                        {member.role !== 'captain' && (
                          <Button
                            size="xs"
                            variant="ghost"
                            onClick={() => handleRemoveMember(member.user_id)}
                            className="text-red-500 hover:text-red-700 hover:bg-red-50"
                          >
                            <Trash size={13} />
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ) : null}
        </SheetContent>
      </Sheet>
    </AdminLayout>
  )
}
