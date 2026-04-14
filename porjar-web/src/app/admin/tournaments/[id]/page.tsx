'use client'

import { useEffect, useState, useCallback, useMemo } from 'react'
import { useParams } from 'next/navigation'
import { toast } from 'sonner'
import { api, ApiError } from '@/lib/api'
import { useAuthStore } from '@/store/auth-store'
import { AdminLayout } from '@/components/layouts/AdminLayout'
import { PageHeader } from '@/components/shared/PageHeader'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { EmptyState } from '@/components/shared/EmptyState'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Trophy, Users, Plus, Trash, MagnifyingGlass, ArrowCounterClockwise, TreeStructure, ChartBar, List, Medal, Spinner, UserPlus } from '@phosphor-icons/react'
import Link from 'next/link'
import { FORMAT_LABELS } from '../TournamentWizardDialog'
import type { Tournament, Team } from '@/types'

interface AdminAddTeamsResponse {
  added: number
  skipped: number
  errors: string[]
}

export default function AdminTournamentDetailPage() {
  const { isAuthenticated, isLoading: authLoading } = useAuthStore()
  const params = useParams<{ id: string }>()
  const [tournament, setTournament] = useState<Tournament | null>(null)
  const [registeredTeams, setRegisteredTeams] = useState<Team[]>([])
  const [allTeams, setAllTeams] = useState<Team[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [addingAll, setAddingAll] = useState(false)
  const [addingTeamId, setAddingTeamId] = useState<string | null>(null)
  const [removeTarget, setRemoveTarget] = useState<{ teamId: string; teamName: string } | null>(null)
  const [removing, setRemoving] = useState(false)
  const [updatingStatus, setUpdatingStatus] = useState(false)
  const [resetResultsConfirm, setResetResultsConfirm] = useState(false)
  const [resettingResults, setResettingResults] = useState(false)

  const loadData = useCallback(async () => {
    if (!isAuthenticated || authLoading) return
    try {
      const [t, tt, teamsData] = await Promise.all([
        api.get<Tournament>(`/tournaments/${params.id}`),
        api.get<Team[]>(`/tournaments/${params.id}/teams`),
        fetchAllTeams(),
      ])
      setTournament(t)
      setRegisteredTeams(tt ?? [])
      setAllTeams(teamsData ?? [])
    } catch {
      toast.error('Gagal memuat data')
    } finally {
      setLoading(false)
    }
  }, [params.id, isAuthenticated, authLoading])

  useEffect(() => {
    loadData()
  }, [loadData])

  // Fetch all teams with pagination
  async function fetchAllTeams(): Promise<Team[]> {
    let all: Team[] = []
    let page = 1
    let totalPages = 1
    while (page <= totalPages) {
      const res = await api.getPaginated<Team[]>(`/teams?per_page=100&page=${page}`)
      const pageData = Array.isArray(res.data) ? res.data : []
      all = [...all, ...pageData]
      totalPages = res.meta?.total_pages ?? 1
      page++
    }
    return all
  }

  // Build a set of registered team IDs
  const registeredTeamIds = useMemo(
    () => new Set(registeredTeams.map((t) => t.id)),
    [registeredTeams]
  )

  // Available teams: same game, approved, not yet registered, same school level
  const availableTeams = useMemo(() => {
    if (!tournament) return []
    return allTeams.filter((t) => {
      if (t.game?.id !== tournament.game?.id) return false
      if (t.status !== 'approved') return false
      if (registeredTeamIds.has(t.id)) return false
      if (tournament.school_level && t.school?.level !== tournament.school_level) return false
      if (search) {
        const q = search.toLowerCase()
        if (
          !t.name.toLowerCase().includes(q) &&
          !(t.school?.name ?? '').toLowerCase().includes(q)
        )
          return false
      }
      return true
    })
  }, [allTeams, tournament, registeredTeamIds, search])

  async function handleAddTeam(teamId: string) {
    setAddingTeamId(teamId)
    try {
      await api.post<AdminAddTeamsResponse>(`/admin/tournaments/${params.id}/teams`, {
        team_ids: [teamId],
      })
      toast.success('Tim berhasil ditambahkan')
      await loadData()
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Gagal menambahkan tim')
    } finally {
      setAddingTeamId(null)
    }
  }

  async function handleAddAll() {
    if (availableTeams.length === 0) return
    setAddingAll(true)
    try {
      const result = await api.post<AdminAddTeamsResponse>(
        `/admin/tournaments/${params.id}/teams`,
        { team_ids: availableTeams.map((t) => t.id) }
      )
      const msg = `${result.added} tim ditambahkan`
      if (result.errors && result.errors.length > 0) {
        toast.warning(`${msg}, ${result.errors.length} error`)
      } else {
        toast.success(msg)
      }
      await loadData()
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Gagal menambahkan tim')
    } finally {
      setAddingAll(false)
    }
  }

  async function handleRemoveTeam() {
    if (!removeTarget) return
    setRemoving(true)
    try {
      await api.delete(`/admin/tournaments/${params.id}/teams/${removeTarget.teamId}`)
      toast.success(`${removeTarget.teamName} dihapus dari turnamen`)
      setRemoveTarget(null)
      await loadData()
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Gagal menghapus tim')
    } finally {
      setRemoving(false)
    }
  }

  const STATUS_FLOW: { value: string; label: string; color: string }[] = [
    { value: 'upcoming', label: 'Akan Datang', color: 'bg-stone-100 dark:bg-zinc-800 text-stone-600 dark:text-zinc-400 border-stone-300 dark:border-zinc-600' },
    { value: 'registration', label: 'Registrasi Dibuka', color: 'bg-blue-50 dark:bg-blue-950/30 text-blue-600 border-blue-200' },
    { value: 'ongoing', label: 'Berlangsung', color: 'bg-green-50 dark:bg-green-950/30 text-green-600 border-green-200' },
    { value: 'completed', label: 'Selesai', color: 'bg-stone-100 dark:bg-zinc-800 text-stone-500 dark:text-zinc-400 border-stone-300 dark:border-zinc-600' },
    { value: 'cancelled', label: 'Dibatalkan', color: 'bg-red-50 dark:bg-red-950/30 text-red-600 border-red-200' },
  ]

  async function handleResetResults() {
    setResettingResults(true)
    try {
      await api.post(`/admin/tournaments/${params.id}/bracket/reset-results`, {})
      toast.success('Semua hasil pertandingan berhasil direset')
      setResetResultsConfirm(false)
      await loadData()
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Gagal mereset hasil')
    } finally {
      setResettingResults(false)
    }
  }

  async function handleStatusChange(newStatus: string) {
    setUpdatingStatus(true)
    try {
      await api.put(`/admin/tournaments/${params.id}`, { status: newStatus })
      toast.success(`Status diubah ke ${STATUS_FLOW.find(s => s.value === newStatus)?.label}`)
      await loadData()
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Gagal mengubah status')
    } finally {
      setUpdatingStatus(false)
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

  if (!tournament) {
    return (
      <AdminLayout>
        <EmptyState icon={Trophy} title="Turnamen Tidak Ditemukan" description="Turnamen tidak ada atau sudah dihapus." />
      </AdminLayout>
    )
  }

  return (
    <AdminLayout>
      <PageHeader
        title={tournament.name}
        description="Kelola tim yang terdaftar di turnamen ini"
        breadcrumbs={[
          { label: 'Turnamen', href: '/admin/tournaments' },
          { label: tournament.name },
        ]}
      />

      {/* Tournament Info */}
      <div className="mb-6 rounded-xl border border-stone-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 p-5 shadow-sm">
        <div className="flex flex-wrap items-center gap-2 sm:gap-4 text-sm mb-4">
          <div className="flex items-center gap-2">
            <span className="text-stone-500 dark:text-zinc-400">Game:</span>
            <span className="font-semibold text-stone-900 dark:text-zinc-100">{tournament.game?.name ?? '-'}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-stone-500 dark:text-zinc-400">Format:</span>
            <span className="font-semibold text-stone-900 dark:text-zinc-100">{FORMAT_LABELS[tournament.format] || tournament.format?.replace(/_/g, ' ')}</span>
          </div>
          {tournament.school_level && (
            <div className="flex items-center gap-2">
              <span className="text-stone-500 dark:text-zinc-400">Tingkat:</span>
              <span className="font-semibold text-stone-900 dark:text-zinc-100">{tournament.school_level}</span>
            </div>
          )}
          <div className="flex items-center gap-2">
            <span className="text-stone-500 dark:text-zinc-400">BO:</span>
            <span className="font-semibold text-stone-900 dark:text-zinc-100">{tournament.best_of}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-stone-500 dark:text-zinc-400">Tim:</span>
            <span className="font-semibold text-stone-900 dark:text-zinc-100">
              {registeredTeams.length}
              {tournament.max_teams ? ` / ${tournament.max_teams}` : ''}
            </span>
          </div>
        </div>

        {/* Status Flow */}
        <div>
          <span className="text-xs font-semibold uppercase tracking-wider text-stone-400 dark:text-zinc-500 mb-2 block">Status Turnamen</span>
          <div className="flex flex-wrap items-center gap-2">
            {STATUS_FLOW.map((s) => {
              const isActive = tournament.status === s.value
              return (
                <button
                  key={s.value}
                  disabled={updatingStatus || isActive}
                  onClick={() => handleStatusChange(s.value)}
                  className={`rounded-lg border px-3 py-1.5 text-xs font-semibold transition-all ${
                    isActive
                      ? `${s.color} ring-2 ring-offset-1 ring-esi-red/40`
                      : 'border-stone-200 dark:border-zinc-700 text-stone-400 dark:text-zinc-500 hover:text-stone-700 dark:text-zinc-300 hover:border-stone-400 hover:bg-stone-50 dark:hover:bg-zinc-800 dark:bg-zinc-800/50'
                  } ${updatingStatus ? 'opacity-50 cursor-not-allowed' : isActive ? 'cursor-default' : 'cursor-pointer'}`}
                >
                  {s.label}
                </button>
              )
            })}
          </div>
        </div>
      </div>

      {/* Quick Navigation */}
      <div className="mb-6 flex flex-wrap gap-2">
        {(tournament.format === 'group_stage_playoff') && (
          <Link href={`/admin/tournaments/${params.id}/groups`}>
            <Button variant="outline" className="gap-1.5 border-stone-300 dark:border-zinc-600 text-stone-700 dark:text-zinc-300 hover:border-esi-red hover:text-esi-red">
              <Users size={16} weight="duotone" />
              Kelola Grup
            </Button>
          </Link>
        )}
        {(tournament.format !== 'battle_royale_points') && (
          <Link href={`/admin/tournaments/${params.id}/bracket`}>
            <Button variant="outline" className="gap-1.5 border-stone-300 dark:border-zinc-600 text-stone-700 dark:text-zinc-300 hover:border-esi-red hover:text-esi-red">
              <TreeStructure size={16} weight="duotone" />
              {tournament.format === 'group_stage_playoff' ? 'Bracket Playoff' : 'Kelola Bracket'}
            </Button>
          </Link>
        )}
        {(tournament.format === 'swiss') && (
          <Link href={`/admin/tournaments/${params.id}/swiss`}>
            <Button variant="outline" className="gap-1.5 border-stone-300 dark:border-zinc-600 text-stone-700 dark:text-zinc-300 hover:border-esi-red hover:text-esi-red">
              <Trophy size={16} weight="duotone" />
              Kelola Swiss
            </Button>
          </Link>
        )}
        {(tournament.format === 'multi_stage') && (
          <Link href={`/admin/tournaments/${params.id}/stages`}>
            <Button variant="outline" className="gap-1.5 border-stone-300 dark:border-zinc-600 text-stone-700 dark:text-zinc-300 hover:border-esi-red hover:text-esi-red">
              <List size={16} weight="duotone" />
              Kelola Stages
            </Button>
          </Link>
        )}
        {(tournament.format === 'battle_royale_points') && (
          <Link href={`/admin/tournaments/${params.id}/lobbies`}>
            <Button variant="outline" className="gap-1.5 border-stone-300 dark:border-zinc-600 text-stone-700 dark:text-zinc-300 hover:border-esi-red hover:text-esi-red">
              <List size={16} weight="duotone" />
              Kelola POT &amp; Lobby
            </Button>
          </Link>
        )}
        <Link href={`/tournaments/${params.id}`}>
          <Button variant="outline" className="gap-1.5 border-stone-300 dark:border-zinc-600 text-stone-700 dark:text-zinc-300 hover:border-esi-red hover:text-esi-red">
            <ChartBar size={16} weight="duotone" />
            Halaman Publik
          </Button>
        </Link>
        {tournament.event_id && (
          <Button
            variant="outline"
            className="gap-1.5 border-green-300 dark:border-green-700 text-green-700 dark:text-green-400 hover:border-green-500 hover:text-green-600"
            onClick={async () => {
              try {
                const result = await api.post<{ assigned: number }>(`/admin/events/${tournament.event_id}/auto-assign/${params.id}`)
                toast.success(`${result.assigned} tim berhasil di-assign dari event`)
                loadData()
              } catch {
                toast.error('Gagal auto-assign tim dari event')
              }
            }}
          >
            <UserPlus size={16} weight="duotone" />
            Auto-Assign dari Event
          </Button>
        )}
        {tournament.status === 'completed' && (
          <Button
            variant="outline"
            className="gap-1.5 border-amber-300 dark:border-amber-700 text-amber-700 dark:text-amber-400 hover:border-amber-500 hover:text-amber-600"
            onClick={async () => {
              try {
                await api.post(`/admin/tournaments/${params.id}/distribute-points`)
                toast.success('Poin event berhasil didistribusikan')
              } catch {
                toast.error('Gagal mendistribusikan poin')
              }
            }}
          >
            <Medal size={16} weight="duotone" />
            Distribusi Poin
          </Button>
        )}
      </div>

      {/* Danger Zone: Reset Results — only show when tournament has actual results */}
      {(['ongoing', 'active', 'completed'].includes(tournament.status)) && (
      <div className="mb-6 rounded-xl border border-amber-200 dark:border-amber-800/50 bg-amber-50 dark:bg-amber-950/20 p-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-amber-800 dark:text-amber-400">Reset Hasil Pertandingan</p>
            <p className="text-xs text-amber-700 dark:text-amber-500 mt-0.5">
              Hapus semua skor, submission, dan standings. Struktur bracket &amp; seeding tetap terjaga.
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setResetResultsConfirm(true)}
            disabled={resettingResults}
            className="shrink-0 border-amber-300 dark:border-amber-700 text-amber-700 dark:text-amber-400 hover:bg-amber-100 dark:hover:bg-amber-950/40"
          >
            <ArrowCounterClockwise size={14} className="mr-1.5" />
            Reset Hasil
          </Button>
        </div>
      </div>
      )}

      {/* Registered Teams */}
      <div className="mb-8">
        <h2 className="mb-3 flex items-center gap-2 text-lg font-bold text-stone-900 dark:text-zinc-100">
          <Users size={20} weight="duotone" />
          Tim Terdaftar
          <span className="rounded-full bg-stone-100 dark:bg-zinc-800 px-2.5 py-0.5 text-xs font-medium text-stone-600 dark:text-zinc-400">
            {registeredTeams.length}
          </span>
        </h2>

        {registeredTeams.length === 0 ? (
          <div className="rounded-xl border border-dashed border-stone-300 dark:border-zinc-600 bg-stone-50 dark:bg-zinc-800/50 p-8 text-center">
            <Users size={32} className="mx-auto mb-2 text-stone-400 dark:text-zinc-500" />
            <p className="text-sm text-stone-500 dark:text-zinc-400">Belum ada tim yang terdaftar</p>
          </div>
        ) : (
          <div className="rounded-xl border border-stone-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-stone-200 dark:border-zinc-700 hover:bg-transparent bg-stone-50 dark:bg-zinc-800/50">
                    <TableHead className="text-stone-600 dark:text-zinc-400 uppercase text-xs tracking-wider">Nama Tim</TableHead>
                    <TableHead className="hidden sm:table-cell text-stone-600 dark:text-zinc-400 uppercase text-xs tracking-wider">Sekolah</TableHead>
                    <TableHead className="hidden sm:table-cell text-center text-stone-600 dark:text-zinc-400 uppercase text-xs tracking-wider">Anggota</TableHead>
                    <TableHead className="hidden sm:table-cell text-stone-600 dark:text-zinc-400 uppercase text-xs tracking-wider">Status</TableHead>
                    <TableHead className="text-right text-stone-600 dark:text-zinc-400 uppercase text-xs tracking-wider">Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {registeredTeams.map((team) => (
                    <TableRow key={team.id} className="border-stone-100 dark:border-zinc-700 hover:bg-red-50 dark:bg-red-950/30">
                      <TableCell>
                        <span className="font-medium text-stone-900 dark:text-zinc-100">{team.name}</span>
                      </TableCell>
                      <TableCell className="hidden sm:table-cell text-stone-500 dark:text-zinc-400 text-sm">
                        {team.school?.name ?? '-'}
                      </TableCell>
                      <TableCell className="hidden sm:table-cell text-center text-stone-500 dark:text-zinc-400 tabular-nums">
                        {team.member_count}
                      </TableCell>
                      <TableCell className="hidden sm:table-cell">
                        <StatusBadge status={team.status} />
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          size="xs"
                          variant="outline"
                          className="border-red-200 text-red-500 hover:bg-red-50 dark:bg-red-950/30"
                          onClick={() => setRemoveTarget({ teamId: team.id, teamName: team.name })}
                        >
                          <Trash size={14} className="mr-0.5" />
                          Hapus
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        )}
      </div>

      {/* Add Teams */}
      <div>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-lg font-bold text-stone-900 dark:text-zinc-100">
            <Plus size={20} weight="duotone" />
            Tambah Tim
            <span className="rounded-full bg-stone-100 dark:bg-zinc-800 px-2.5 py-0.5 text-xs font-medium text-stone-600 dark:text-zinc-400">
              {availableTeams.length}
            </span>
          </h2>
          {availableTeams.length > 0 && (
            <Button
              onClick={handleAddAll}
              disabled={addingAll}
              className="bg-esi-red hover:bg-esi-red-dark text-white"
            >
              <Plus size={14} className="mr-1" />
              {addingAll ? 'Menambahkan...' : `Tambah Semua (${availableTeams.length})`}
            </Button>
          )}
        </div>

        {/* Search */}
        <div className="relative mb-4">
          <MagnifyingGlass
            size={16}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400 dark:text-zinc-500"
          />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari tim atau sekolah..."
            className="bg-white dark:bg-zinc-900 border-stone-300 dark:border-zinc-600 pl-9 focus:border-esi-red"
          />
        </div>

        {availableTeams.length === 0 ? (
          <div className="rounded-xl border border-dashed border-stone-300 dark:border-zinc-600 bg-stone-50 dark:bg-zinc-800/50 p-8 text-center">
            <Trophy size={32} className="mx-auto mb-2 text-stone-400 dark:text-zinc-500" />
            <p className="text-sm text-stone-500 dark:text-zinc-400">
              {search
                ? 'Tidak ada tim yang cocok dengan pencarian'
                : 'Semua tim yang memenuhi syarat sudah terdaftar'}
            </p>
          </div>
        ) : (
          <div className="rounded-xl border border-stone-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-stone-200 dark:border-zinc-700 hover:bg-transparent bg-stone-50 dark:bg-zinc-800/50">
                    <TableHead className="text-stone-600 dark:text-zinc-400 uppercase text-xs tracking-wider">Nama Tim</TableHead>
                    <TableHead className="text-stone-600 dark:text-zinc-400 uppercase text-xs tracking-wider">Sekolah</TableHead>
                    <TableHead className="text-center text-stone-600 dark:text-zinc-400 uppercase text-xs tracking-wider">Anggota</TableHead>
                    <TableHead className="text-right text-stone-600 dark:text-zinc-400 uppercase text-xs tracking-wider">Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {availableTeams.map((team) => (
                    <TableRow key={team.id} className="border-stone-100 dark:border-zinc-700 hover:bg-green-50 dark:bg-green-950/30">
                      <TableCell>
                        <span className="font-medium text-stone-900 dark:text-zinc-100">{team.name}</span>
                      </TableCell>
                      <TableCell className="text-stone-500 dark:text-zinc-400 text-sm">
                        {team.school?.name ?? '-'}
                      </TableCell>
                      <TableCell className="text-center text-stone-500 dark:text-zinc-400 tabular-nums">
                        {team.member_count}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          size="xs"
                          className="bg-green-600 hover:bg-green-700"
                          disabled={addingTeamId === team.id}
                          onClick={() => handleAddTeam(team.id)}
                        >
                          <Plus size={14} className="mr-0.5" />
                          {addingTeamId === team.id ? 'Menambah...' : 'Tambah'}
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        )}
      </div>

      {/* Remove Confirmation */}
      <ConfirmDialog
        open={!!removeTarget}
        title="Hapus Tim dari Turnamen"
        description={`Yakin ingin menghapus "${removeTarget?.teamName}" dari turnamen ini?`}
        confirmLabel={removing ? 'Menghapus...' : 'Hapus'}
        onConfirm={handleRemoveTeam}
        onCancel={() => setRemoveTarget(null)}
        loading={removing}
        variant="destructive"
      />

      {/* Reset Results Confirmation */}
      <ConfirmDialog
        open={resetResultsConfirm}
        title="Reset Semua Hasil Pertandingan?"
        description="Semua skor, submission, dan standings akan dihapus. Struktur bracket dan seeding tetap ada. Aksi ini tidak bisa dibatalkan."
        confirmLabel={resettingResults ? 'Mereset...' : 'Ya, Reset Sekarang'}
        onConfirm={handleResetResults}
        onCancel={() => setResetResultsConfirm(false)}
        loading={resettingResults}
        variant="destructive"
      />
    </AdminLayout>
  )
}
