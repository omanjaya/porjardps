'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams } from 'next/navigation'
import { toast } from 'sonner'
import { api } from '@/lib/api'
import { useAuthStore } from '@/store/auth-store'
import { AdminLayout } from '@/components/layouts/AdminLayout'
import { PageHeader } from '@/components/shared/PageHeader'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  Play, ArrowRight, Trophy, XCircle, CheckCircle, Clock,
  CaretDown, CaretUp, Circle, PencilSimple,
} from '@phosphor-icons/react'
import { cn } from '@/lib/utils'
import type { Tournament, TournamentGroup, GroupMatch, GroupStanding, TeamSummary } from '@/types'

interface SwissStatus {
  current_round: number
  max_rounds: number
  qualified_count: number
  eliminated_count: number
  active_count: number
  is_complete: boolean
}

export default function AdminSwissPage() {
  const { isAuthenticated, isLoading: authLoading } = useAuthStore()
  const params = useParams<{ id: string }>()
  const [tournament, setTournament] = useState<Tournament | null>(null)
  const [swissGroup, setSwissGroup] = useState<TournamentGroup | null>(null)
  const [matches, setMatches] = useState<GroupMatch[]>([])
  const [standings, setStandings] = useState<GroupStanding[]>([])
  const [swissStatus, setSwissStatus] = useState<SwissStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [operating, setOperating] = useState(false)

  // Init form
  const [showInit, setShowInit] = useState(false)
  const [maxRounds, setMaxRounds] = useState(5)
  const [winThreshold, setWinThreshold] = useState(3)
  const [lossThreshold, setLossThreshold] = useState(3)
  const [initializing, setInitializing] = useState(false)

  // Expanded rounds
  const [expandedRounds, setExpandedRounds] = useState<Set<number>>(new Set())

  const loadData = useCallback(async () => {
    if (!isAuthenticated || authLoading) return
    try {
      const [t, groups] = await Promise.all([
        api.get<Tournament>(`/tournaments/${params.id}`),
        api.get<TournamentGroup[]>(`/tournaments/${params.id}/groups`),
      ])
      setTournament(t)

      // Find swiss group (pairing_mode === 'swiss')
      const sg = (groups ?? []).find(g => g.pairing_mode === 'swiss') ?? null
      setSwissGroup(sg)

      if (sg) {
        const [m, s, status] = await Promise.all([
          api.get<GroupMatch[]>(`/groups/${sg.id}/matches`).catch(() => [] as GroupMatch[]),
          api.get<GroupStanding[]>(`/groups/${sg.id}/standings`).catch(() => [] as GroupStanding[]),
          api.get<SwissStatus>(`/groups/${sg.id}/swiss/status`).catch(() => null),
        ])
        setMatches(m ?? [])
        setStandings(s ?? [])
        setSwissStatus(status)

        // Expand current round by default
        if (status) {
          setExpandedRounds(new Set([status.current_round]))
        }
      }
    } catch {
      toast.error('Gagal memuat data swiss')
    } finally {
      setLoading(false)
    }
  }, [params.id, isAuthenticated, authLoading])

  useEffect(() => { loadData() }, [loadData])

  const handleInit = async () => {
    setInitializing(true)
    try {
      await api.post(`/admin/tournaments/${params.id}/swiss/init`, {
        max_rounds: maxRounds,
        win_threshold: winThreshold,
        loss_threshold: lossThreshold,
      })
      toast.success('Swiss system berhasil diinisialisasi')
      setShowInit(false)
      loadData()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Gagal inisialisasi swiss')
    } finally {
      setInitializing(false)
    }
  }

  const handleGenerateRound = async () => {
    if (!swissGroup) return
    setOperating(true)
    try {
      await api.post(`/admin/groups/${swissGroup.id}/swiss/generate-round`)
      toast.success('Round berikutnya berhasil di-generate')
      loadData()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Gagal generate round')
    } finally {
      setOperating(false)
    }
  }

  const handleUpdateScore = async (matchId: string, sa: number, sb: number) => {
    if (!swissGroup) return
    setOperating(true)
    try {
      await api.put(`/admin/groups/${swissGroup.id}/matches/${matchId}`, {
        score_a: sa,
        score_b: sb,
      })
      toast.success('Skor disimpan')
      loadData()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Gagal menyimpan skor')
    } finally {
      setOperating(false)
    }
  }

  const handleSetMatchLive = async (matchId: string) => {
    if (!swissGroup) return
    setOperating(true)
    try {
      await api.put(`/admin/groups/${swissGroup.id}/matches/${matchId}/live`)
      toast.success('Status match diubah ke LIVE')
      loadData()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Gagal mengubah status')
    } finally {
      setOperating(false)
    }
  }

  const toggleRound = (r: number) => setExpandedRounds(prev => {
    const next = new Set(prev); next.has(r) ? next.delete(r) : next.add(r); return next
  })

  // Group matches by round
  const matchesByRound: Record<number, GroupMatch[]> = {}
  for (const m of matches) {
    if (!matchesByRound[m.round]) matchesByRound[m.round] = []
    matchesByRound[m.round].push(m)
  }
  const roundNumbers = Object.keys(matchesByRound).map(Number).sort((a, b) => a - b)

  const currentRoundComplete = swissStatus
    ? (matchesByRound[swissStatus.current_round] ?? []).every(m => m.status === 'completed')
    : false

  const canGenerateNext = swissStatus && !swissStatus.is_complete && currentRoundComplete

  if (loading) {
    return (
      <AdminLayout>
        <Skeleton className="h-10 w-64 bg-stone-200" />
        <div className="mt-4 grid gap-4 sm:grid-cols-4">
          <Skeleton className="h-20 bg-stone-200" />
          <Skeleton className="h-20 bg-stone-200" />
          <Skeleton className="h-20 bg-stone-200" />
          <Skeleton className="h-20 bg-stone-200" />
        </div>
        <Skeleton className="mt-4 h-96 w-full bg-stone-200" />
      </AdminLayout>
    )
  }

  return (
    <AdminLayout>
      <PageHeader
        title="Swiss System"
        description={tournament?.name}
        breadcrumbs={[
          { label: 'Turnamen', href: '/admin/tournaments' },
          { label: tournament?.name ?? '', href: `/admin/tournaments/${params.id}` },
          { label: 'Swiss' },
        ]}
        actions={
          <div className="flex flex-wrap gap-2">
            {swissGroup && canGenerateNext && (
              <Button
                size="sm"
                onClick={handleGenerateRound}
                disabled={operating}
                className="bg-esi-red hover:bg-esi-red/90"
              >
                <Play className="mr-1.5 h-4 w-4" />
                {operating ? 'Processing...' : 'Generate Round Berikutnya'}
              </Button>
            )}
          </div>
        }
      />

      {/* No swiss group yet */}
      {!swissGroup ? (
        <div className="rounded-xl border-2 border-dashed border-stone-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 p-12 text-center">
          <Trophy size={48} className="mx-auto mb-3 text-stone-300 dark:text-zinc-600" />
          <p className="text-lg font-semibold text-stone-700 dark:text-zinc-300">Swiss System belum diinisialisasi</p>
          <p className="text-sm text-stone-400 dark:text-zinc-500 mt-1 mb-4">
            Pastikan tim sudah terdaftar, lalu inisialisasi swiss system
          </p>
          <Button onClick={() => setShowInit(true)} className="bg-esi-red hover:bg-esi-red/90">
            <Play className="mr-1.5 h-4 w-4" /> Inisialisasi Swiss
          </Button>
        </div>
      ) : (
        <>
          {/* Status Cards */}
          {swissStatus && (
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-6">
              <div className="rounded-xl border border-stone-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 p-4">
                <p className="text-2xl font-black text-stone-900 dark:text-zinc-100">
                  {swissStatus.current_round}<span className="text-sm font-normal text-stone-400 dark:text-zinc-500">/{swissStatus.max_rounds}</span>
                </p>
                <p className="text-xs text-stone-500 dark:text-zinc-400">Round</p>
              </div>
              <div className="rounded-xl border border-stone-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 p-4">
                <p className="text-2xl font-black text-green-600">{swissStatus.qualified_count}</p>
                <p className="text-xs text-stone-500 dark:text-zinc-400">Lolos</p>
              </div>
              <div className="rounded-xl border border-stone-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 p-4">
                <p className="text-2xl font-black text-red-500">{swissStatus.eliminated_count}</p>
                <p className="text-xs text-stone-500 dark:text-zinc-400">Gugur</p>
              </div>
              <div className="rounded-xl border border-stone-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 p-4">
                <p className="text-2xl font-black text-stone-900 dark:text-zinc-100">{swissStatus.active_count}</p>
                <p className="text-xs text-stone-500 dark:text-zinc-400">Aktif</p>
              </div>
              <div className="rounded-xl border border-stone-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 p-4">
                <div className="flex items-center gap-2">
                  {swissStatus.is_complete ? (
                    <CheckCircle size={20} weight="fill" className="text-green-500" />
                  ) : (
                    <Clock size={20} className="text-amber-500" />
                  )}
                  <p className="text-sm font-semibold text-stone-900 dark:text-zinc-100">
                    {swissStatus.is_complete ? 'Selesai' : 'Berlangsung'}
                  </p>
                </div>
                <p className="text-xs text-stone-500 dark:text-zinc-400">Status</p>
              </div>
            </div>
          )}

          {/* Standings */}
          {standings.length > 0 && (
            <div className="mb-6">
              <h2 className="text-sm font-bold uppercase tracking-wider text-stone-400 dark:text-zinc-500 mb-3">Klasemen Swiss</h2>
              <div className="rounded-xl border border-stone-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="bg-stone-50 dark:bg-zinc-800/50 text-stone-500 dark:text-zinc-400">
                        <th className="w-8 py-2.5 text-center font-semibold">#</th>
                        <th className="py-2.5 pl-3 text-left font-semibold">Tim</th>
                        <th className="w-8 py-2.5 text-center font-semibold">M</th>
                        <th className="w-8 py-2.5 text-center font-semibold">W</th>
                        <th className="w-8 py-2.5 text-center font-semibold">D</th>
                        <th className="w-8 py-2.5 text-center font-semibold">L</th>
                        <th className="w-8 py-2.5 text-center font-semibold">SM</th>
                        <th className="w-8 py-2.5 text-center font-semibold">SK</th>
                        <th className="w-10 py-2.5 text-center font-semibold">SS</th>
                        <th className="w-10 py-2.5 text-center font-bold text-stone-700 dark:text-zinc-300">Pts</th>
                        <th className="w-20 py-2.5 text-center font-semibold">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {standings.map((s) => {
                        const wt = swissGroup?.swiss_config?.win_threshold ?? 3
                        const lt = swissGroup?.swiss_config?.loss_threshold ?? 3
                        const qualified = s.wins >= wt
                        const eliminated = s.losses >= lt
                        return (
                          <tr key={s.team_id} className={cn(
                            'border-t border-stone-100 dark:border-zinc-700',
                            qualified && 'bg-green-50 dark:bg-green-950/30',
                            eliminated && 'bg-red-50 dark:bg-red-950/20',
                          )}>
                            <td className="py-2 text-center">
                              <span className={cn(
                                'inline-flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold',
                                qualified ? 'bg-green-500 text-white' : eliminated ? 'bg-red-500 text-white' : 'bg-stone-200 dark:bg-zinc-700 text-stone-500 dark:text-zinc-400'
                              )}>{s.rank_position}</span>
                            </td>
                            <td className="py-2 pl-3 font-medium text-stone-800 dark:text-zinc-200">{s.team?.name ?? '-'}</td>
                            <td className="py-2 text-center text-stone-500 dark:text-zinc-400">{s.matches_played}</td>
                            <td className="py-2 text-center font-medium text-green-600">{s.wins}</td>
                            <td className="py-2 text-center text-stone-400 dark:text-zinc-500">{s.draws}</td>
                            <td className="py-2 text-center text-red-500">{s.losses}</td>
                            <td className="py-2 text-center text-stone-500 dark:text-zinc-400">{s.goals_for}</td>
                            <td className="py-2 text-center text-stone-500 dark:text-zinc-400">{s.goals_against}</td>
                            <td className={cn('py-2 text-center font-medium', s.goal_difference > 0 ? 'text-green-600' : s.goal_difference < 0 ? 'text-red-500' : 'text-stone-400 dark:text-zinc-500')}>
                              {s.goal_difference > 0 ? '+' : ''}{s.goal_difference}
                            </td>
                            <td className="py-2 text-center font-black text-stone-900 dark:text-zinc-100">{s.points}</td>
                            <td className="py-2 text-center">
                              {qualified ? (
                                <Badge className="bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400 text-[10px] px-1.5 py-0">Lolos</Badge>
                              ) : eliminated ? (
                                <Badge className="bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400 text-[10px] px-1.5 py-0">Gugur</Badge>
                              ) : (
                                <Badge variant="secondary" className="text-[10px] px-1.5 py-0">Aktif</Badge>
                              )}
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* Matches by Round */}
          {roundNumbers.length > 0 && (
            <div className="space-y-3">
              <h2 className="text-sm font-bold uppercase tracking-wider text-stone-400 dark:text-zinc-500">Pertandingan per Round</h2>
              {roundNumbers.map((round) => {
                const roundMatches = matchesByRound[round]
                const completed = roundMatches.filter(m => m.status === 'completed').length
                const total = roundMatches.length
                const allDone = completed === total
                const expanded = expandedRounds.has(round)
                const isCurrent = swissStatus?.current_round === round

                return (
                  <div key={round} className="rounded-xl border border-stone-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 overflow-hidden shadow-sm">
                    <button
                      onClick={() => toggleRound(round)}
                      className="w-full flex items-center justify-between px-5 py-3 hover:bg-stone-50 dark:hover:bg-zinc-800 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div className={cn(
                          'flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-xs font-black',
                          allDone ? 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400' : isCurrent ? 'bg-esi-red/10 text-esi-red' : 'bg-stone-100 dark:bg-zinc-800 text-stone-500 dark:text-zinc-400'
                        )}>
                          R{round}
                        </div>
                        <div className="text-left">
                          <p className="text-sm font-semibold text-stone-900 dark:text-zinc-100">
                            Round {round}
                            {isCurrent && !allDone && <span className="ml-2 text-[10px] font-medium text-esi-red">Sedang Berlangsung</span>}
                          </p>
                          <p className="text-xs text-stone-400 dark:text-zinc-500">{completed}/{total} selesai</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {allDone && <CheckCircle size={16} weight="fill" className="text-green-500" />}
                        {expanded ? <CaretUp size={14} className="text-stone-400 dark:text-zinc-500" /> : <CaretDown size={14} className="text-stone-400 dark:text-zinc-500" />}
                      </div>
                    </button>

                    {expanded && (
                      <div className="border-t border-stone-100 dark:border-zinc-700 p-4">
                        <div className="grid gap-2 sm:grid-cols-2">
                          {roundMatches.map((m) => (
                            <SwissMatchCard
                              key={m.id}
                              match={m}
                              onSave={handleUpdateScore}
                              onSetLive={handleSetMatchLive}
                            />
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}

          {/* Generate next round hint */}
          {swissStatus && !swissStatus.is_complete && !currentRoundComplete && matches.length > 0 && (
            <div className="mt-4 rounded-lg border border-amber-200 dark:border-amber-800/50 bg-amber-50 dark:bg-amber-950/20 px-4 py-3">
              <p className="text-sm text-amber-700 dark:text-amber-400">
                Selesaikan semua match di round {swissStatus.current_round} sebelum generate round berikutnya.
              </p>
            </div>
          )}

          {swissStatus?.is_complete && (
            <div className="mt-4 rounded-lg border border-green-200 dark:border-green-800/50 bg-green-50 dark:bg-green-950/20 px-4 py-3 flex items-center gap-2">
              <CheckCircle size={18} weight="fill" className="text-green-500" />
              <p className="text-sm font-medium text-green-700 dark:text-green-400">
                Swiss system telah selesai. Semua tim sudah lolos atau gugur.
              </p>
            </div>
          )}
        </>
      )}

      {/* Init Dialog */}
      <Dialog open={showInit} onOpenChange={setShowInit}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Inisialisasi Swiss System</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <label className="mb-1 block text-sm font-medium text-stone-700 dark:text-zinc-300">Maksimal Round</label>
              <Input type="number" min={1} max={20} value={maxRounds} onChange={(e) => setMaxRounds(parseInt(e.target.value) || 5)} />
              <p className="text-[10px] text-stone-400 dark:text-zinc-500 mt-1">Jumlah round maksimal yang akan dimainkan</p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-stone-700 dark:text-zinc-300">Win Threshold</label>
                <Input type="number" min={1} max={10} value={winThreshold} onChange={(e) => setWinThreshold(parseInt(e.target.value) || 3)} />
                <p className="text-[10px] text-stone-400 dark:text-zinc-500 mt-1">Menang sekian kali = lolos</p>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-stone-700 dark:text-zinc-300">Loss Threshold</label>
                <Input type="number" min={1} max={10} value={lossThreshold} onChange={(e) => setLossThreshold(parseInt(e.target.value) || 3)} />
                <p className="text-[10px] text-stone-400 dark:text-zinc-500 mt-1">Kalah sekian kali = gugur</p>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowInit(false)}>Batal</Button>
            <Button onClick={handleInit} disabled={initializing} className="bg-esi-red hover:bg-esi-red/90">
              {initializing ? 'Memproses...' : 'Inisialisasi'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  )
}

// Inline match card for Swiss
function SwissMatchCard({ match, onSave, onSetLive }: {
  match: GroupMatch
  onSave: (id: string, sa: number, sb: number) => void
  onSetLive: (id: string) => void
}) {
  const [editing, setEditing] = useState(false)
  const [saStr, setSaStr] = useState(String(match.score_a))
  const [sbStr, setSbStr] = useState(String(match.score_b))
  const completed = match.status === 'completed'
  const isLive = match.status === 'live'

  const openEdit = () => {
    setSaStr(String(match.score_a))
    setSbStr(String(match.score_b))
    setEditing(true)
  }

  const handleSave = () => {
    onSave(match.id, parseInt(saStr) || 0, parseInt(sbStr) || 0)
    setEditing(false)
  }

  return (
    <div className={cn(
      'rounded-lg border px-3 py-2.5 transition-all',
      completed ? 'border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950/30' : isLive ? 'border-red-300 bg-red-50 dark:border-red-800 dark:bg-red-950/30' : 'border-stone-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 hover:border-stone-300'
    )}>
      <div className="flex items-center gap-2 mb-1.5">
        {completed && <CheckCircle size={12} weight="fill" className="text-green-500" />}
        {isLive && (
          <span className="inline-flex items-center gap-1 rounded-full bg-red-600 px-1.5 py-0.5 text-[9px] font-bold text-white animate-pulse">
            <Circle size={6} weight="fill" /> LIVE
          </span>
        )}
        {!completed && !isLive && <Clock size={12} className="text-stone-300 dark:text-zinc-600" />}
        {!completed && !isLive && (
          <button
            onClick={() => onSetLive(match.id)}
            className="text-[9px] font-medium text-stone-400 dark:text-zinc-500 hover:text-red-500 transition-colors"
            title="Set LIVE"
          >
            LIVE
          </button>
        )}
        <span className="text-[9px] text-stone-400 dark:text-zinc-500 ml-auto">#{match.match_number}</span>
      </div>

      {editing ? (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <span className="flex-1 text-xs font-medium text-stone-700 dark:text-zinc-300 truncate">{match.team_a?.name ?? 'TBD'}</span>
            <Input
              type="number"
              min={0}
              value={saStr}
              onChange={(e) => setSaStr(e.target.value)}
              className="w-14 h-7 text-center text-xs px-1"
            />
          </div>
          <div className="flex items-center gap-2">
            <span className="flex-1 text-xs font-medium text-stone-700 dark:text-zinc-300 truncate">{match.team_b?.name ?? 'TBD'}</span>
            <Input
              type="number"
              min={0}
              value={sbStr}
              onChange={(e) => setSbStr(e.target.value)}
              className="w-14 h-7 text-center text-xs px-1"
            />
          </div>
          <div className="flex justify-end gap-1">
            <Button variant="outline" size="sm" className="h-6 text-[10px] px-2" onClick={() => setEditing(false)}>Batal</Button>
            <Button size="sm" className="h-6 text-[10px] px-2 bg-esi-red hover:bg-esi-red/90" onClick={handleSave}>Simpan</Button>
          </div>
        </div>
      ) : (
        <div className="flex items-center gap-2 cursor-pointer" onClick={openEdit}>
          <div className="flex-1 min-w-0">
            <p className={cn('text-xs font-medium truncate', completed && match.score_a > match.score_b ? 'text-green-700 dark:text-green-400' : 'text-stone-700 dark:text-zinc-300')}>
              {match.team_a?.name ?? 'TBD'}
            </p>
            <p className={cn('text-xs font-medium truncate', completed && match.score_b > match.score_a ? 'text-green-700 dark:text-green-400' : 'text-stone-700 dark:text-zinc-300')}>
              {match.team_b?.name ?? 'TBD'}
            </p>
          </div>
          <div className="text-right shrink-0">
            <p className="text-sm font-bold tabular-nums text-stone-900 dark:text-zinc-100">{match.score_a}</p>
            <p className="text-sm font-bold tabular-nums text-stone-900 dark:text-zinc-100">{match.score_b}</p>
          </div>
          <PencilSimple size={12} className="text-stone-300 dark:text-zinc-600 shrink-0" />
        </div>
      )}
    </div>
  )
}
