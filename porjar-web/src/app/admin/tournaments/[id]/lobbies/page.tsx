'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams } from 'next/navigation'
import { toast } from 'sonner'
import { api } from '@/lib/api'
import { useAuthStore } from '@/store/auth-store'
import { PageHeader } from '@/components/shared/PageHeader'
import { BRResultInput, type TeamResult } from '@/components/modules/admin/BRResultInput'
import { BRGridInput } from '@/components/modules/admin/BRGridInput'
import { BRLeaderboard } from '@/components/modules/battle-royale/BRLeaderboard'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Plus,
  PencilSimple,
  ChartBar,
  ArrowsClockwise,
  Table as TableIcon,
  ListBullets,
  ArrowsLeftRight,
} from '@phosphor-icons/react'
import { cn } from '@/lib/utils'
import { useWebSocket } from '@/hooks/useWebSocket'
import type { Tournament, BRLobby, BRLobbyResult, TeamSummary, Standing } from '@/types'

import { LobbyCard } from './LobbyCard'
import { CreateLobbyDialog } from './CreateLobbyDialog'
import { EditLobbyDialog } from './EditLobbyDialog'
import { GeneratePotsDialog } from './GeneratePotsDialog'
import { PointRulesDialog } from './PointRulesDialog'
import { SwapLobbyTeamsDialog } from './SwapLobbyTeamsDialog'

type DayFilter = 'all' | number

export default function AdminLobbiesPage() {
  const { isAuthenticated, isLoading: authLoading } = useAuthStore()
  const params = useParams<{ id: string }>()
  const [tournament, setTournament] = useState<Tournament | null>(null)
  const [lobbies, setLobbies] = useState<BRLobby[]>([])
  const [teams, setTeams] = useState<TeamSummary[]>([])
  const [standings, setStandings] = useState<Standing[]>([])
  const [pointRules, setPointRules] = useState<{ placement: number; points: number }[]>([])
  const [lobbyTeams, setLobbyTeams] = useState<Record<string, { id: string; name: string }[]>>({})
  const [expandedLobby, setExpandedLobby] = useState<string | null>(null)
  const [selectedLobby, setSelectedLobby] = useState<BRLobby | null>(null)
  const [createOpen, setCreateOpen] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState<BRLobby | null>(null)
  const [showStandings, setShowStandings] = useState(false)
  const [loading, setLoading] = useState(true)
  const [dayFilter, setDayFilter] = useState<DayFilter>('all')

  // Input mode: 'grid' (default) or 'form' (legacy BRResultInput)
  const [inputMode, setInputMode] = useState<'grid' | 'form'>('grid')
  const [selectedMapNumber, setSelectedMapNumber] = useState(1)

  // Generate POT dialog
  const [generateOpen, setGenerateOpen] = useState(false)

  // Point rules editor
  const [rulesDialogOpen, setRulesDialogOpen] = useState(false)

  // Swap dialog
  const [swapOpen, setSwapOpen] = useState(false)

  // Edit lobby dialog
  const [editLobby, setEditLobby] = useState<BRLobby | null>(null)


  const loadData = useCallback(async () => {
    if (!isAuthenticated || authLoading) return
    try {
      const [t, l, tm, st, pr] = await Promise.all([
        api.get<Tournament>(`/tournaments/${params.id}`),
        api.get<BRLobby[]>(`/tournaments/${params.id}/lobbies`),
        api.get<TeamSummary[]>(`/tournaments/${params.id}/teams`),
        api.get<Standing[]>(`/tournaments/${params.id}/standings`).catch(() => []),
        api.get<{ placement: number; points: number }[]>(`/tournaments/${params.id}/point-rules`).catch(() => []),
      ])
      setTournament(t)
      const lobbyList = l ?? []
      setLobbies(lobbyList)
      setTeams(tm ?? [])
      setStandings(st ?? [])
      setPointRules(pr ?? [])

      // Fetch teams per lobby
      const teamsMap: Record<string, { id: string; name: string }[]> = {}
      await Promise.all(
        lobbyList.map(async (lobby) => {
          try {
            const lt = await api.get<{ id: string; name: string }[]>(`/lobbies/${lobby.id}/teams`)
            teamsMap[lobby.id] = lt ?? []
          } catch {
            teamsMap[lobby.id] = []
          }
        })
      )
      setLobbyTeams(teamsMap)
    } catch {
      toast.error('Gagal memuat data')
    } finally {
      setLoading(false)
    }
  }, [params.id, isAuthenticated, authLoading])

  useEffect(() => {
    loadData()
  }, [loadData])

  useWebSocket({
    channels: [`tournament:${params.id}`],
    messageTypes: ['lobby_update', 'br_result_update', 'standings_update'],
    onMessage: () => { loadData() },
  })

  // Get unique days
  const days = Array.from(new Set(lobbies.map((l) => l.day_number))).sort((a, b) => a - b)

  // Filter lobbies by day
  const filteredLobbies =
    dayFilter === 'all' ? lobbies : lobbies.filter((l) => l.day_number === dayFilter)

  async function handleCreateLobby(data: {
    lobby_name: string
    day_number: number
    lobby_number: number
    num_maps: number
    map_names: string[]
    room_id: string
    room_password: string
    scheduled_at: string
    selected_teams: string[]
  }) {
    try {
      await api.post(`/admin/lobbies`, {
        tournament_id: params.id,
        lobby_name: data.lobby_name,
        day_number: data.day_number,
        lobby_number: data.lobby_number,
        num_maps: data.num_maps,
        map_names: data.map_names,
        room_id: data.room_id || null,
        room_password: data.room_password || null,
        scheduled_at: data.scheduled_at || null,
      })
      toast.success('POT berhasil dibuat')
      setCreateOpen(false)
      await loadData()
    } catch {
      toast.error('Gagal membuat POT')
    }
  }

  async function handleEditLobby(lobbyId: string, data: {
    lobby_name: string
    num_maps: number
    map_names: string[]
    scheduled_at: string
  }) {
    try {
      await api.put(`/admin/lobbies/${lobbyId}`, {
        lobby_name: data.lobby_name,
        num_maps: data.num_maps,
        map_names: data.map_names,
        scheduled_at: data.scheduled_at || null,
      })
      toast.success('POT berhasil diperbarui')
      setEditLobby(null)
      await loadData()
    } catch {
      toast.error('Gagal memperbarui POT')
    }
  }

  async function handleSetLive(lobby: BRLobby) {
    try {
      await api.put(`/admin/lobbies/${lobby.id}/status`, { status: 'live' })
      toast.success(`${lobby.lobby_name} sekarang LIVE`)
      await loadData()
    } catch {
      toast.error('Gagal mengubah status')
    }
  }

  async function handleComplete(lobby: BRLobby) {
    try {
      await api.put(`/admin/lobbies/${lobby.id}/status`, { status: 'completed' })
      toast.success(`${lobby.lobby_name} selesai`)
      await loadData()
    } catch {
      toast.error('Gagal mengubah status')
    }
  }

  async function handleDeleteLobby() {
    if (!deleteConfirm) return
    try {
      await api.delete(`/admin/lobbies/${deleteConfirm.id}`)
      toast.success('POT berhasil dihapus')
      setDeleteConfirm(null)
      await loadData()
    } catch {
      toast.error('Gagal menghapus POT')
    }
  }

  async function handleResultSubmit(results: TeamResult[]) {
    if (!selectedLobby) return
    try {
      const mappedResults = results.map(r => ({
        team_id: r.team_id,
        placement: r.placement,
        kills: r.kills,
        damage_dealt: r.damage || 0,
        penalty_points: r.penalty || 0,
        penalty_reason: r.penalty_reason || '',
        survival_bonus: 0,
        status: r.status || 'normal',
      }))
      await api.post(`/admin/lobbies/${selectedLobby.id}/results`, {
        results: mappedResults,
        map_number: selectedMapNumber,
      })
      toast.success('Hasil POT berhasil disimpan')
      setSelectedLobby(null)
      await loadData()
    } catch {
      toast.error('Gagal menyimpan hasil')
    }
  }

  async function handleGridSave(
    results: { team_id: string; placement: number; kills: number; is_wwcd: boolean }[],
    mapNumber?: number
  ) {
    if (!selectedLobby) return
    const payload = results.map((r) => ({
      team_id: r.team_id,
      placement: r.placement,
      kills: r.kills,
      status: 'normal',
      penalty_points: 0,
      penalty_reason: null as string | null,
      damage_dealt: 0,
      survival_bonus: 0,
    }))
    await api.post(`/admin/lobbies/${selectedLobby.id}/results`, {
      map_number: mapNumber ?? selectedMapNumber,
      results: payload,
    })
    const numMaps = selectedLobby.num_maps ?? 1
    if ((mapNumber ?? selectedMapNumber) < numMaps) {
      // More maps to input — advance to next map
      toast.success(`Map ${mapNumber ?? selectedMapNumber} berhasil disimpan`)
      setSelectedMapNumber((mapNumber ?? selectedMapNumber) + 1)
    } else {
      toast.success('Semua map berhasil disimpan')
      setSelectedLobby(null)
      setSelectedMapNumber(1)
    }
    await loadData()
  }

  async function handleSavePots(pots: { name: string; teams: TeamSummary[] }[], day: number) {
    try {
      // 1. Create POT lobbies
      for (let i = 0; i < pots.length; i++) {
        await api.post('/admin/lobbies', {
          tournament_id: params.id,
          lobby_name: `POT ${i + 1} - Day ${day}`,
          day_number: day,
          lobby_number: (lobbies.length ?? 0) + i + 1,
        })
      }

      // 2. Get fresh lobby IDs
      const freshLobbies = await api.get<BRLobby[]>(`/tournaments/${params.id}/lobbies`)
      const dayLobbies = (freshLobbies ?? [])
        .filter((l) => l.day_number === day)
        .sort((a, b) => a.lobby_number - b.lobby_number)
        .slice(-pots.length)

      // 3. Assign teams to each POT
      for (let i = 0; i < dayLobbies.length && i < pots.length; i++) {
        const teamIds = pots[i].teams.map((t) => t.id)
        if (teamIds.length > 0) {
          await api.post(`/admin/lobbies/${dayLobbies[i].id}/assign-teams`, {
            team_ids: teamIds,
          })
        }
      }

      toast.success(`${pots.length} POT berhasil disimpan!`)
      setGenerateOpen(false)
      await loadData()
    } catch {
      toast.error('Gagal menyimpan POT')
    }
  }

  async function handleSaveRules(data: {
    kill_point_value: number
    wwcd_bonus: number
    rules: { placement: number; points: number }[]
  }) {
    try {
      await api.put(`/admin/tournaments/${params.id}/point-rules`, data)
      toast.success('Point rules berhasil disimpan')
      setRulesDialogOpen(false)
      await loadData()
    } catch {
      toast.error('Gagal menyimpan point rules')
    }
  }

  if (loading) {
    return (
      <>
        <Skeleton className="h-10 w-64 bg-stone-200" />
        <Skeleton className="mt-4 h-96 w-full bg-stone-200" />
      </>
    )
  }

  return (
    <>
      <PageHeader
        title="Kelola POT"
        description={tournament?.name}
        breadcrumbs={[
          { label: 'Turnamen', href: '/admin/tournaments' },
          { label: tournament?.name ?? '', href: `/admin/tournaments/${params.id}` },
          { label: 'POT' },
        ]}
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={() => setRulesDialogOpen(true)}
              className="border-stone-300 dark:border-zinc-600 text-stone-600 dark:text-zinc-400"
            >
              <PencilSimple size={16} className="mr-1" />
              Point Rules
            </Button>
            <Button
              variant="outline"
              onClick={() => setSwapOpen(true)}
              disabled={lobbies.filter((l) => l.status === 'pending' || l.status === 'scheduled').length < 2}
              className="border-stone-300 dark:border-zinc-600 text-stone-600 dark:text-zinc-400"
            >
              <ArrowsLeftRight size={16} className="mr-1" />
              Tukar Tim
            </Button>
            <Button
              variant="outline"
              onClick={() => setShowStandings(!showStandings)}
              className="border-stone-300 dark:border-zinc-600 text-stone-600 dark:text-zinc-400"
            >
              <ChartBar size={16} className="mr-1" />
              {showStandings ? 'Daftar POT' : 'Standings'}
            </Button>
            <Button onClick={() => setGenerateOpen(true)} className="bg-esi-red hover:bg-esi-red-dark text-white">
              <ArrowsClockwise size={16} className="mr-1" />
              Acak POT
            </Button>
            <Button variant="outline" onClick={() => setCreateOpen(true)} className="border-stone-300 dark:border-zinc-600 text-stone-600 dark:text-zinc-400">
              <Plus size={16} className="mr-1" />
              Buat Manual
            </Button>
          </div>
        }
      />

      {/* Day filter tabs */}
      <div className="mb-4 flex items-center gap-1 rounded-lg bg-stone-100 dark:bg-zinc-800 p-1 w-fit">
        <button
          onClick={() => setDayFilter('all')}
          className={cn(
            'rounded-md px-3 py-1.5 text-xs font-medium transition-colors',
            dayFilter === 'all'
              ? 'bg-esi-red text-white'
              : 'text-stone-500 dark:text-zinc-400 hover:text-stone-900 dark:hover:text-zinc-100 dark:text-zinc-100'
          )}
        >
          Semua
        </button>
        {days.map((day) => (
          <button
            key={day}
            onClick={() => setDayFilter(day)}
            className={cn(
              'rounded-md px-3 py-1.5 text-xs font-medium transition-colors',
              dayFilter === day
                ? 'bg-esi-red text-white'
                : 'text-stone-500 dark:text-zinc-400 hover:text-stone-900 dark:hover:text-zinc-100 dark:text-zinc-100'
            )}
          >
            Day {day}
          </button>
        ))}
      </div>

      {showStandings ? (
        <BRLeaderboard standings={standings} lobbies={lobbies} tournamentId={params.id} />
      ) : (
        <div className="space-y-3">
          {filteredLobbies.length === 0 ? (
            <div className="py-16 text-center text-stone-400 dark:text-zinc-500">
              Belum ada POT. Klik &quot;Buat POT&quot; untuk memulai.
            </div>
          ) : (
            filteredLobbies
              .sort((a, b) => a.lobby_number - b.lobby_number)
              .map((lobby) => (
                <LobbyCard
                  key={lobby.id}
                  lobby={lobby}
                  lobbyTeams={lobbyTeams[lobby.id] ?? []}
                  onSetLive={handleSetLive}
                  onComplete={handleComplete}
                  onInputResults={setSelectedLobby}
                  onEdit={setEditLobby}
                  onDelete={setDeleteConfirm}
                  expandedLobby={expandedLobby}
                  setExpandedLobby={setExpandedLobby}
                />
              ))
          )}
        </div>
      )}

      {/* Create lobby dialog */}
      <CreateLobbyDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        teams={teams}
        defaultLobbyNumber={lobbies.length + 1}
        defaultNumMaps={tournament?.default_num_maps ?? 1}
        defaultMapNames={tournament?.default_map_names ?? []}
        onCreate={handleCreateLobby}
      />

      {/* Edit lobby dialog */}
      <EditLobbyDialog
        open={!!editLobby}
        onOpenChange={(open) => !open && setEditLobby(null)}
        lobby={editLobby}
        onSave={handleEditLobby}
      />

      {/* Delete confirmation dialog */}
      <Dialog open={!!deleteConfirm} onOpenChange={(open) => !open && setDeleteConfirm(null)}>
        <DialogContent className="bg-white dark:bg-zinc-900 border-stone-200 dark:border-zinc-700 text-stone-900 dark:text-zinc-100">
          <DialogHeader>
            <DialogTitle className="text-stone-900 dark:text-zinc-100">Hapus POT</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-stone-500 dark:text-zinc-400">
            Yakin ingin menghapus <strong className="text-stone-900 dark:text-zinc-100">{deleteConfirm?.lobby_name}</strong>?
            Semua hasil POT akan ikut terhapus.
          </p>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteConfirm(null)}
              className="border-stone-300 dark:border-zinc-600 text-stone-600 dark:text-zinc-400"
            >
              Batal
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteLobby}
              className="bg-red-600 hover:bg-red-700"
            >
              Hapus
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Result input modal */}
      <Dialog open={!!selectedLobby} onOpenChange={(open) => { if (!open) { setSelectedLobby(null); setSelectedMapNumber(1) } }}>
        <DialogContent className="bg-white dark:bg-zinc-900 border-stone-200 dark:border-zinc-700 flex flex-col p-0 gap-0 max-h-[100dvh] w-full rounded-none sm:rounded-xl sm:max-w-2xl sm:max-h-[88vh]">
          {/* Sticky header */}
          <DialogHeader className="px-6 pt-5 pb-4 border-b border-stone-100 dark:border-zinc-700">
            <DialogTitle className="text-stone-900 dark:text-zinc-100">{selectedLobby?.lobby_name}</DialogTitle>
            <DialogDescription className="text-stone-500 dark:text-zinc-400">
              Input hasil pertandingan POT
            </DialogDescription>
          </DialogHeader>

          {selectedLobby && (
            <div className="flex flex-col flex-1 min-h-0">
              {/* Map tabs (only shown when num_maps > 1) + Mode toggle */}
              <div className="px-6 pt-4 pb-3 flex items-center gap-3 flex-wrap">
                {/* Map selector tabs */}
                {(selectedLobby.num_maps ?? 1) > 1 && (
                  <div className="flex items-center gap-1 rounded-lg bg-stone-100 dark:bg-zinc-800 p-1">
                    {Array.from({ length: selectedLobby.num_maps ?? 1 }, (_, i) => i + 1).map((m) => (
                      <button
                        key={m}
                        onClick={() => setSelectedMapNumber(m)}
                        className={cn(
                          'rounded-md px-3 py-1.5 text-xs font-medium transition-colors',
                          selectedMapNumber === m
                            ? 'bg-esi-red text-white'
                            : 'text-stone-500 dark:text-zinc-400 hover:text-stone-900 dark:hover:text-zinc-100'
                        )}
                      >
                        {selectedLobby.map_names?.[m - 1] ? `Map ${m}: ${selectedLobby.map_names[m - 1]}` : `Map ${m}`}
                      </button>
                    ))}
                  </div>
                )}

                {/* Mode toggle */}
                <div className="flex items-center gap-1 rounded-lg bg-stone-100 dark:bg-zinc-800 p-1">
                  <button
                    onClick={() => setInputMode('grid')}
                    className={cn(
                      'flex items-center gap-1 rounded-md px-3 py-1.5 text-xs font-medium transition-colors',
                      inputMode === 'grid'
                        ? 'bg-esi-red text-white'
                        : 'text-stone-500 dark:text-zinc-400 hover:text-stone-900 dark:hover:text-zinc-100 dark:text-zinc-100'
                    )}
                  >
                    <TableIcon size={12} />
                    Grid
                  </button>
                  <button
                    onClick={() => setInputMode('form')}
                    className={cn(
                      'flex items-center gap-1 rounded-md px-3 py-1.5 text-xs font-medium transition-colors',
                      inputMode === 'form'
                        ? 'bg-esi-red text-white'
                        : 'text-stone-500 dark:text-zinc-400 hover:text-stone-900 dark:hover:text-zinc-100 dark:text-zinc-100'
                    )}
                  >
                    <ListBullets size={12} />
                    Form
                  </button>
                </div>
              </div>

              {/* Scrollable content */}
              <div className="flex-1 overflow-y-auto px-6 pb-6">
                {inputMode === 'grid' ? (
                  <BRGridInput
                    key={`${selectedLobby.id}-map${selectedMapNumber}`}
                    lobbyId={selectedLobby.id}
                    mapNumber={selectedMapNumber}
                    teams={teams.map((t) => ({ id: t.id, name: t.name }))}
                    pointRules={pointRules}
                    killPointValue={tournament?.kill_point_value ?? 1}
                    wwcdBonus={tournament?.wwcd_bonus ?? 0}
                    existingResults={(selectedLobby.results ?? [])
                      .filter((r: BRLobbyResult) => (r.map_number ?? 1) === selectedMapNumber)
                      .map((r: BRLobbyResult) => ({
                        team_id: r.team.id,
                        placement: r.placement,
                        kills: r.kills,
                        is_wwcd: r.placement === 1,
                      }))}
                    onSave={(results) => handleGridSave(results, selectedMapNumber)}
                  />
                ) : (
                  <BRResultInput
                    lobby={selectedLobby}
                    teams={teams}
                    onSubmit={handleResultSubmit}
                  />
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Generate POT Dialog */}
      <GeneratePotsDialog
        open={generateOpen}
        onOpenChange={setGenerateOpen}
        teams={teams}
        lobbiesCount={lobbies.length}
        onSave={handleSavePots}
      />

      {/* Point Rules Dialog */}
      <PointRulesDialog
        open={rulesDialogOpen}
        onOpenChange={setRulesDialogOpen}
        pointRules={pointRules}
        tournament={tournament}
        onSave={handleSaveRules}
      />

      {/* Swap Lobby Teams Dialog */}
      <SwapLobbyTeamsDialog
        open={swapOpen}
        onOpenChange={setSwapOpen}
        tournamentId={params.id}
        lobbies={lobbies}
        lobbyTeams={lobbyTeams}
        onSuccess={loadData}
      />
    </>
  )
}
