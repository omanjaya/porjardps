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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Trophy, Users, Plus, Trash, MagnifyingGlass, ArrowCounterClockwise, TreeStructure, ChartBar, List, Medal, Spinner, UserPlus, ShieldCheck, IdentificationCard, ArrowsClockwise, ClipboardText, Crown } from '@phosphor-icons/react'
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
  const [championDialogOpen, setChampionDialogOpen] = useState(false)
  const [championTeamId, setChampionTeamId] = useState('')
  const [settingChampion, setSettingChampion] = useState(false)

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

  async function handleSetChampion() {
    if (!championTeamId) {
      toast.error('Pilih tim juara terlebih dahulu')
      return
    }
    setSettingChampion(true)
    try {
      await api.post(`/admin/tournaments/${params.id}/champion`, { team_id: championTeamId })
      toast.success('Juara turnamen berhasil ditetapkan')
      setChampionDialogOpen(false)
      setChampionTeamId('')
      await loadData()
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Gagal menetapkan juara')
    } finally {
      setSettingChampion(false)
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

      {/* Champion Banner */}
      {tournament.status === 'completed' && tournament.champion_team_name && (
        <div className="mb-6 rounded-xl border-2 border-yellow-400 dark:border-yellow-600 bg-yellow-50 dark:bg-yellow-950/20 p-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <Crown size={28} weight="fill" className="text-yellow-500 shrink-0" />
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-yellow-700 dark:text-yellow-400 mb-0.5">Juara Turnamen</p>
                <p className="text-lg font-bold text-yellow-900 dark:text-yellow-200">{tournament.champion_team_name}</p>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => { setChampionTeamId(tournament.champion_team_id ?? ''); setChampionDialogOpen(true) }}
              className="shrink-0 border-yellow-400 dark:border-yellow-600 text-yellow-700 dark:text-yellow-400 hover:bg-yellow-100 dark:hover:bg-yellow-950/40"
            >
              <ArrowsClockwise size={14} className="mr-1.5" />
              Ganti Juara
            </Button>
          </div>
        </div>
      )}

      {/* Set Champion (completed but no champion yet) */}
      {tournament.status === 'completed' && !tournament.champion_team_name && (
        <div className="mb-6 rounded-xl border border-dashed border-yellow-400 dark:border-yellow-600 bg-yellow-50/50 dark:bg-yellow-950/10 p-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-yellow-800 dark:text-yellow-300">Belum ada juara ditetapkan</p>
              <p className="text-xs text-yellow-700 dark:text-yellow-500 mt-0.5">Tetapkan tim juara untuk turnamen yang sudah selesai ini.</p>
            </div>
            <Button
              size="sm"
              onClick={() => setChampionDialogOpen(true)}
              className="shrink-0 bg-yellow-500 hover:bg-yellow-600 text-white"
            >
              <Crown size={14} className="mr-1.5" />
              Tetapkan Juara
            </Button>
          </div>
        </div>
      )}

      {/* Quick Actions: pending teams alert */}
      {(() => {
        const pendingTeams = registeredTeams.filter((t) => t.status === 'pending')
        if (pendingTeams.length === 0) return null
        return (
          <div className="mb-6 rounded-xl border-2 border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-950/20 p-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <p className="font-bold text-amber-800 dark:text-amber-300">
                  {pendingTeams.length} tim menunggu persetujuan
                </p>
                <p className="text-xs text-amber-700 dark:text-amber-400 mt-1">
                  Review tim sebelum turnamen mulai
                </p>
              </div>
              <Link
                href={`/admin/approvals?tournament_id=${params.id}`}
                className="inline-flex shrink-0 items-center justify-center rounded-lg bg-amber-600 hover:bg-amber-700 px-4 py-2 text-sm font-bold text-white transition-colors"
              >
                Review Sekarang
              </Link>
            </div>
          </div>
        )
      })()}

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
        {(tournament.format === 'battle_royale_points') && (
          <Link href={`/admin/tournaments/${params.id}/rotation`}>
            <Button variant="outline" className="gap-1.5 border-stone-300 dark:border-zinc-600 text-stone-700 dark:text-zinc-300 hover:border-esi-red hover:text-esi-red">
              <ArrowsClockwise size={16} weight="duotone" />
              Rotasi Lobby
            </Button>
          </Link>
        )}
        <Link href={`/admin/tournaments/${params.id}/referees`}>
          <Button variant="outline" className="gap-1.5 border-stone-300 dark:border-zinc-600 text-stone-700 dark:text-zinc-300 hover:border-esi-red hover:text-esi-red">
            <ShieldCheck size={16} weight="duotone" />
            Wasit
          </Button>
        </Link>
        <Link href={`/admin/tournaments/${params.id}/cards`}>
          <Button variant="outline" className="gap-1.5 border-stone-300 dark:border-zinc-600 text-stone-700 dark:text-zinc-300 hover:border-esi-red hover:text-esi-red">
            <IdentificationCard size={16} weight="duotone" />
            Kartu
          </Button>
        </Link>
        <Link href={`/admin/tournaments/${params.id}/report`}>
          <Button variant="outline" className="gap-1.5 border-stone-300 dark:border-zinc-600 text-stone-700 dark:text-zinc-300 hover:border-esi-red hover:text-esi-red">
            <ClipboardText size={16} weight="duotone" />
            Laporan
          </Button>
        </Link>
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

      {/* Set Champion Dialog */}
      <Dialog open={championDialogOpen} onOpenChange={(open) => { if (!open) setChampionDialogOpen(false) }}>
        <DialogContent className="bg-white dark:bg-zinc-900 border-stone-200 dark:border-zinc-700 text-stone-900 dark:text-zinc-100 sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-stone-900 dark:text-zinc-100">
              <Crown size={18} weight="fill" className="text-yellow-500" />
              Tetapkan Juara Turnamen
            </DialogTitle>
            <DialogDescription className="text-stone-500 dark:text-zinc-400">
              Pilih tim yang menjadi juara turnamen ini.
            </DialogDescription>
          </DialogHeader>
          <div className="max-h-64 overflow-y-auto rounded-lg border border-stone-200 dark:border-zinc-700 divide-y divide-stone-100 dark:divide-zinc-700">
            {registeredTeams.length === 0 ? (
              <p className="p-4 text-center text-sm text-stone-400 dark:text-zinc-500">Tidak ada tim terdaftar</p>
            ) : (
              registeredTeams.map((team) => (
                <button
                  key={team.id}
                  type="button"
                  onClick={() => setChampionTeamId(team.id)}
                  className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors ${
                    championTeamId === team.id
                      ? 'bg-yellow-50 dark:bg-yellow-950/30 text-yellow-800 dark:text-yellow-200'
                      : 'hover:bg-stone-50 dark:hover:bg-zinc-800 text-stone-700 dark:text-zinc-300'
                  }`}
                >
                  <Crown size={14} weight={championTeamId === team.id ? 'fill' : 'regular'} className={championTeamId === team.id ? 'text-yellow-500' : 'text-stone-300 dark:text-zinc-600'} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{team.name}</p>
                    {team.school?.name && <p className="text-[11px] text-stone-400 dark:text-zinc-500 truncate">{team.school.name}</p>}
                  </div>
                </button>
              ))
            )}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setChampionDialogOpen(false)}
              disabled={settingChampion}
              className="border-stone-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-stone-700 dark:text-zinc-300"
            >
              Batal
            </Button>
            <Button
              onClick={handleSetChampion}
              disabled={settingChampion || !championTeamId}
              className="bg-yellow-500 hover:bg-yellow-600 text-white"
            >
              {settingChampion && <Spinner size={14} className="mr-1 animate-spin" />}
              {settingChampion ? 'Menyimpan...' : 'Tetapkan Juara'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  )
}
