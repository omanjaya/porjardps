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
import { Users, CheckCircle, XCircle, WarningCircle } from '@phosphor-icons/react'
import { downloadCSV } from '@/lib/csv'
import { ExportButton } from '@/components/shared/ExportButton'
import type { Team, Game, GameSlug, TeamStatus } from '@/types'

const statusFilters: { value: TeamStatus | 'all'; label: string }[] = [
  { value: 'all', label: 'Semua' },
  { value: 'pending', label: 'Pending' },
  { value: 'approved', label: 'Approved' },
  { value: 'rejected', label: 'Rejected' },
]

export default function AdminTeamsPage() {
  const { isAuthenticated, isLoading: authLoading } = useAuthStore()
  const [teams, setTeams] = useState<Team[]>([])
  const [games, setGames] = useState<{ slug: GameSlug; name: string }[]>([])
  const [loading, setLoading] = useState(true)
  const [activeGame, setActiveGame] = useState<GameSlug | null>(null)
  const [statusFilter, setStatusFilter] = useState<TeamStatus | 'all'>('all')
  const [confirmAction, setConfirmAction] = useState<{
    teamId: string
    teamName: string
    action: 'approve' | 'reject'
  } | null>(null)
  const [processing, setProcessing] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)
  const perPage = 20
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [bulkProcessing, setBulkProcessing] = useState(false)

  const loadData = useCallback(async () => {
    if (!isAuthenticated || authLoading) return
    try {
      // Fetch all teams with pagination
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
      const g = await api.get<Game[]>('/games')
      setTeams(allTeams)
      setGames(
        (g ?? []).filter((game) => game.is_active).map((game) => ({ slug: game.slug, name: game.name }))
      )
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

  // Reset page and selection when filter changes
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
      } else {
        await api.put(`/admin/teams/${confirmAction.teamId}/reject`, { reason: 'Ditolak oleh admin' })
      }
      toast.success(
        confirmAction.action === 'approve'
          ? `${confirmAction.teamName} disetujui`
          : `${confirmAction.teamName} ditolak`
      )
      setConfirmAction(null)
      await loadData()
    } catch {
      toast.error('Gagal mengubah status tim')
    } finally {
      setProcessing(false)
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
          filteredTeams.length > 0 && (
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
          )
        }
      />

      {/* Filters */}
      <div className="mb-4 flex flex-wrap items-center gap-4">
        {/* Status filter */}
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

        {/* Game filter */}
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
          <Button
            size="xs"
            onClick={() => handleBulkAction('approve')}
            disabled={bulkProcessing}
            className="bg-green-600 hover:bg-green-700"
          >
            <CheckCircle size={14} className="mr-1" />
            {bulkProcessing ? 'Memproses...' : 'Approve Semua'}
          </Button>
          <Button
            size="xs"
            variant="destructive"
            onClick={() => handleBulkAction('reject')}
            disabled={bulkProcessing}
          >
            <XCircle size={14} className="mr-1" />
            {bulkProcessing ? 'Memproses...' : 'Reject Semua'}
          </Button>
          <Button
            size="xs"
            variant="outline"
            onClick={() => setSelectedIds(new Set())}
            disabled={bulkProcessing}
            className="border-stone-300 text-stone-600"
          >
            Batal
          </Button>
        </div>
      )}

      {/* Total counter */}
      <div className="mb-4 flex items-center gap-3 text-sm text-stone-500">
        <span>Menampilkan <span className="font-semibold text-stone-900">{totalFiltered}</span> dari <span className="font-semibold text-stone-900">{teams.length}</span> tim</span>
        {totalPages > 1 && (
          <span className="text-stone-400">· Halaman {currentPage} dari {totalPages}</span>
        )}
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
                <TableHead className="text-stone-600 uppercase text-xs tracking-wider whitespace-nowrap">Sekolah</TableHead>
                <TableHead className="text-center text-stone-600 uppercase text-xs tracking-wider">Anggota</TableHead>
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
                  <TableCell className="text-stone-500 text-sm">
                    {team.school?.name ?? '-'}
                  </TableCell>
                  <TableCell className="text-center text-stone-500 tabular-nums">
                    {team.member_count}
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={team.status} />
                  </TableCell>
                  <TableCell className="text-right">
                    {team.status === 'pending' && (
                      <div className="flex items-center justify-end gap-1.5">
                        <Button
                          size="xs"
                          onClick={() =>
                            setConfirmAction({
                              teamId: team.id,
                              teamName: team.name,
                              action: 'approve',
                            })
                          }
                          className="bg-green-600 hover:bg-green-700"
                        >
                          <CheckCircle size={14} className="mr-0.5" />
                          Approve
                        </Button>
                        <Button
                          size="xs"
                          variant="destructive"
                          onClick={() =>
                            setConfirmAction({
                              teamId: team.id,
                              teamName: team.name,
                              action: 'reject',
                            })
                          }
                        >
                          <XCircle size={14} className="mr-0.5" />
                          Reject
                        </Button>
                      </div>
                    )}
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
                <button
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="rounded-lg border border-stone-200 px-3 py-1.5 text-xs font-medium text-stone-600 transition-colors hover:bg-stone-50 disabled:opacity-40 disabled:cursor-not-allowed"
                >
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
                      <button
                        key={p}
                        onClick={() => setCurrentPage(p)}
                        className={`min-w-[32px] rounded-lg border px-2 py-1.5 text-xs font-medium transition-colors ${
                          currentPage === p
                            ? 'border-porjar-red bg-porjar-red text-white'
                            : 'border-stone-200 text-stone-600 hover:bg-stone-50'
                        }`}
                      >
                        {p}
                      </button>
                    )
                  )}
                <button
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="rounded-lg border border-stone-200 px-3 py-1.5 text-xs font-medium text-stone-600 transition-colors hover:bg-stone-50 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Berikutnya
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Confirm dialog */}
      <Dialog open={!!confirmAction} onOpenChange={(open) => !open && setConfirmAction(null)}>
        <DialogContent className="bg-white border-stone-200 text-stone-900">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-stone-900">
              <WarningCircle size={20} className="text-amber-500" />
              Konfirmasi {confirmAction?.action === 'approve' ? 'Approve' : 'Reject'}
            </DialogTitle>
            <DialogDescription className="text-stone-500">
              {confirmAction?.action === 'approve'
                ? `Setujui tim "${confirmAction?.teamName}" untuk mengikuti turnamen?`
                : `Tolak pendaftaran tim "${confirmAction?.teamName}"?`}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setConfirmAction(null)}
              className="border-stone-300 text-stone-600"
            >
              Batal
            </Button>
            <Button
              onClick={handleAction}
              disabled={processing}
              className={
                confirmAction?.action === 'approve'
                  ? 'bg-green-600 hover:bg-green-700'
                  : 'bg-red-600 hover:bg-red-700'
              }
            >
              {processing
                ? 'Memproses...'
                : confirmAction?.action === 'approve'
                  ? 'Ya, Approve'
                  : 'Ya, Reject'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  )
}
