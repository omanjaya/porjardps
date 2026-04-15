'use client'

import { useState, useEffect, useCallback } from 'react'
import { toast } from 'sonner'
import Link from 'next/link'
import {
  Sword,
  IdentificationCard,
  Spinner,
  Trophy,
  Lightning,
  Broadcast,
  ArrowsClockwise,
  CaretRight,
  Play,
  Clock,
} from '@phosphor-icons/react'
import { RefereeLayout } from '@/components/layouts/RefereeLayout'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { api, ApiError } from '@/lib/api'
import { cn } from '@/lib/utils'
import type { LiveMatch } from '@/types'

type CardType = 'yellow' | 'red'
type MatchFilter = 'all' | 'bracket' | 'br' | 'group'
type PageTab = 'live' | 'scheduled'

interface IssueCardForm {
  team_id: string
  team_name: string
  card_type: CardType
  reason: string
}

function getMatchTypeLabel(type: string) {
  if (type === 'bracket') return 'Bracket'
  if (type === 'br') return 'Battle Royale'
  if (type === 'group') return 'Grup'
  return type
}

function getMatchTeams(match: LiveMatch): { id: string; name: string }[] {
  const teams: { id: string; name: string }[] = []
  if (match.type === 'br') return teams
  if (match.team_a_id && match.team_a_name && match.team_a_name !== 'TBD') {
    teams.push({ id: match.team_a_id, name: match.team_a_name })
  }
  if (match.team_b_id && match.team_b_name && match.team_b_name !== 'TBD') {
    teams.push({ id: match.team_b_id, name: match.team_b_name })
  }
  return teams
}

export default function RefereeMatchesPage() {
  const [tab, setTab] = useState<PageTab>('live')
  const [liveMatches, setLiveMatches] = useState<LiveMatch[]>([])
  const [scheduledMatches, setScheduledMatches] = useState<LiveMatch[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<MatchFilter>('all')
  const [refreshing, setRefreshing] = useState(false)

  // Issue card dialog state
  const [cardDialogOpen, setCardDialogOpen] = useState(false)
  const [cardMatch, setCardMatch] = useState<LiveMatch | null>(null)
  const [cardForm, setCardForm] = useState<IssueCardForm>({
    team_id: '',
    team_name: '',
    card_type: 'yellow',
    reason: '',
  })
  const [issuingCard, setIssuingCard] = useState(false)
  const [confirmStep, setConfirmStep] = useState(false)

  // Set live state
  const [settingLive, setSettingLive] = useState<string | null>(null)

  const loadMatches = useCallback(async (showRefresh = false) => {
    if (showRefresh) setRefreshing(true)
    else setLoading(true)
    try {
      const [liveData, scheduledData] = await Promise.all([
        api.get<LiveMatch[]>('/referee/matches'),
        api.get<LiveMatch[]>('/referee/matches/scheduled'),
      ])
      setLiveMatches(liveData ?? [])
      setScheduledMatches(scheduledData ?? [])
    } catch (err) {
      console.error('Gagal memuat pertandingan:', err)
      toast.error('Gagal memuat pertandingan')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  useEffect(() => {
    loadMatches()
    const interval = setInterval(() => loadMatches(), 30_000)
    return () => clearInterval(interval)
  }, [loadMatches])

  const matches = tab === 'live' ? liveMatches : scheduledMatches
  const tournaments = Array.from(new Set(matches.map((m) => m.tournament_name))).filter(Boolean)
  const filtered = filter === 'all' ? matches : matches.filter((m) => m.type === filter)

  const bracketCount = matches.filter((m) => m.type === 'bracket').length
  const brCount = matches.filter((m) => m.type === 'br').length
  const groupCount = matches.filter((m) => m.type === 'group').length

  function openCardDialog(match: LiveMatch) {
    setCardMatch(match)
    setCardForm({ team_id: '', team_name: '', card_type: 'yellow', reason: '' })
    setConfirmStep(false)
    setCardDialogOpen(true)
  }

  function selectTeam(teamId: string, teamName: string) {
    setCardForm((prev) => ({ ...prev, team_id: teamId, team_name: teamName }))
  }

  async function handleSetLive(match: LiveMatch) {
    const key = `${match.type}-${match.match_id}`
    setSettingLive(key)
    try {
      await api.put(`/referee/matches/${match.type}/${match.match_id}/live`, {})
      toast.success('Pertandingan dimulai')
      await loadMatches(true)
      setTab('live')
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Gagal memulai pertandingan')
    } finally {
      setSettingLive(null)
    }
  }

  async function handleIssueCard() {
    if (!cardMatch) return

    if (!confirmStep) {
      if (!cardForm.team_id) {
        toast.error('Pilih tim terlebih dahulu')
        return
      }
      if (!cardForm.reason.trim()) {
        toast.error('Alasan wajib diisi')
        return
      }
      setConfirmStep(true)
      return
    }

    setIssuingCard(true)
    try {
      const payload: Record<string, unknown> = {
        tournament_id: cardMatch.tournament_id,
        team_id: cardForm.team_id,
        card_type: cardForm.card_type,
        reason: cardForm.reason.trim(),
      }
      if (cardMatch.type === 'bracket') payload.bracket_match_id = cardMatch.match_id
      else if (cardMatch.type === 'br') payload.br_lobby_id = cardMatch.match_id
      else if (cardMatch.type === 'group') payload.group_match_id = cardMatch.match_id

      await api.post('/referee/cards', payload)
      toast.success('Kartu berhasil dikeluarkan')
      setCardDialogOpen(false)
      setCardMatch(null)
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Gagal mengeluarkan kartu')
    } finally {
      setIssuingCard(false)
    }
  }

  const filterButtons: { key: MatchFilter; label: string; count: number }[] = [
    { key: 'all', label: 'Semua', count: matches.length },
    { key: 'bracket', label: 'Bracket', count: bracketCount },
    { key: 'br', label: 'BR', count: brCount },
    { key: 'group', label: 'Grup', count: groupCount },
  ]

  return (
    <RefereeLayout>
      {/* Breadcrumb */}
      <div className="mb-3 flex items-center gap-2 text-sm text-stone-500 dark:text-zinc-400">
        <Link href="/referee" className="hover:text-esi-red transition-colors">Dashboard</Link>
        <CaretRight size={12} />
        <span className="text-stone-900 dark:text-zinc-100 font-medium">Pertandingan</span>
      </div>

      {/* Sticky header */}
      <div className="sticky top-0 z-10 -mx-4 -mt-4 mb-4 border-b border-stone-200 dark:border-zinc-700 bg-stone-50/95 dark:bg-zinc-950/95 backdrop-blur-sm px-4 pb-3 pt-4 sm:-mx-6 sm:-mt-6 sm:px-6 sm:pt-6">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-green-100 dark:bg-green-900/30">
              <Broadcast size={18} weight="duotone" className="text-green-600" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-esi-text sm:text-xl">Pertandingan</h1>
              <p className="text-[11px] text-esi-muted">
                {liveMatches.length} live · {scheduledMatches.length} terjadwal
              </p>
            </div>
          </div>
          <button
            onClick={() => loadMatches(true)}
            disabled={refreshing}
            className="flex h-10 w-10 items-center justify-center rounded-lg border border-stone-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-esi-muted transition-all active:scale-95 hover:text-esi-text disabled:opacity-50"
            aria-label="Refresh"
          >
            <ArrowsClockwise size={18} className={refreshing ? 'animate-spin' : ''} />
          </button>
        </div>

        {/* Live / Scheduled tabs */}
        <div className="mt-3 flex gap-1.5">
          <button
            onClick={() => { setTab('live'); setFilter('all') }}
            className={cn(
              'flex flex-1 items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-semibold transition-all',
              tab === 'live'
                ? 'bg-green-600 text-white shadow-sm'
                : 'bg-white dark:bg-zinc-800 text-esi-muted border border-stone-200 dark:border-zinc-700 hover:text-esi-text'
            )}
          >
            <span className={cn('h-1.5 w-1.5 rounded-full', tab === 'live' ? 'bg-white animate-pulse' : 'bg-green-500')} />
            Live
            {liveMatches.length > 0 && (
              <span className={cn('rounded-full px-1.5 py-0.5 text-[10px] font-bold tabular-nums', tab === 'live' ? 'bg-white/20 text-white' : 'bg-stone-100 dark:bg-zinc-700 text-esi-muted')}>
                {liveMatches.length}
              </span>
            )}
          </button>
          <button
            onClick={() => { setTab('scheduled'); setFilter('all') }}
            className={cn(
              'flex flex-1 items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-semibold transition-all',
              tab === 'scheduled'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'bg-white dark:bg-zinc-800 text-esi-muted border border-stone-200 dark:border-zinc-700 hover:text-esi-text'
            )}
          >
            <Clock size={12} />
            Terjadwal
            {scheduledMatches.length > 0 && (
              <span className={cn('rounded-full px-1.5 py-0.5 text-[10px] font-bold tabular-nums', tab === 'scheduled' ? 'bg-white/20 text-white' : 'bg-stone-100 dark:bg-zinc-700 text-esi-muted')}>
                {scheduledMatches.length}
              </span>
            )}
          </button>
        </div>

        {/* Filter tabs */}
        <div className="mt-2 flex gap-1.5 overflow-x-auto pb-0.5 scrollbar-none">
          {filterButtons.map((f) => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={cn(
                'flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold transition-all',
                filter === f.key
                  ? 'bg-esi-red text-white shadow-sm'
                  : 'bg-white dark:bg-zinc-800 text-esi-muted border border-stone-200 dark:border-zinc-700 hover:text-esi-text'
              )}
            >
              {f.label}
              {f.count > 0 && (
                <span
                  className={cn(
                    'tabular-nums rounded-full px-1.5 py-0.5 text-[10px] font-bold',
                    filter === f.key
                      ? 'bg-white/20 text-white'
                      : 'bg-stone-100 dark:bg-zinc-700 text-esi-muted'
                  )}
                >
                  {f.count}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Match list */}
      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-32 rounded-xl bg-esi-border" />
          ))}
        </div>
      ) : filtered.length > 0 ? (
        <div className="space-y-3">
          {filtered.map((match) => {
            const matchKey = `${match.type}-${match.match_id}`
            const isSettingThisLive = settingLive === matchKey
            return (
              <div
                key={matchKey}
                className="rounded-xl border border-stone-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 shadow-sm overflow-hidden"
              >
                {/* Match header bar */}
                <div className="flex items-center justify-between border-b border-stone-100 dark:border-zinc-800 bg-stone-50 dark:bg-zinc-800/30 px-4 py-2">
                  <div className="flex items-center gap-2">
                    {tab === 'live' ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-green-100 dark:bg-green-900/40 px-2 py-0.5 text-[10px] font-bold uppercase text-green-700 dark:text-green-300">
                        <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-green-500" />
                        Live
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 rounded-full bg-blue-100 dark:bg-blue-900/40 px-2 py-0.5 text-[10px] font-bold uppercase text-blue-700 dark:text-blue-300">
                        <Clock size={10} />
                        Terjadwal
                      </span>
                    )}
                    <span className="rounded bg-stone-200 dark:bg-zinc-700 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-esi-muted">
                      {getMatchTypeLabel(match.type)}
                    </span>
                  </div>
                  {match.round != null && (
                    <span className="text-[11px] text-esi-muted">
                      R{match.round}
                      {match.match_number != null && match.type !== 'br' && ` #${match.match_number}`}
                    </span>
                  )}
                </div>

                {/* Match body */}
                <div className="p-4">
                  {match.type === 'br' ? (
                    <div className="flex items-center gap-3 mb-3">
                      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-purple-100 dark:bg-purple-900/30">
                        <Lightning size={24} weight="duotone" className="text-purple-600" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-base font-bold text-esi-text truncate">
                          {match.lobby_name ?? 'Battle Royale'}
                        </p>
                        <p className="text-xs text-esi-muted flex items-center gap-1">
                          <Trophy size={11} />
                          {match.tournament_name}
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="mb-3">
                      <div className="flex items-center gap-2">
                        <div className="min-w-0 flex-1 text-right">
                          <p className="truncate text-sm font-bold text-esi-text">{match.team_a_name}</p>
                        </div>
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-stone-100 dark:bg-zinc-800">
                          <span className="text-[10px] font-black text-esi-muted">VS</span>
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-bold text-esi-text">{match.team_b_name}</p>
                        </div>
                      </div>
                      <p className="mt-1.5 text-center text-xs text-esi-muted flex items-center justify-center gap-1">
                        <Trophy size={11} />
                        {match.tournament_name}
                      </p>
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex gap-2">
                    {tab === 'scheduled' ? (
                      <button
                        onClick={() => handleSetLive(match)}
                        disabled={isSettingThisLive}
                        className="flex h-12 flex-1 items-center justify-center gap-2 rounded-xl border border-green-300 dark:border-green-700 bg-green-50 dark:bg-green-950/50 text-sm font-semibold text-green-700 dark:text-green-300 transition-all active:scale-[0.97] disabled:opacity-60"
                      >
                        {isSettingThisLive ? (
                          <Spinner size={18} className="animate-spin" />
                        ) : (
                          <Play size={18} weight="fill" />
                        )}
                        Mulai
                      </button>
                    ) : (
                      <button
                        onClick={() => openCardDialog(match)}
                        className="flex h-12 flex-1 items-center justify-center gap-2 rounded-xl border border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-950/50 text-sm font-semibold text-amber-700 dark:text-amber-300 transition-all active:scale-[0.97]"
                      >
                        <IdentificationCard size={18} weight="duotone" />
                        Beri Kartu
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      ) : (
        <div className="rounded-xl border border-dashed border-stone-300 dark:border-zinc-700 bg-stone-50 dark:bg-zinc-900/50 p-10 text-center">
          <Sword size={40} weight="duotone" className="mx-auto mb-3 text-esi-border" />
          <p className="text-sm font-medium text-esi-muted">
            {filter !== 'all'
              ? `Tidak ada pertandingan ${getMatchTypeLabel(filter)} yang ${tab === 'live' ? 'sedang live' : 'terjadwal'}`
              : tab === 'live'
              ? 'Belum ada pertandingan yang sedang berlangsung'
              : 'Tidak ada pertandingan yang terjadwal'}
          </p>
          <p className="mt-1 text-xs text-esi-muted">Otomatis refresh setiap 30 detik</p>
        </div>
      )}

      {/* Issue Card Dialog */}
      <Dialog
        open={cardDialogOpen}
        onOpenChange={(open) => {
          if (!open) {
            setCardDialogOpen(false)
            setCardMatch(null)
            setConfirmStep(false)
          }
        }}
      >
        <DialogContent className="bg-white dark:bg-zinc-900 border-stone-200 dark:border-zinc-700 text-stone-900 dark:text-zinc-100 sm:max-w-md mx-4">
          <DialogHeader>
            <DialogTitle className="text-stone-900 dark:text-zinc-100">
              {confirmStep ? 'Konfirmasi Kartu' : 'Beri Kartu Pelanggaran'}
            </DialogTitle>
            <DialogDescription className="text-stone-500 dark:text-zinc-400">
              {confirmStep
                ? 'Pastikan data kartu sudah benar sebelum dikeluarkan.'
                : 'Pilih tim, jenis kartu, dan alasan pelanggaran.'}
            </DialogDescription>
          </DialogHeader>

          {confirmStep ? (
            <div className="space-y-3 py-2">
              <div className="rounded-xl border border-stone-200 dark:border-zinc-700 bg-stone-50 dark:bg-zinc-800/50 p-4 space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-stone-500 dark:text-zinc-400">Tim:</span>
                  <span className="font-bold text-stone-900 dark:text-zinc-100">{cardForm.team_name}</span>
                </div>
                <div className="flex justify-between text-sm items-center">
                  <span className="text-stone-500 dark:text-zinc-400">Kartu:</span>
                  <span
                    className={cn(
                      'inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-bold',
                      cardForm.card_type === 'yellow'
                        ? 'bg-yellow-100 text-yellow-800'
                        : 'bg-red-100 text-red-800'
                    )}
                  >
                    <span
                      className={cn(
                        'inline-block h-4 w-3 rounded-sm',
                        cardForm.card_type === 'yellow' ? 'bg-yellow-400' : 'bg-red-500'
                      )}
                    />
                    {cardForm.card_type === 'yellow' ? 'Kuning' : 'Merah'}
                  </span>
                </div>
                <div className="text-sm">
                  <span className="text-stone-500 dark:text-zinc-400">Alasan:</span>
                  <p className="mt-1 font-medium text-stone-900 dark:text-zinc-100">{cardForm.reason}</p>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-4 py-2">
              {/* Team selection */}
              {cardMatch && getMatchTeams(cardMatch).length > 0 ? (
                <div>
                  <label className="mb-2 block text-sm font-semibold text-stone-700 dark:text-zinc-300">Tim</label>
                  <div className="flex gap-2">
                    {getMatchTeams(cardMatch).map((team) => (
                      <button
                        key={team.id}
                        type="button"
                        onClick={() => selectTeam(team.id, team.name)}
                        className={cn(
                          'flex h-14 flex-1 items-center justify-center rounded-xl border-2 px-3 text-sm font-bold transition-all active:scale-[0.97]',
                          cardForm.team_id === team.id
                            ? 'border-esi-red bg-red-50 dark:bg-red-950 text-esi-red'
                            : 'border-stone-200 dark:border-zinc-700 text-stone-600 dark:text-zinc-400 hover:bg-stone-50 dark:hover:bg-zinc-800/50'
                        )}
                      >
                        {team.name}
                      </button>
                    ))}
                  </div>
                </div>
              ) : cardMatch?.type === 'br' ? (
                <div>
                  <label className="mb-2 block text-sm font-semibold text-stone-700 dark:text-zinc-300">Team ID</label>
                  <input
                    type="text"
                    placeholder="Masukkan team ID..."
                    value={cardForm.team_id}
                    onChange={(e) =>
                      setCardForm((prev) => ({
                        ...prev,
                        team_id: e.target.value,
                        team_name: e.target.value,
                      }))
                    }
                    className="h-14 w-full rounded-xl border-2 border-stone-200 dark:border-zinc-700 px-4 text-sm bg-white dark:bg-zinc-900 text-stone-900 dark:text-zinc-100 focus:border-esi-red focus:outline-none"
                  />
                  <p className="mt-1.5 text-[11px] text-esi-muted">
                    Battle Royale — masukkan ID tim yang melanggar
                  </p>
                </div>
              ) : null}

              {/* Card type */}
              <div>
                <label className="mb-2 block text-sm font-semibold text-stone-700 dark:text-zinc-300">Jenis Kartu</label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setCardForm((prev) => ({ ...prev, card_type: 'yellow' }))}
                    className={cn(
                      'flex h-14 flex-1 items-center justify-center gap-2.5 rounded-xl border-2 text-sm font-bold transition-all active:scale-[0.97]',
                      cardForm.card_type === 'yellow'
                        ? 'border-yellow-400 bg-yellow-50 dark:bg-yellow-950/50 text-yellow-800 dark:text-yellow-300'
                        : 'border-stone-200 dark:border-zinc-700 text-stone-500 dark:text-zinc-400 hover:bg-stone-50 dark:hover:bg-zinc-800/50'
                    )}
                  >
                    <span className="inline-block h-6 w-5 rounded-sm bg-yellow-400 shadow-sm" />
                    Kuning
                  </button>
                  <button
                    type="button"
                    onClick={() => setCardForm((prev) => ({ ...prev, card_type: 'red' }))}
                    className={cn(
                      'flex h-14 flex-1 items-center justify-center gap-2.5 rounded-xl border-2 text-sm font-bold transition-all active:scale-[0.97]',
                      cardForm.card_type === 'red'
                        ? 'border-red-400 bg-red-50 dark:bg-red-950/50 text-red-800 dark:text-red-300'
                        : 'border-stone-200 dark:border-zinc-700 text-stone-500 dark:text-zinc-400 hover:bg-stone-50 dark:hover:bg-zinc-800/50'
                    )}
                  >
                    <span className="inline-block h-6 w-5 rounded-sm bg-red-500 shadow-sm" />
                    Merah
                  </button>
                </div>
              </div>

              {/* Reason */}
              <div>
                <label className="mb-2 block text-sm font-semibold text-stone-700 dark:text-zinc-300">Alasan</label>
                <Textarea
                  value={cardForm.reason}
                  onChange={(e) => setCardForm((prev) => ({ ...prev, reason: e.target.value }))}
                  placeholder="Jelaskan alasan pemberian kartu..."
                  rows={3}
                  className="min-h-[80px] rounded-xl border-2 border-stone-200 dark:border-zinc-700 text-base focus:border-esi-red focus:ring-esi-red/20"
                />
              </div>
            </div>
          )}

          <DialogFooter className="flex-col gap-2 sm:flex-row border-stone-200 dark:border-zinc-700 bg-stone-50 dark:bg-zinc-800/50">
            {confirmStep && (
              <Button
                variant="outline"
                onClick={() => setConfirmStep(false)}
                disabled={issuingCard}
                className="h-12 rounded-xl border-stone-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-stone-700 dark:text-zinc-300 hover:bg-stone-50 dark:hover:bg-zinc-800/50"
              >
                Kembali
              </Button>
            )}
            <Button
              variant="outline"
              onClick={() => {
                setCardDialogOpen(false)
                setCardMatch(null)
                setConfirmStep(false)
              }}
              disabled={issuingCard}
              className="h-12 rounded-xl border-stone-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-stone-700 dark:text-zinc-300 hover:bg-stone-50 dark:hover:bg-zinc-800/50"
            >
              Batal
            </Button>
            <Button
              onClick={handleIssueCard}
              disabled={issuingCard}
              className="h-12 rounded-xl text-white bg-esi-red hover:bg-esi-red/90 font-bold"
            >
              {issuingCard && <Spinner size={16} className="mr-1.5 animate-spin" />}
              {confirmStep ? 'Keluarkan Kartu' : 'Lanjut'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </RefereeLayout>
  )
}
