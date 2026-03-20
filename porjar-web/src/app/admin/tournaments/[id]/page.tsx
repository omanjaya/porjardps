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
import { Trophy, Users, Plus, Trash, MagnifyingGlass } from '@phosphor-icons/react'
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

  // Available teams: same game, approved, not yet registered
  const availableTeams = useMemo(() => {
    if (!tournament) return []
    return allTeams.filter((t) => {
      if (t.game?.id !== tournament.game?.id) return false
      if (t.status !== 'approved') return false
      if (registeredTeamIds.has(t.id)) return false
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
    { value: 'upcoming', label: 'Akan Datang', color: 'bg-stone-100 text-stone-600 border-stone-300' },
    { value: 'registration', label: 'Registrasi Dibuka', color: 'bg-blue-50 text-blue-600 border-blue-200' },
    { value: 'ongoing', label: 'Berlangsung', color: 'bg-green-50 text-green-600 border-green-200' },
    { value: 'completed', label: 'Selesai', color: 'bg-stone-100 text-stone-500 border-stone-300' },
    { value: 'cancelled', label: 'Dibatalkan', color: 'bg-red-50 text-red-600 border-red-200' },
  ]

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
      <div className="mb-6 rounded-xl border border-stone-200 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-center gap-4 text-sm mb-4">
          <div className="flex items-center gap-2">
            <span className="text-stone-500">Game:</span>
            <span className="font-semibold text-stone-900">{tournament.game?.name ?? '-'}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-stone-500">Format:</span>
            <span className="font-semibold text-stone-900">{tournament.format?.replace(/_/g, ' ')}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-stone-500">BO:</span>
            <span className="font-semibold text-stone-900">{tournament.best_of}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-stone-500">Tim:</span>
            <span className="font-semibold text-stone-900">
              {registeredTeams.length}
              {tournament.max_teams ? ` / ${tournament.max_teams}` : ''}
            </span>
          </div>
        </div>

        {/* Status Flow */}
        <div>
          <span className="text-xs font-semibold uppercase tracking-wider text-stone-400 mb-2 block">Status Turnamen</span>
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
                      ? `${s.color} ring-2 ring-offset-1 ring-porjar-red/40`
                      : 'border-stone-200 text-stone-400 hover:text-stone-700 hover:border-stone-400 hover:bg-stone-50'
                  } ${updatingStatus ? 'opacity-50 cursor-not-allowed' : isActive ? 'cursor-default' : 'cursor-pointer'}`}
                >
                  {s.label}
                </button>
              )
            })}
          </div>
        </div>
      </div>

      {/* Registered Teams */}
      <div className="mb-8">
        <h2 className="mb-3 flex items-center gap-2 text-lg font-bold text-stone-900">
          <Users size={20} weight="duotone" />
          Tim Terdaftar
          <span className="rounded-full bg-stone-100 px-2.5 py-0.5 text-xs font-medium text-stone-600">
            {registeredTeams.length}
          </span>
        </h2>

        {registeredTeams.length === 0 ? (
          <div className="rounded-xl border border-dashed border-stone-300 bg-stone-50 p-8 text-center">
            <Users size={32} className="mx-auto mb-2 text-stone-400" />
            <p className="text-sm text-stone-500">Belum ada tim yang terdaftar</p>
          </div>
        ) : (
          <div className="rounded-xl border border-stone-200 bg-white shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-stone-200 hover:bg-transparent bg-stone-50">
                    <TableHead className="text-stone-600 uppercase text-xs tracking-wider">Nama Tim</TableHead>
                    <TableHead className="text-stone-600 uppercase text-xs tracking-wider">Sekolah</TableHead>
                    <TableHead className="text-center text-stone-600 uppercase text-xs tracking-wider">Anggota</TableHead>
                    <TableHead className="text-stone-600 uppercase text-xs tracking-wider">Status</TableHead>
                    <TableHead className="text-right text-stone-600 uppercase text-xs tracking-wider">Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {registeredTeams.map((team) => (
                    <TableRow key={team.id} className="border-stone-100 hover:bg-red-50/50">
                      <TableCell>
                        <span className="font-medium text-stone-900">{team.name}</span>
                      </TableCell>
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
                        <Button
                          size="xs"
                          variant="outline"
                          className="border-red-200 text-red-500 hover:bg-red-50"
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
          <h2 className="flex items-center gap-2 text-lg font-bold text-stone-900">
            <Plus size={20} weight="duotone" />
            Tambah Tim
            <span className="rounded-full bg-stone-100 px-2.5 py-0.5 text-xs font-medium text-stone-600">
              {availableTeams.length}
            </span>
          </h2>
          {availableTeams.length > 0 && (
            <Button
              onClick={handleAddAll}
              disabled={addingAll}
              className="bg-porjar-red hover:bg-porjar-red-dark text-white"
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
            className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400"
          />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari tim atau sekolah..."
            className="bg-white border-stone-300 pl-9 focus:border-porjar-red"
          />
        </div>

        {availableTeams.length === 0 ? (
          <div className="rounded-xl border border-dashed border-stone-300 bg-stone-50 p-8 text-center">
            <Trophy size={32} className="mx-auto mb-2 text-stone-400" />
            <p className="text-sm text-stone-500">
              {search
                ? 'Tidak ada tim yang cocok dengan pencarian'
                : 'Semua tim yang memenuhi syarat sudah terdaftar'}
            </p>
          </div>
        ) : (
          <div className="rounded-xl border border-stone-200 bg-white shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-stone-200 hover:bg-transparent bg-stone-50">
                    <TableHead className="text-stone-600 uppercase text-xs tracking-wider">Nama Tim</TableHead>
                    <TableHead className="text-stone-600 uppercase text-xs tracking-wider">Sekolah</TableHead>
                    <TableHead className="text-center text-stone-600 uppercase text-xs tracking-wider">Anggota</TableHead>
                    <TableHead className="text-right text-stone-600 uppercase text-xs tracking-wider">Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {availableTeams.map((team) => (
                    <TableRow key={team.id} className="border-stone-100 hover:bg-green-50/50">
                      <TableCell>
                        <span className="font-medium text-stone-900">{team.name}</span>
                      </TableCell>
                      <TableCell className="text-stone-500 text-sm">
                        {team.school?.name ?? '-'}
                      </TableCell>
                      <TableCell className="text-center text-stone-500 tabular-nums">
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
    </AdminLayout>
  )
}
