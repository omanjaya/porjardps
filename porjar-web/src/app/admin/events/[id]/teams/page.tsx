'use client'

import { useEffect, useState, useCallback, useMemo } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { toast } from 'sonner'
import { api, ApiError } from '@/lib/api'
import { useAuthStore } from '@/store/auth-store'
import { PageHeader } from '@/components/shared/PageHeader'
import { EmptyState } from '@/components/shared/EmptyState'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { MagnifyingGlass, UsersThree, Trophy, Plus, Spinner } from '@phosphor-icons/react'
import type { Event, Tournament, Team } from '@/types'

interface AdminAddTeamsResponse {
  added: number
  skipped: number
  errors: string[]
}

export default function EventAssignTeamsPage() {
  const { isAuthenticated, isLoading: authLoading } = useAuthStore()
  const params = useParams<{ id: string }>()

  const [event, setEvent] = useState<Event | null>(null)
  const [tournaments, setTournaments] = useState<Tournament[]>([])
  const [loading, setLoading] = useState(true)

  const [selectedTournamentId, setSelectedTournamentId] = useState<string>('')
  const [registeredTeams, setRegisteredTeams] = useState<Team[]>([])
  const [loadingRegistered, setLoadingRegistered] = useState(false)

  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [pool, setPool] = useState<Team[]>([])
  const [loadingPool, setLoadingPool] = useState(false)

  const [selectedTeamIds, setSelectedTeamIds] = useState<Set<string>>(new Set())
  const [assigning, setAssigning] = useState(false)

  const selectedTournament = useMemo(
    () => tournaments.find((t) => t.id === selectedTournamentId) ?? null,
    [tournaments, selectedTournamentId]
  )

  // ── Load event + tournaments ─────────────────────────────────────────────

  const loadData = useCallback(async () => {
    if (!isAuthenticated || authLoading) return
    try {
      const [eventData, tournamentsRes] = await Promise.all([
        api.get<Event>(`/admin/events/${params.id}`),
        api.getPaginated<Tournament[]>(`/admin/tournaments?event_id=${params.id}&per_page=100`),
      ])
      setEvent(eventData ?? null)
      const list = Array.isArray(tournamentsRes.data) ? tournamentsRes.data : []
      setTournaments(list)
      if (list.length > 0) {
        setSelectedTournamentId((prev) => prev || list[0].id)
      }
    } catch {
      toast.error('Gagal memuat data event')
    } finally {
      setLoading(false)
    }
  }, [params.id, isAuthenticated, authLoading])

  useEffect(() => {
    loadData()
  }, [loadData])

  // ── Load registered teams for the selected tournament (exclude-set) ─────

  const loadRegisteredTeams = useCallback(async () => {
    if (!selectedTournamentId) {
      setRegisteredTeams([])
      return
    }
    setLoadingRegistered(true)
    try {
      const teams = await api.get<Team[]>(`/tournaments/${selectedTournamentId}/teams`)
      setRegisteredTeams(teams ?? [])
    } catch {
      toast.error('Gagal memuat tim yang sudah terdaftar')
    } finally {
      setLoadingRegistered(false)
    }
  }, [selectedTournamentId])

  useEffect(() => {
    loadRegisteredTeams()
    setSelectedTeamIds(new Set())
  }, [loadRegisteredTeams])

  const registeredTeamIds = useMemo(
    () => new Set(registeredTeams.map((t) => t.id)),
    [registeredTeams]
  )

  // ── Debounce search input ─────────────────────────────────────────────────

  useEffect(() => {
    const handle = setTimeout(() => setDebouncedSearch(search.trim()), 350)
    return () => clearTimeout(handle)
  }, [search])

  // ── Load team pool (search across all teams, not just this event) ───────

  const loadPool = useCallback(async () => {
    if (!isAuthenticated || authLoading) return
    setLoadingPool(true)
    try {
      const query = debouncedSearch
        ? `/teams?per_page=100&search=${encodeURIComponent(debouncedSearch)}`
        : '/teams?per_page=100'
      const res = await api.getPaginated<Team[]>(query)
      setPool(Array.isArray(res.data) ? res.data : [])
    } catch {
      toast.error('Gagal memuat daftar tim')
    } finally {
      setLoadingPool(false)
    }
  }, [debouncedSearch, isAuthenticated, authLoading])

  useEffect(() => {
    loadPool()
  }, [loadPool])

  // ── Filter pool: matching game, not already in tournament, matching level ─

  const availableTeams = useMemo(() => {
    if (!selectedTournament) return []
    return pool.filter((t) => {
      if (t.game?.slug !== selectedTournament.game?.slug && t.game?.id !== selectedTournament.game?.id) return false
      if (registeredTeamIds.has(t.id)) return false
      if (selectedTournament.school_level && t.school?.level !== selectedTournament.school_level) return false
      return true
    })
  }, [pool, selectedTournament, registeredTeamIds])

  function toggleTeam(teamId: string) {
    setSelectedTeamIds((prev) => {
      const next = new Set(prev)
      if (next.has(teamId)) {
        next.delete(teamId)
      } else {
        next.add(teamId)
      }
      return next
    })
  }

  function toggleAll() {
    setSelectedTeamIds((prev) => {
      if (prev.size === availableTeams.length && availableTeams.length > 0) return new Set()
      return new Set(availableTeams.map((t) => t.id))
    })
  }

  // ── Assign selected teams to the selected tournament ──────────────────────

  async function handleAssign() {
    if (!selectedTournamentId || selectedTeamIds.size === 0) return
    setAssigning(true)
    try {
      const result = await api.post<AdminAddTeamsResponse>(
        `/admin/tournaments/${selectedTournamentId}/teams`,
        { team_ids: Array.from(selectedTeamIds) }
      )
      const msg = `${result.added} tim berhasil di-assign`
      if (result.errors && result.errors.length > 0) {
        toast.warning(`${msg}, ${result.errors.length} error`)
      } else {
        toast.success(msg)
      }
      setSelectedTeamIds(new Set())
      await loadRegisteredTeams()
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Gagal meng-assign tim')
    } finally {
      setAssigning(false)
    }
  }

  if (loading) {
    return (
      <>
        <Skeleton className="h-10 w-64 bg-stone-200 dark:bg-zinc-800" />
        <Skeleton className="mt-4 h-96 w-full bg-stone-200 dark:bg-zinc-800" />
      </>
    )
  }

  if (!event) {
    return <EmptyState icon={Trophy} title="Event Tidak Ditemukan" description="Event tidak ada atau sudah dihapus." />
  }

  return (
    <>
      <PageHeader
        title="Assign Tim ke Turnamen"
        description={`Cari tim yang belum terdaftar di ${event.name} dan tambahkan ke turnamen`}
        breadcrumbs={[
          { label: 'Events', href: '/admin/events' },
          { label: event.name, href: `/admin/events/${params.id}` },
          { label: 'Assign Tim' },
        ]}
      />

      {/* Tournament picker */}
      <div className="mb-6 rounded-xl border border-stone-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 p-5 shadow-sm">
        <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-stone-400 dark:text-zinc-500">
          Pilih Turnamen
        </label>
        {tournaments.length === 0 ? (
          <div className="flex flex-wrap items-center gap-3">
            <p className="text-sm text-stone-500 dark:text-zinc-400">
              Event ini belum memiliki turnamen.
            </p>
            <Link href={`/admin/tournaments?event_id=${params.id}&new=1`}>
              <Button size="sm" className="bg-esi-red hover:bg-esi-red-dark text-white">
                <Plus size={14} className="mr-1.5" />
                Buat Turnamen
              </Button>
            </Link>
          </div>
        ) : (
          <Select value={selectedTournamentId} onValueChange={(v) => setSelectedTournamentId(v ?? '')}>
            <SelectTrigger className="w-full bg-white dark:bg-zinc-900 border-stone-300 dark:border-zinc-600 text-stone-900 dark:text-zinc-100 sm:w-96">
              <SelectValue placeholder="Pilih turnamen..." />
            </SelectTrigger>
            <SelectContent>
              {tournaments.map((t) => (
                <SelectItem key={t.id} value={t.id}>
                  {t.name} ({t.game?.name ?? '-'})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        {selectedTournament && (
          <div className="mt-4 flex flex-wrap items-center gap-2 sm:gap-4 text-sm">
            <div className="flex items-center gap-2">
              <span className="text-stone-500 dark:text-zinc-400">Game:</span>
              <span className="font-semibold text-stone-900 dark:text-zinc-100">{selectedTournament.game?.name ?? '-'}</span>
            </div>
            {selectedTournament.school_level && (
              <div className="flex items-center gap-2">
                <span className="text-stone-500 dark:text-zinc-400">Tingkat:</span>
                <span className="font-semibold text-stone-900 dark:text-zinc-100">{selectedTournament.school_level}</span>
              </div>
            )}
            <div className="flex items-center gap-2">
              <span className="text-stone-500 dark:text-zinc-400">Tim Terdaftar:</span>
              <span className="font-semibold text-stone-900 dark:text-zinc-100">
                {loadingRegistered ? '...' : registeredTeams.length}
                {selectedTournament.max_teams ? ` / ${selectedTournament.max_teams}` : ''}
              </span>
            </div>
          </div>
        )}
      </div>

      {selectedTournament && (
        <div>
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <h2 className="flex items-center gap-2 text-lg font-bold text-stone-900 dark:text-zinc-100">
              <UsersThree size={20} weight="duotone" />
              Tim Tersedia
              <span className="rounded-full bg-stone-100 dark:bg-zinc-800 px-2.5 py-0.5 text-xs font-medium text-stone-600 dark:text-zinc-400">
                {availableTeams.length}
              </span>
            </h2>
            <Button
              onClick={handleAssign}
              disabled={assigning || selectedTeamIds.size === 0}
              className="bg-esi-red hover:bg-esi-red-dark text-white"
            >
              {assigning ? (
                <Spinner size={14} className="mr-1.5 animate-spin" />
              ) : (
                <Plus size={14} className="mr-1.5" />
              )}
              {assigning ? 'Meng-assign...' : `Assign (${selectedTeamIds.size})`}
            </Button>
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
              placeholder="Cari nama tim..."
              className="bg-white dark:bg-zinc-900 border-stone-300 dark:border-zinc-600 pl-9 focus:border-esi-red"
            />
          </div>

          {loadingPool ? (
            <Skeleton className="h-64 w-full bg-stone-200 dark:bg-zinc-800" />
          ) : availableTeams.length === 0 ? (
            <div className="rounded-xl border border-dashed border-stone-300 dark:border-zinc-600 bg-stone-50 dark:bg-zinc-800/50 p-8 text-center">
              <Trophy size={32} className="mx-auto mb-2 text-stone-400 dark:text-zinc-500" />
              <p className="text-sm text-stone-500 dark:text-zinc-400">
                {search
                  ? 'Tidak ada tim yang cocok dengan pencarian'
                  : 'Tidak ada tim yang memenuhi syarat untuk turnamen ini'}
              </p>
            </div>
          ) : (
            <div className="rounded-xl border border-stone-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="border-stone-200 dark:border-zinc-700 hover:bg-transparent bg-stone-50 dark:bg-zinc-800/50">
                      <TableHead className="w-10 pl-4">
                        <input
                          type="checkbox"
                          checked={selectedTeamIds.size === availableTeams.length && availableTeams.length > 0}
                          onChange={toggleAll}
                          className="h-4 w-4 cursor-pointer rounded border-stone-300 dark:border-zinc-600 accent-esi-red"
                          aria-label="Pilih semua tim"
                        />
                      </TableHead>
                      <TableHead className="text-stone-600 dark:text-zinc-400 uppercase text-xs tracking-wider">Nama Tim</TableHead>
                      <TableHead className="text-stone-600 dark:text-zinc-400 uppercase text-xs tracking-wider">Sekolah</TableHead>
                      <TableHead className="text-center text-stone-600 dark:text-zinc-400 uppercase text-xs tracking-wider">Anggota</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {availableTeams.map((team) => (
                      <TableRow
                        key={team.id}
                        className="border-stone-100 dark:border-zinc-700 hover:bg-green-50 dark:hover:bg-green-950/30 cursor-pointer"
                        onClick={() => toggleTeam(team.id)}
                      >
                        <TableCell className="pl-4" onClick={(e) => e.stopPropagation()}>
                          <input
                            type="checkbox"
                            checked={selectedTeamIds.has(team.id)}
                            onChange={() => toggleTeam(team.id)}
                            className="h-4 w-4 cursor-pointer rounded border-stone-300 dark:border-zinc-600 accent-esi-red"
                            aria-label={`Pilih ${team.name}`}
                          />
                        </TableCell>
                        <TableCell>
                          <span className="font-medium text-stone-900 dark:text-zinc-100">{team.name}</span>
                        </TableCell>
                        <TableCell className="text-stone-500 dark:text-zinc-400 text-sm">
                          {team.school?.name ?? '-'}
                        </TableCell>
                        <TableCell className="text-center text-stone-500 dark:text-zinc-400 tabular-nums">
                          {team.member_count}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}
        </div>
      )}
    </>
  )
}
