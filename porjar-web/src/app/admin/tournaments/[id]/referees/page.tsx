'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams } from 'next/navigation'
import { toast } from 'sonner'
import {
  ShieldCheck,
  Plus,
  Trash,
  Sword,
  Spinner,
  MagnifyingGlass,
  Users,
} from '@phosphor-icons/react'
import { AdminLayout } from '@/components/layouts/AdminLayout'
import { PageHeader } from '@/components/shared/PageHeader'
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
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { api, ApiError } from '@/lib/api'
import type { Tournament } from '@/types'

interface MatchItem {
  id: string
  type: 'bracket' | 'br_lobby' | 'group'
  team_a_name: string
  team_b_name: string
  status: string
  round?: number
  match_number?: number
  referee_assignments: {
    id: string
    referee_id: string
    referee_name: string
  }[]
}

interface RefereeUser {
  id: string
  full_name: string
  email: string
}

export default function AdminTournamentRefereesPage() {
  const params = useParams<{ id: string }>()
  const [tournament, setTournament] = useState<Tournament | null>(null)
  const [matches, setMatches] = useState<MatchItem[]>([])
  const [referees, setReferees] = useState<RefereeUser[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Bulk assign
  const [bulkRefereeId, setBulkRefereeId] = useState('')
  const [bulkRound, setBulkRound] = useState('')
  const [bulkAssigning, setBulkAssigning] = useState(false)

  // Assign dialog
  const [assignDialogOpen, setAssignDialogOpen] = useState(false)
  const [assignMatch, setAssignMatch] = useState<MatchItem | null>(null)
  const [selectedRefereeId, setSelectedRefereeId] = useState('')
  const [assigning, setAssigning] = useState(false)
  const [refereeSearch, setRefereeSearch] = useState('')

  // Remove dialog
  const [removeTarget, setRemoveTarget] = useState<{ assignmentId: string; refereeName: string } | null>(null)
  const [removing, setRemoving] = useState(false)

  const loadData = useCallback(async () => {
    try {
      setError(null)
      const [tournamentData, matchesData, refereesData] = await Promise.all([
        api.get<Tournament>(`/tournaments/${params.id}`),
        api.get<MatchItem[]>(`/admin/tournaments/${params.id}/matches-with-referees`),
        api.get<RefereeUser[]>('/admin/users?role=referee'),
      ])
      setTournament(tournamentData)
      setMatches(matchesData ?? [])
      setReferees(refereesData ?? [])
    } catch (err) {
      console.error('Gagal memuat data:', err)
      const msg = err instanceof Error ? err.message : 'Gagal memuat data turnamen'
      setError(msg)
      toast.error(msg)
    } finally {
      setLoading(false)
    }
  }, [params.id])

  useEffect(() => {
    loadData()
  }, [loadData])

  function openAssignDialog(match: MatchItem) {
    setAssignMatch(match)
    setSelectedRefereeId('')
    setRefereeSearch('')
    setAssignDialogOpen(true)
  }

  async function handleAssign() {
    if (!assignMatch || !selectedRefereeId) {
      toast.error('Pilih wasit terlebih dahulu')
      return
    }

    setAssigning(true)
    try {
      const payload: Record<string, string> = {
        referee_id: selectedRefereeId,
        tournament_id: params.id,
      }
      if (assignMatch.type === 'bracket') payload.bracket_match_id = assignMatch.id
      else if (assignMatch.type === 'br_lobby') payload.br_lobby_id = assignMatch.id
      else if (assignMatch.type === 'group') payload.group_match_id = assignMatch.id

      await api.post('/admin/referee-assignments', payload)
      toast.success('Wasit berhasil ditugaskan')
      setAssignDialogOpen(false)
      setAssignMatch(null)
      await loadData()
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Gagal menugaskan wasit')
    } finally {
      setAssigning(false)
    }
  }

  async function handleRemove() {
    if (!removeTarget) return
    setRemoving(true)
    try {
      await api.delete(`/admin/referee-assignments/${removeTarget.assignmentId}`)
      toast.success(`${removeTarget.refereeName} dihapus dari pertandingan`)
      setRemoveTarget(null)
      await loadData()
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Gagal menghapus penugasan')
    } finally {
      setRemoving(false)
    }
  }

  // Available round numbers from matches
  const availableRounds = [...new Set(matches.filter((m) => m.round != null).map((m) => m.round!))].sort((a, b) => a - b)

  async function handleBulkAssign() {
    if (!bulkRefereeId || !bulkRound) {
      toast.error('Pilih wasit dan nomor round terlebih dahulu')
      return
    }
    const roundNum = parseInt(bulkRound)
    const roundMatches = matches.filter((m) => m.round === roundNum)
    if (roundMatches.length === 0) {
      toast.error(`Tidak ada pertandingan di Round ${roundNum}`)
      return
    }

    setBulkAssigning(true)
    let success = 0
    let failed = 0
    for (const match of roundMatches) {
      // Skip if referee already assigned to this match
      if (match.referee_assignments.some((ra) => ra.referee_id === bulkRefereeId)) {
        continue
      }
      try {
        const payload: Record<string, string> = {
          referee_id: bulkRefereeId,
          tournament_id: params.id,
        }
        if (match.type === 'bracket') payload.bracket_match_id = match.id
        else if (match.type === 'br_lobby') payload.br_lobby_id = match.id
        else if (match.type === 'group') payload.group_match_id = match.id

        await api.post('/admin/referee-assignments', payload)
        success++
      } catch {
        failed++
      }
    }
    if (success > 0) toast.success(`${success} pertandingan berhasil ditugaskan`)
    if (failed > 0) toast.error(`${failed} pertandingan gagal ditugaskan`)
    setBulkAssigning(false)
    await loadData()
  }

  const filteredReferees = referees.filter((r) => {
    if (!refereeSearch) return true
    const q = refereeSearch.toLowerCase()
    return r.full_name.toLowerCase().includes(q) || r.email.toLowerCase().includes(q)
  })

  if (loading) {
    return (
      <AdminLayout>
        <Skeleton className="h-10 w-64 bg-stone-200 dark:bg-zinc-700" />
        <Skeleton className="mt-4 h-96 w-full bg-stone-200 dark:bg-zinc-700" />
      </AdminLayout>
    )
  }

  return (
    <AdminLayout>
      <PageHeader
        title="Penugasan Wasit"
        description={tournament ? `Kelola wasit untuk turnamen ${tournament.name}` : 'Kelola wasit pertandingan'}
        breadcrumbs={[
          { label: 'Turnamen', href: '/admin/tournaments' },
          { label: tournament?.name ?? '...', href: `/admin/tournaments/${params.id}` },
          { label: 'Wasit' },
        ]}
      />

      {/* Bulk Assign Section */}
      {!error && matches.length > 0 && referees.length > 0 && availableRounds.length > 0 && (
        <div className="mb-4 rounded-xl border border-stone-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 p-4 shadow-sm">
          <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-stone-400 dark:text-zinc-500">
            Assign Wasit ke Seluruh Round
          </p>
          <div className="flex flex-wrap items-end gap-3">
            <div className="min-w-[180px]">
              <label className="mb-1 block text-xs text-stone-500 dark:text-zinc-400">Wasit</label>
              <select
                value={bulkRefereeId}
                onChange={(e) => setBulkRefereeId(e.target.value)}
                className="w-full rounded-lg border border-stone-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 py-2 text-sm text-stone-700 dark:text-zinc-300 focus:border-esi-red focus:outline-none"
              >
                <option value="">Pilih wasit...</option>
                {referees.map((r) => (
                  <option key={r.id} value={r.id}>{r.full_name}</option>
                ))}
              </select>
            </div>
            <div className="min-w-[120px]">
              <label className="mb-1 block text-xs text-stone-500 dark:text-zinc-400">Round</label>
              <select
                value={bulkRound}
                onChange={(e) => setBulkRound(e.target.value)}
                className="w-full rounded-lg border border-stone-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 py-2 text-sm text-stone-700 dark:text-zinc-300 focus:border-esi-red focus:outline-none"
              >
                <option value="">Pilih round...</option>
                {availableRounds.map((r) => (
                  <option key={r} value={String(r)}>Round {r}</option>
                ))}
              </select>
            </div>
            <Button
              onClick={handleBulkAssign}
              disabled={bulkAssigning || !bulkRefereeId || !bulkRound}
              className="bg-esi-red text-white hover:bg-esi-red/90"
            >
              {bulkAssigning && <Spinner size={14} className="mr-1 animate-spin" />}
              {bulkAssigning ? 'Menyimpan...' : 'Assign Semua'}
            </Button>
          </div>
        </div>
      )}

      {error ? (
        <div className="rounded-xl border border-dashed border-red-300 dark:border-red-800 bg-red-50 dark:bg-red-950/30 p-10 text-center">
          <Sword size={40} className="mx-auto mb-3 text-red-400 dark:text-red-500" />
          <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
          <Button
            size="sm"
            variant="outline"
            className="mt-4 border-red-300 dark:border-red-700 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-950"
            onClick={() => {
              setLoading(true)
              loadData()
            }}
          >
            Coba Lagi
          </Button>
        </div>
      ) : matches.length > 0 ? (
        <div className="rounded-xl border border-stone-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-stone-200 dark:border-zinc-700 hover:bg-transparent bg-stone-50 dark:bg-zinc-800/50">
                  <TableHead className="text-stone-600 dark:text-zinc-400 uppercase text-xs tracking-wider">Pertandingan</TableHead>
                  <TableHead className="text-stone-600 dark:text-zinc-400 uppercase text-xs tracking-wider">Tipe</TableHead>
                  <TableHead className="text-stone-600 dark:text-zinc-400 uppercase text-xs tracking-wider">Status</TableHead>
                  <TableHead className="text-stone-600 dark:text-zinc-400 uppercase text-xs tracking-wider">Wasit</TableHead>
                  <TableHead className="text-right text-stone-600 dark:text-zinc-400 uppercase text-xs tracking-wider">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {matches.map((match) => (
                  <TableRow key={`${match.type}-${match.id}`} className="border-stone-100 dark:border-zinc-700 hover:bg-stone-50 dark:hover:bg-zinc-800 dark:bg-zinc-800/50">
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Sword size={16} className="text-esi-red" />
                        <span className="font-medium text-stone-900 dark:text-zinc-100">
                          {match.team_a_name} vs {match.team_b_name}
                        </span>
                      </div>
                      {match.round != null && (
                        <p className="text-[11px] text-stone-400 dark:text-zinc-500 ml-6">
                          Round {match.round}{match.match_number != null ? `, Match #${match.match_number}` : ''}
                        </p>
                      )}
                    </TableCell>
                    <TableCell>
                      <span className="-skew-x-2 rounded px-1.5 py-0.5 text-[10px] font-bold uppercase bg-blue-100 text-blue-700">
                        {match.type === 'bracket' ? 'Bracket' : match.type === 'br_lobby' ? 'BR' : 'Group'}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span
                        className={`-skew-x-2 rounded px-1.5 py-0.5 text-[10px] font-bold uppercase ${
                          match.status === 'live'
                            ? 'bg-green-100 text-green-700'
                            : match.status === 'completed'
                              ? 'bg-stone-100 dark:bg-zinc-800 text-stone-600 dark:text-zinc-400'
                              : 'bg-amber-100 text-amber-700'
                        }`}
                      >
                        {match.status === 'live' ? 'Live' : match.status === 'completed' ? 'Selesai' : 'Pending'}
                      </span>
                    </TableCell>
                    <TableCell>
                      {match.referee_assignments.length > 0 ? (
                        <div className="space-y-1">
                          {match.referee_assignments.map((ra) => (
                            <div key={ra.id} className="flex items-center gap-2">
                              <ShieldCheck size={12} className="text-esi-red" />
                              <span className="text-sm text-stone-700 dark:text-zinc-300">{ra.referee_name}</span>
                              <button
                                onClick={() => setRemoveTarget({ assignmentId: ra.id, refereeName: ra.referee_name })}
                                className="text-red-400 hover:text-red-600 transition-colors"
                                title="Hapus penugasan"
                              >
                                <Trash size={12} />
                              </button>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <span className="text-xs text-stone-400 dark:text-zinc-500 italic">Belum ada</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        size="xs"
                        className="bg-esi-red text-white hover:bg-esi-red/90"
                        onClick={() => openAssignDialog(match)}
                      >
                        <Plus size={14} className="mr-0.5" />
                        Assign
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      ) : (
        <div className="rounded-xl border border-dashed border-stone-300 dark:border-zinc-600 bg-stone-50 dark:bg-zinc-800/50 p-10 text-center">
          <Sword size={40} className="mx-auto mb-3 text-stone-400 dark:text-zinc-500" />
          <p className="text-sm text-stone-500 dark:text-zinc-400">Belum ada pertandingan di turnamen ini</p>
        </div>
      )}

      {/* Assign Referee Dialog */}
      <Dialog open={assignDialogOpen} onOpenChange={(open) => {
        if (!open) {
          setAssignDialogOpen(false)
          setAssignMatch(null)
        }
      }}>
        <DialogContent className="bg-white dark:bg-zinc-900 border-stone-200 dark:border-zinc-700 text-stone-900 dark:text-zinc-100 sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-stone-900 dark:text-zinc-100">Tugaskan Wasit</DialogTitle>
            <DialogDescription className="text-stone-500 dark:text-zinc-400">
              {assignMatch
                ? `Pilih wasit untuk pertandingan ${assignMatch.team_a_name} vs ${assignMatch.team_b_name}`
                : 'Pilih wasit untuk pertandingan ini'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2">
            <div className="relative">
              <MagnifyingGlass size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400 dark:text-zinc-500" />
              <Input
                value={refereeSearch}
                onChange={(e) => setRefereeSearch(e.target.value)}
                placeholder="Cari wasit..."
                className="bg-white dark:bg-zinc-900 border-stone-300 dark:border-zinc-600 pl-9 focus:border-esi-red"
              />
            </div>

            <div className="max-h-60 overflow-y-auto rounded-lg border border-stone-200 dark:border-zinc-700">
              {filteredReferees.length > 0 ? (
                filteredReferees.map((referee) => (
                  <button
                    key={referee.id}
                    type="button"
                    onClick={() => setSelectedRefereeId(referee.id)}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 text-left transition-colors border-b border-stone-100 dark:border-zinc-700 last:border-0 ${
                      selectedRefereeId === referee.id
                        ? 'bg-red-50 dark:bg-red-950/30 text-esi-red'
                        : 'hover:bg-stone-50 dark:hover:bg-zinc-800 dark:bg-zinc-800/50 text-stone-700 dark:text-zinc-300'
                    }`}
                  >
                    <Users size={16} />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium truncate">{referee.full_name}</p>
                      <p className="text-[11px] text-stone-400 dark:text-zinc-500 truncate">{referee.email}</p>
                    </div>
                    {selectedRefereeId === referee.id && (
                      <div className="h-2 w-2 rounded-full bg-esi-red" />
                    )}
                  </button>
                ))
              ) : (
                <div className="p-4 text-center text-sm text-stone-400 dark:text-zinc-500">
                  Tidak ada wasit ditemukan
                </div>
              )}
            </div>
          </div>

          <DialogFooter className="border-stone-200 dark:border-zinc-700 bg-stone-50 dark:bg-zinc-800/50">
            <Button
              variant="outline"
              onClick={() => {
                setAssignDialogOpen(false)
                setAssignMatch(null)
              }}
              disabled={assigning}
              className="border-stone-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-stone-700 dark:text-zinc-300 hover:bg-stone-50 dark:hover:bg-zinc-800 dark:bg-zinc-800/50"
            >
              Batal
            </Button>
            <Button
              onClick={handleAssign}
              disabled={assigning || !selectedRefereeId}
              className="bg-esi-red text-white hover:bg-esi-red/90"
            >
              {assigning && <Spinner size={14} className="mr-1 animate-spin" />}
              {assigning ? 'Menyimpan...' : 'Tugaskan'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Remove Confirmation */}
      <ConfirmDialog
        open={!!removeTarget}
        title="Hapus Penugasan Wasit"
        description={`Yakin ingin menghapus penugasan "${removeTarget?.refereeName}" dari pertandingan ini?`}
        confirmLabel={removing ? 'Menghapus...' : 'Hapus'}
        onConfirm={handleRemove}
        onCancel={() => setRemoveTarget(null)}
        loading={removing}
        variant="destructive"
      />
    </AdminLayout>
  )
}
