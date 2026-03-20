'use client'

import { useState, useEffect, useCallback } from 'react'
import { toast } from 'sonner'
import { api } from '@/lib/api'
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
  DialogFooter,
} from '@/components/ui/dialog'
import { Skeleton } from '@/components/ui/skeleton'
import { ArrowsClockwise, PencilSimple } from '@phosphor-icons/react'
import { cn } from '@/lib/utils'
import type {
  BRLobby,
  TeamSummary,
  RotationResult,
  LobbyAssignment,
} from '@/types'

interface LobbyRotationManagerProps {
  tournamentId: string
  dayNumber: number
}

const LOBBY_COLORS = [
  'bg-blue-500/20 text-blue-300 border-blue-500/30',
  'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
  'bg-amber-500/20 text-amber-300 border-amber-500/30',
  'bg-purple-500/20 text-purple-300 border-purple-500/30',
  'bg-rose-500/20 text-rose-300 border-rose-500/30',
  'bg-cyan-500/20 text-cyan-300 border-cyan-500/30',
  'bg-orange-500/20 text-orange-300 border-orange-500/30',
  'bg-pink-500/20 text-pink-300 border-pink-500/30',
]

function getLobbyColor(lobbyNumber: number): string {
  return LOBBY_COLORS[(lobbyNumber - 1) % LOBBY_COLORS.length]
}

export function LobbyRotationManager({
  tournamentId,
  dayNumber,
}: LobbyRotationManagerProps) {
  const [lobbies, setLobbies] = useState<BRLobby[]>([])
  const [teams, setTeams] = useState<TeamSummary[]>([])
  const [lobbyTeams, setLobbyTeams] = useState<Record<string, TeamSummary[]>>({})
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [generateOpen, setGenerateOpen] = useState(false)
  const [numLobbies, setNumLobbies] = useState(2)
  const [teamsPerLobby, setTeamsPerLobby] = useState(16)

  // Manual assign state
  const [editLobbyId, setEditLobbyId] = useState<string | null>(null)
  const [selectedTeamIds, setSelectedTeamIds] = useState<Set<string>>(new Set())
  const [saving, setSaving] = useState(false)

  // Rotation preview
  const [rotationPreview, setRotationPreview] = useState<LobbyAssignment[][] | null>(null)

  const loadData = useCallback(async () => {
    try {
      const [lobbiesData, teamsData] = await Promise.all([
        api.get<BRLobby[]>(`/tournaments/${tournamentId}/lobbies`),
        api.get<TeamSummary[]>(`/tournaments/${tournamentId}/teams`),
      ])

      const dayLobbies = (lobbiesData ?? []).filter((l) => l.day_number === dayNumber)
      setLobbies(dayLobbies)
      setTeams(teamsData ?? [])

      // Load teams for each lobby
      const teamsMap: Record<string, TeamSummary[]> = {}
      for (const lobby of dayLobbies) {
        try {
          const lt = await api.get<TeamSummary[]>(`/lobbies/${lobby.id}/teams`)
          teamsMap[lobby.id] = lt ?? []
        } catch (err) {
          console.error(`Gagal memuat tim lobby ${lobby.id}:`, err)
          teamsMap[lobby.id] = []
        }
      }
      setLobbyTeams(teamsMap)
    } catch {
      toast.error('Gagal memuat data rotasi')
    } finally {
      setLoading(false)
    }
  }, [tournamentId, dayNumber])

  useEffect(() => {
    loadData()
  }, [loadData])

  async function handleGenerateRotation() {
    setGenerating(true)
    try {
      const result = await api.post<RotationResult>(
        `/admin/tournaments/${tournamentId}/rotation`,
        { num_lobbies: numLobbies, teams_per_lobby: teamsPerLobby }
      )
      setRotationPreview(result.rounds)
      toast.success('Rotasi berhasil di-generate')
    } catch {
      toast.error('Gagal generate rotasi')
    } finally {
      setGenerating(false)
    }
  }

  function openEditLobby(lobbyId: string) {
    const currentTeams = lobbyTeams[lobbyId] ?? []
    setSelectedTeamIds(new Set(currentTeams.map((t) => t.id)))
    setEditLobbyId(lobbyId)
  }

  async function handleSaveAssignment() {
    if (!editLobbyId) return
    setSaving(true)
    try {
      await api.post(`/admin/lobbies/${editLobbyId}/assign-teams`, {
        team_ids: Array.from(selectedTeamIds),
      })
      toast.success('Tim berhasil di-assign')
      setEditLobbyId(null)
      await loadData()
    } catch {
      toast.error('Gagal menyimpan assignment')
    } finally {
      setSaving(false)
    }
  }

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

  // Build rotation matrix: team -> lobby assignments per day
  function getTeamLobbyMap(): Map<string, number[]> {
    const map = new Map<string, number[]>()
    for (const team of teams) {
      map.set(team.id, [])
    }
    for (const lobby of lobbies) {
      const lt = lobbyTeams[lobby.id] ?? []
      for (const t of lt) {
        const arr = map.get(t.id) ?? []
        arr.push(lobby.lobby_number)
        map.set(t.id, arr)
      }
    }
    return map
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-48 bg-slate-800" />
        <Skeleton className="h-64 w-full bg-slate-800" />
      </div>
    )
  }

  const teamLobbyMap = getTeamLobbyMap()

  return (
    <div className="space-y-6">
      {/* Header actions */}
      <div className="flex items-center gap-3">
        <Button onClick={() => setGenerateOpen(true)} variant="outline" className="border-slate-600 text-slate-300">
          <ArrowsClockwise size={16} className="mr-1.5" />
          Generate Rotasi Otomatis
        </Button>
      </div>

      {/* Rotation matrix */}
      {teams.length > 0 && lobbies.length > 0 && (
        <div className="rounded-lg border border-slate-700/50 bg-slate-800/80 overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-700/50">
            <h3 className="text-sm font-semibold text-slate-200">
              Matriks Rotasi &mdash; Hari {dayNumber}
            </h3>
          </div>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-slate-700/50 hover:bg-transparent">
                  <TableHead className="text-slate-400 sticky left-0 bg-slate-800/90 z-10">Tim</TableHead>
                  {lobbies
                    .sort((a, b) => a.lobby_number - b.lobby_number)
                    .map((lobby) => (
                      <TableHead key={lobby.id} className="text-center text-slate-400 min-w-[100px]">
                        <div className="flex items-center justify-center gap-1.5">
                          <span>{lobby.lobby_name}</span>
                          <button
                            onClick={() => openEditLobby(lobby.id)}
                            className="text-slate-500 hover:text-slate-300 transition-colors"
                          >
                            <PencilSimple size={12} />
                          </button>
                        </div>
                      </TableHead>
                    ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {teams.map((team) => {
                  const assignedLobbies = teamLobbyMap.get(team.id) ?? []
                  return (
                    <TableRow key={team.id} className="border-slate-700/30 hover:bg-slate-700/20">
                      <TableCell className="font-medium text-slate-200 sticky left-0 bg-slate-800/90 z-10">
                        {team.name}
                      </TableCell>
                      {lobbies
                        .sort((a, b) => a.lobby_number - b.lobby_number)
                        .map((lobby) => {
                          const isAssigned = assignedLobbies.includes(lobby.lobby_number)
                          return (
                            <TableCell key={lobby.id} className="text-center">
                              {isAssigned && (
                                <span
                                  className={cn(
                                    'inline-flex items-center justify-center rounded-md border px-2 py-0.5 text-xs font-bold',
                                    getLobbyColor(lobby.lobby_number)
                                  )}
                                >
                                  L{lobby.lobby_number}
                                </span>
                              )}
                            </TableCell>
                          )
                        })}
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </div>
        </div>
      )}

      {/* Lobby team counts */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {lobbies
          .sort((a, b) => a.lobby_number - b.lobby_number)
          .map((lobby) => {
            const lt = lobbyTeams[lobby.id] ?? []
            return (
              <div
                key={lobby.id}
                className={cn(
                  'rounded-lg border p-3 cursor-pointer transition-colors hover:bg-slate-700/30',
                  getLobbyColor(lobby.lobby_number)
                )}
                onClick={() => openEditLobby(lobby.id)}
              >
                <p className="text-sm font-semibold">{lobby.lobby_name}</p>
                <p className="mt-1 text-xs opacity-70">{lt.length} tim</p>
              </div>
            )
          })}
      </div>

      {/* Rotation preview from generated result */}
      {rotationPreview && rotationPreview.length > 0 && (
        <div className="rounded-lg border border-slate-700/50 bg-slate-800/80 p-4">
          <h3 className="mb-3 text-sm font-semibold text-slate-200">Preview Rotasi</h3>
          <div className="space-y-3">
            {rotationPreview.map((round, idx) => (
              <div key={idx}>
                <p className="mb-1 text-xs font-medium text-slate-400">Round {idx + 1}</p>
                <div className="flex flex-wrap gap-1.5">
                  {round.map((assignment, i) => {
                    const team = teams.find((t) => t.id === assignment.team_id)
                    return (
                      <span
                        key={i}
                        className={cn(
                          'inline-flex items-center rounded-md border px-2 py-0.5 text-xs',
                          getLobbyColor(assignment.lobby_number)
                        )}
                      >
                        {team?.name ?? assignment.team_id.slice(0, 8)} &rarr; L{assignment.lobby_number}
                      </span>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Generate rotation dialog */}
      <Dialog open={generateOpen} onOpenChange={setGenerateOpen}>
        <DialogContent className="bg-slate-800 border-slate-700 text-slate-200">
          <DialogHeader>
            <DialogTitle className="text-slate-50">Generate Rotasi Otomatis</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-400">Jumlah Lobby</label>
              <Input
                type="number"
                min={1}
                value={numLobbies}
                onChange={(e) => setNumLobbies(parseInt(e.target.value) || 1)}
                className="bg-slate-900/60 border-slate-700 text-slate-200"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-400">Tim per Lobby</label>
              <Input
                type="number"
                min={1}
                value={teamsPerLobby}
                onChange={(e) => setTeamsPerLobby(parseInt(e.target.value) || 1)}
                className="bg-slate-900/60 border-slate-700 text-slate-200"
              />
            </div>
            <p className="text-xs text-slate-500">
              Total slot: {numLobbies * teamsPerLobby} &mdash; Tim terdaftar: {teams.length}
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setGenerateOpen(false)} className="border-slate-600 text-slate-300">
              Batal
            </Button>
            <Button onClick={handleGenerateRotation} disabled={generating}>
              {generating ? 'Generating...' : 'Generate'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Manual assign dialog */}
      <Dialog open={!!editLobbyId} onOpenChange={(open) => !open && setEditLobbyId(null)}>
        <DialogContent className="bg-slate-800 border-slate-700 text-slate-200 max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-slate-50">
              Assign Tim ke {lobbies.find((l) => l.id === editLobbyId)?.lobby_name}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-1 max-h-[50vh] overflow-y-auto">
            {teams.map((team) => (
              <button
                key={team.id}
                onClick={() => toggleTeam(team.id)}
                className={cn(
                  'flex w-full items-center gap-3 rounded-md px-3 py-2 text-left text-sm transition-colors',
                  selectedTeamIds.has(team.id)
                    ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                    : 'hover:bg-slate-700/30 text-slate-300'
                )}
              >
                <div
                  className={cn(
                    'h-4 w-4 rounded border flex items-center justify-center',
                    selectedTeamIds.has(team.id)
                      ? 'bg-blue-500 border-blue-500'
                      : 'border-slate-600'
                  )}
                >
                  {selectedTeamIds.has(team.id) && (
                    <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                      <path d="M1 4L3.5 6.5L9 1" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  )}
                </div>
                {team.name}
              </button>
            ))}
          </div>
          <p className="text-xs text-slate-500">
            {selectedTeamIds.size} tim dipilih
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditLobbyId(null)} className="border-slate-600 text-slate-300">
              Batal
            </Button>
            <Button onClick={handleSaveAssignment} disabled={saving}>
              {saving ? 'Menyimpan...' : 'Simpan'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
