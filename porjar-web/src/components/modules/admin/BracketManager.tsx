'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { toast } from 'sonner'
import { api } from '@/lib/api'
import { BracketView } from '@/components/modules/bracket/BracketView'
import { MatchDetailSheet } from '@/components/modules/bracket/MatchDetailSheet'
import { SeedConfigDialog } from '@/components/modules/bracket/SeedConfigDialog'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { TreeStructure } from '@phosphor-icons/react'
import { useWebSocket } from '@/hooks/useWebSocket'
import { BracketToolbar } from './BracketToolbar'
import { BOConfigDialog } from './BOConfigDialog'
import type { BracketMatch, Team, WSMessage } from '@/types'

interface BracketManagerProps {
  tournamentId: string
  format: string
  bestOf: number
}

export function BracketManager({ tournamentId, format, bestOf }: BracketManagerProps) {
  const [_matches, _setMatches] = useState<BracketMatch[] | null>(null)
  const [_teams, _setTeams] = useState<Team[] | null>(null)
  const [loading, setLoading] = useState(true)
  const matches = _matches || []
  const teams = _teams || []
  const setMatches = _setMatches
  const setTeams = _setTeams
  const [selectedMatch, setSelectedMatch] = useState<BracketMatch | null>(null)
  const [sheetOpen, setSheetOpen] = useState(false)

  // Dialog states
  const [seedDialogOpen, setSeedDialogOpen] = useState(false)
  const [resetDialogOpen, setResetDialogOpen] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [resetting, setResetting] = useState(false)
  const [boConfigOpen, setBoConfigOpen] = useState(false)
  const [roundBoConfig, setRoundBoConfig] = useState<Record<number, number>>({})
  const [savingBo, setSavingBo] = useState(false)

  // Round scheduling state
  const [scheduleRound, setScheduleRound] = useState<number | null>(null)
  const [scheduleRoundDatetime, setScheduleRoundDatetime] = useState('')
  const [schedulingRound, setSchedulingRound] = useState(false)

  // Stats
  const stats = useMemo(() => {
    const m = matches ?? []
    const pending = m.filter((x) => x.status === 'pending' || x.status === 'scheduled').length
    const live = m.filter((x) => x.status === 'live').length
    const completed = m.filter((x) => x.status === 'completed').length
    return { pending, live, completed, total: m.length }
  }, [matches])

  const maxRound = useMemo(
    () => (matches ?? []).reduce((max, m) => Math.max(max, m.round), 0),
    [matches]
  )

  const liveMatchIds = useMemo(
    () => (matches ?? []).filter((m) => m.status === 'live').map((m) => m.id),
    [matches]
  )

  const rounds = useMemo(() => {
    const r: number[] = []
    for (let i = 1; i <= maxRound; i++) r.push(i)
    return r
  }, [maxRound])

  // Load data
  const loadData = useCallback(async () => {
    try {
      const [m, t] = await Promise.all([
        api.get<BracketMatch[]>(`/tournaments/${tournamentId}/bracket`),
        api.get<Team[]>(`/tournaments/${tournamentId}/teams`),
      ])
      setMatches(m ?? [])
      setTeams(t ?? [])
    } catch {
      toast.error('Gagal memuat data bracket')
    } finally {
      setLoading(false)
    }
  }, [tournamentId])

  useEffect(() => {
    loadData()
  }, [loadData])

  // WebSocket real-time updates — partial update for score/status, full refetch for bracket_advance
  const handleWSMessage = useCallback(
    (msg: WSMessage) => {
      if (msg.type === 'bracket_advance') {
        // Structure changed, need full refetch
        loadData()
        return
      }

      // For score_update and match_status, patch the individual match in state
      const data = msg.data as Record<string, unknown> | undefined
      const matchId = data?.match_id as string | undefined
      if (!matchId) {
        loadData()
        return
      }

      setMatches((prev) => {
        if (!prev) return prev
        const idx = prev.findIndex((m) => m.id === matchId)
        if (idx === -1) return prev

        const updated = [...prev]
        const match = { ...updated[idx] }

        if (msg.type === 'score_update') {
          if (data?.score_a != null) match.score_a = data.score_a as number
          if (data?.score_b != null) match.score_b = data.score_b as number
        }

        if (msg.type === 'match_status') {
          if (data?.status) match.status = data.status as BracketMatch['status']
          if (data?.winner_id && match.team_a?.id === data.winner_id) {
            match.winner = match.team_a
          } else if (data?.winner_id && match.team_b?.id === data.winner_id) {
            match.winner = match.team_b
          }
        }

        updated[idx] = match
        return updated
      })
    },
    [loadData, setMatches]
  )

  useWebSocket({
    channels: [`tournament:${tournamentId}`],
    messageTypes: ['score_update', 'match_status', 'bracket_advance'],
    onMessage: handleWSMessage,
  })

  // Actions
  async function handleGenerateBracket(seeds: { teamId: string; seed: number }[]) {
    setGenerating(true)
    try {
      await api.post(`/admin/tournaments/${tournamentId}/generate-bracket`, { seeds })
      toast.success('Bracket berhasil dibuat')
      setSeedDialogOpen(false)
      await loadData()
    } catch {
      toast.error('Gagal membuat bracket')
    } finally {
      setGenerating(false)
    }
  }

  async function handleResetBracket() {
    setResetting(true)
    try {
      await api.delete(`/admin/tournaments/${tournamentId}/bracket`)
      toast.success('Bracket berhasil direset')
      setResetDialogOpen(false)
      await loadData()
    } catch {
      toast.error('Gagal mereset bracket')
    } finally {
      setResetting(false)
    }
  }

  async function handleSetLive(matchId: string) {
    try {
      await api.put(`/admin/matches/${matchId}/status`, { status: 'live' })
      toast.success('Match dimulai')
      await loadData()
      setSelectedMatch((prev) => (prev ? { ...prev, status: 'live' } : prev))
    } catch {
      toast.error('Gagal mengubah status')
    }
  }

  async function handleScoreUpdate(matchId: string, scoreA: number, scoreB: number) {
    try {
      await api.put(`/admin/matches/${matchId}/score`, { score_a: scoreA, score_b: scoreB })
      toast.success('Skor berhasil disimpan')
      await loadData()
    } catch {
      toast.error('Gagal menyimpan skor')
    }
  }

  async function handleComplete(matchId: string, winnerId: string) {
    try {
      await api.post(`/admin/matches/${matchId}/complete`, { winner_id: winnerId })
      toast.success('Match selesai')
      setSheetOpen(false)
      setSelectedMatch(null)
      await loadData()
    } catch {
      toast.error('Gagal menyelesaikan match')
    }
  }

  async function handleBatchScheduleRound() {
    if (!scheduleRound || !scheduleRoundDatetime) return
    setSchedulingRound(true)
    try {
      const dt = new Date(scheduleRoundDatetime)
      if (isNaN(dt.getTime())) { toast.error('Waktu tidak valid'); setSchedulingRound(false); return }
      const rfc3339 = dt.toISOString().replace('Z', '+00:00')
      await api.post(`/admin/tournaments/${tournamentId}/bracket/round/${scheduleRound}/schedule`, {
        scheduled_at: rfc3339,
      })
      toast.success(`Round ${scheduleRound} berhasil dijadwalkan`)
      setScheduleRound(null)
      setScheduleRoundDatetime('')
      await loadData()
    } catch {
      toast.error('Gagal menjadwalkan round')
    } finally {
      setSchedulingRound(false)
    }
  }

  function openBoConfig() {
    const config: Record<number, number> = {}
    for (const r of rounds) {
      const matchInRound = (matches ?? []).find((m) => m.round === r)
      config[r] = matchInRound?.best_of || bestOf || 1
    }
    setRoundBoConfig(config)
    setBoConfigOpen(true)
  }

  async function handleSaveBoConfig() {
    setSavingBo(true)
    try {
      const roundsPayload: Record<string, number> = {}
      for (const [round, bo] of Object.entries(roundBoConfig)) {
        roundsPayload[round] = bo
      }
      await api.put(`/admin/tournaments/${tournamentId}/bracket/round-bo`, { rounds: roundsPayload })
      toast.success('BO per round berhasil disimpan')
      setBoConfigOpen(false)
      await loadData()
    } catch {
      toast.error('Gagal menyimpan BO config')
    } finally {
      setSavingBo(false)
    }
  }

  function handleMatchClick(matchId: string) {
    const match = (matches ?? []).find((m) => m.id === matchId)
    if (match) {
      setSelectedMatch(match)
      setSheetOpen(true)
    }
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-12 animate-pulse rounded-xl bg-stone-100" />
        <div className="h-96 animate-pulse rounded-xl bg-stone-100" />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* === Floating Admin Toolbar === */}
      <BracketToolbar
        matchCount={(matches ?? []).length}
        teamCount={(teams ?? []).length}
        generating={generating}
        stats={stats}
        rounds={rounds}
        scheduleRound={scheduleRound}
        setScheduleRound={setScheduleRound}
        scheduleRoundDatetime={scheduleRoundDatetime}
        setScheduleRoundDatetime={setScheduleRoundDatetime}
        schedulingRound={schedulingRound}
        onGenerateClick={() => setSeedDialogOpen(true)}
        onResetClick={() => setResetDialogOpen(true)}
        onBoConfigClick={openBoConfig}
        onScheduleRound={handleBatchScheduleRound}
      />

      {/* === Bracket View === */}
      {(matches ?? []).length > 0 ? (
        <BracketView
          matches={matches}
          rounds={maxRound}
          liveMatchIds={liveMatchIds}
          onMatchClick={handleMatchClick}
        />
      ) : (
        <div className="flex flex-col items-center justify-center gap-4 rounded-xl border border-stone-200 bg-white py-20">
          <TreeStructure size={48} className="text-stone-300" />
          <div className="text-center">
            <p className="text-stone-600 font-medium">Belum ada bracket</p>
            <p className="text-sm text-stone-400 mt-1">
              Klik &ldquo;Generate Bracket&rdquo; untuk memulai turnamen.
              {(teams ?? []).length < 2 && (
                <span className="block text-amber-600 mt-1">
                  Minimal 2 tim dibutuhkan ({(teams ?? []).length} terdaftar).
                </span>
              )}
            </p>
          </div>
        </div>
      )}

      {/* === Match Detail Sheet === */}
      <MatchDetailSheet
        match={selectedMatch}
        open={sheetOpen}
        onClose={() => {
          setSheetOpen(false)
          setSelectedMatch(null)
        }}
        isAdmin
        onScoreUpdate={handleScoreUpdate}
        onSetLive={handleSetLive}
        onComplete={handleComplete}
        onScheduleUpdate={loadData}
      />

      {/* === Seed Config Dialog === */}
      <SeedConfigDialog
        open={seedDialogOpen}
        teams={teams}
        onConfirm={handleGenerateBracket}
        onCancel={() => setSeedDialogOpen(false)}
      />

      {/* === Reset Confirm Dialog === */}
      <ConfirmDialog
        open={resetDialogOpen}
        title="Reset Bracket"
        description="Semua data bracket akan dihapus termasuk skor dan hasil pertandingan. Tindakan ini tidak bisa dibatalkan."
        confirmLabel="Reset Bracket"
        variant="destructive"
        onConfirm={handleResetBracket}
        onCancel={() => setResetDialogOpen(false)}
        loading={resetting}
      />

      {/* === BO Config Dialog === */}
      <BOConfigDialog
        open={boConfigOpen}
        onOpenChange={setBoConfigOpen}
        rounds={rounds}
        maxRound={maxRound}
        format={format}
        matches={matches}
        roundBoConfig={roundBoConfig}
        setRoundBoConfig={setRoundBoConfig}
        savingBo={savingBo}
        onSave={handleSaveBoConfig}
      />
    </div>
  )
}
