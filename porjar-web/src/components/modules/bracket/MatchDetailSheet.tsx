'use client'

import { useState, useMemo, useEffect } from 'react'
import { toast } from 'sonner'
import { api } from '@/lib/api'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { MatchPrediction } from '@/components/modules/match/MatchPrediction'
import { MatchScoreDisplay } from './MatchScoreDisplay'
import { GameDetailsList } from './GameDetailsList'
import { MatchInfoPanel } from './MatchInfoPanel'
import { AdminScoreInput } from './AdminScoreInput'
import { AdminActions } from './AdminActions'
import { MatchSubmissions } from './MatchSubmissions'
import { CheckInButton } from '@/components/shared/CheckInButton'
import { CalendarBlank, Warning, ShieldWarning, Printer, VideoCamera, ArrowSquareOut } from '@phosphor-icons/react'
import Link from 'next/link'
import { sanitizeUrl } from '@/lib/utils'
import type { BracketMatch } from '@/types'
import type { MatchCard } from '@/types/referee'

function getEmbedUrl(url: string): string | null {
  // YouTube
  const yt = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([A-Za-z0-9_-]{11})/)
  if (yt) return `https://www.youtube.com/embed/${yt[1]}`
  // Twitch
  const tw = url.match(/twitch\.tv\/([^/?#]+)/)
  if (tw) {
    const parent = typeof window !== 'undefined' ? window.location.hostname : 'esidenpasar.com'
    return `https://player.twitch.tv/?channel=${tw[1]}&parent=${parent}`
  }
  return null
}

interface MatchDetailSheetProps {
  match: BracketMatch | null
  open: boolean
  onClose: () => void
  isAdmin?: boolean
  onScoreUpdate?: (matchId: string, scoreA: number, scoreB: number) => void
  onSetLive?: (matchId: string) => void
  onComplete?: (matchId: string, winnerId: string) => void
  onScheduleUpdate?: () => void
  onSubmissionVerified?: () => void
  /**
   * Team IDs for which the current viewer is captain.
   * When a match's team_a or team_b matches one of these, a CheckInButton is shown.
   */
  captainTeamIds?: string[]
}

export function MatchDetailSheet({
  match,
  open,
  onClose,
  isAdmin = false,
  onScoreUpdate,
  onSetLive,
  onComplete,
  onScheduleUpdate,
  onSubmissionVerified,
  captainTeamIds,
}: MatchDetailSheetProps) {
  const myCaptainSide: 'a' | 'b' | null = (() => {
    if (!captainTeamIds?.length || !match) return null
    if (match.team_a && captainTeamIds.includes(match.team_a.id)) return 'a'
    if (match.team_b && captainTeamIds.includes(match.team_b.id)) return 'b'
    return null
  })()
  const [scoreInputMode, setScoreInputMode] = useState(false)
  const [scheduleInput, setScheduleInput] = useState('')
  const [scheduleSaving, setScheduleSaving] = useState(false)
  const [matchCards, setMatchCards] = useState<MatchCard[]>([])

  // Fetch cards for this match
  useEffect(() => {
    if (!match?.id) { setMatchCards([]); return }
    api.get<MatchCard[]>(`/matches/${match.id}/cards`).then(setMatchCards).catch(() => setMatchCards([]))
  }, [match?.id])

  // Derived states
  const isLive = match?.status === 'live'
  const isCompleted = match?.status === 'completed'
  const isPending = match?.status === 'pending' || match?.status === 'scheduled'

  // Round label
  const roundLabel = useMemo(() => {
    if (!match) return ''
    return `Round ${match.round} · Match ${match.match_number}`
  }, [match])

  // Series score (BO wins)
  const seriesScore = useMemo(() => {
    if (!match?.games?.length) return { a: match?.score_a ?? 0, b: match?.score_b ?? 0 }
    const a = match.games.filter((g) => g.winner_id === match.team_a?.id).length
    const b = match.games.filter((g) => g.winner_id === match.team_b?.id).length
    return { a, b }
  }, [match])

  // Duration
  const totalDuration = useMemo(() => {
    if (!match?.games?.length) return null
    const total = match.games.reduce((sum, g) => sum + (g.duration_minutes ?? 0), 0)
    return total > 0 ? total : null
  }, [match])

  // Is series decided (majority of best_of reached)
  const isSeriesDecided = useMemo(() => {
    if (!match) return false
    const winsNeeded = Math.ceil(match.best_of / 2)
    return seriesScore.a >= winsNeeded || seriesScore.b >= winsNeeded
  }, [match, seriesScore])

  // Initialize schedule input from match data
  useEffect(() => {
    if (match?.scheduled_at) {
      // Convert to local datetime-local format
      const d = new Date(match.scheduled_at)
      const offset = d.getTimezoneOffset()
      const local = new Date(d.getTime() - offset * 60000)
      setScheduleInput(local.toISOString().slice(0, 16))
    } else {
      setScheduleInput('')
    }
  }, [match?.id, match?.scheduled_at])

  async function handleScheduleMatch() {
    if (!match || !scheduleInput) return
    setScheduleSaving(true)
    try {
      // Convert datetime-local to RFC3339 with timezone offset
      const dt = new Date(scheduleInput)
      if (isNaN(dt.getTime())) { toast.error('Waktu tidak valid'); setScheduleSaving(false); return }
      const rfc3339 = dt.toISOString().replace('Z', '+00:00')
      await api.put(`/admin/matches/${match.id}/schedule`, { scheduled_at: rfc3339 })
      toast.success('Jadwal match berhasil disimpan')
      onScheduleUpdate?.()
    } catch {
      toast.error('Gagal menyimpan jadwal')
    } finally {
      setScheduleSaving(false)
    }
  }

  if (!match) return null

  return (
    <Sheet open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <SheetContent
        side="right"
        className="bg-white dark:bg-zinc-900 border-stone-200 dark:border-zinc-700 overflow-y-auto sm:max-w-md w-full"
      >
        <SheetHeader className="border-b border-stone-200 dark:border-zinc-700 pb-4">
          <SheetTitle className="text-stone-900 dark:text-zinc-100 flex items-center gap-2">
            <span className="text-esi-red font-mono text-sm">#{match.match_number}</span>
            <span>{roundLabel}</span>
          </SheetTitle>
          <SheetDescription className="text-stone-500 dark:text-zinc-400 sr-only">
            Detail pertandingan
          </SheetDescription>
          <div className="text-stone-500 dark:text-zinc-400">
            <StatusBadge status={match.status} />
          </div>
        </SheetHeader>

        <div className="flex-1 space-y-6 p-4">
          {/* Live Stream */}
          {match.stream_url && sanitizeUrl(match.stream_url) && (
            <div className="rounded-xl overflow-hidden border border-stone-200 dark:border-zinc-700">
              <div className="flex items-center gap-2 bg-esi-red/10 text-esi-red font-semibold text-sm px-3 py-2">
                <VideoCamera size={14} weight="fill" /> Live Stream
              </div>
              {getEmbedUrl(match.stream_url) ? (
                <div className="relative aspect-video bg-black">
                  <iframe
                    src={getEmbedUrl(match.stream_url)!}
                    className="absolute inset-0 w-full h-full"
                    allowFullScreen
                    sandbox="allow-scripts allow-same-origin allow-presentation"
                  />
                </div>
              ) : (
                <a
                  href={sanitizeUrl(match.stream_url)!}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 py-8 bg-stone-100 dark:bg-zinc-800 text-sm font-semibold text-stone-700 dark:text-zinc-300 hover:bg-stone-200 dark:hover:bg-zinc-700 transition"
                >
                  <ArrowSquareOut size={16} /> Buka Stream
                </a>
              )}
            </div>
          )}

          {/* Teams & Big Score */}
          <MatchScoreDisplay
            match={match}
            seriesScore={seriesScore}
            isLive={isLive}
            isCompleted={isCompleted}
          />

          {/* Game Details & Hero Bans */}
          <GameDetailsList match={match} />

          {/* Match Info */}
          <MatchInfoPanel match={match} totalDuration={totalDuration} />

          {/* Captain check-in */}
          {myCaptainSide && (match.status === 'scheduled' || match.status === 'pending' || match.status === 'live') && (
            <div className="space-y-2">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-stone-500 dark:text-zinc-400 px-1">
                Check-in Kapten
              </h3>
              <CheckInButton
                matchId={match.id}
                teamSide={myCaptainSide}
                matchStatus={match.status}
                scheduledAt={match.scheduled_at}
              />
            </div>
          )}

          {/* Print Match Card */}
          <Link
            href={`/matches/${match.id}/card`}
            target="_blank"
            className="flex items-center justify-center gap-2 rounded-lg border border-stone-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-3 py-2 text-xs font-semibold text-stone-700 dark:text-zinc-300 hover:bg-stone-50 dark:hover:bg-zinc-700/50 transition"
          >
            <Printer size={14} />
            Cetak Kartu Pertandingan
          </Link>

          {/* Match Prediction */}
          {match.team_a && match.team_b && (
            <MatchPrediction
              matchId={match.id}
              teamA={match.team_a}
              teamB={match.team_b}
              matchStatus={match.status}
              winnerId={match.winner?.id}
            />
          )}

          {/* Schedule Input (Admin) — only for pending/scheduled */}
          {isAdmin && isPending && (
            <div className="space-y-2">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-stone-500 dark:text-zinc-400 px-1">
                Jadwalkan Match
              </h3>
              <div className="rounded-xl border border-stone-200 dark:border-zinc-700 bg-stone-50 dark:bg-zinc-800/50 p-3 space-y-3">
                {match.scheduled_at && (
                  <p className="text-xs text-stone-500 dark:text-zinc-400">
                    Saat ini:{' '}
                    <span className="text-stone-700 dark:text-zinc-300 font-medium">
                      {new Date(match.scheduled_at).toLocaleDateString('id-ID', {
                        day: 'numeric',
                        month: 'long',
                        year: 'numeric',
                      })}{' '}
                      {new Date(match.scheduled_at).toLocaleTimeString('id-ID', {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </p>
                )}
                <div className="flex items-center gap-2">
                  <input
                    type="datetime-local"
                    value={scheduleInput}
                    onChange={(e) => setScheduleInput(e.target.value)}
                    className="flex-1 rounded-lg border border-stone-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-3 py-1.5 text-sm text-stone-700 dark:text-zinc-300 focus:outline-none focus:ring-2 focus:ring-esi-red/30 focus:border-esi-red"
                  />
                  <Button
                    size="sm"
                    onClick={handleScheduleMatch}
                    disabled={scheduleSaving || !scheduleInput}
                    className="bg-esi-red hover:bg-esi-red-dark text-white text-xs"
                  >
                    <CalendarBlank size={14} className="mr-1" />
                    {scheduleSaving ? 'Menyimpan...' : 'Jadwalkan'}
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* Score Input Mode (Admin) */}
          {isAdmin && scoreInputMode && onScoreUpdate && (
            <AdminScoreInput
              match={match}
              onScoreUpdate={onScoreUpdate}
              onCancel={() => setScoreInputMode(false)}
            />
          )}

          {/* Submissions — admin sees all, public sees approved only on completed matches */}
          {(isAdmin || isCompleted) && (
            <MatchSubmissions matchId={match.id} isAdmin={isAdmin} onVerified={onSubmissionVerified} />
          )}

          {/* Match Cards */}
          {matchCards.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-stone-500 dark:text-zinc-400 px-1 flex items-center gap-1.5">
                <ShieldWarning size={14} />
                Kartu ({matchCards.length})
              </h3>
              <div className="space-y-1.5">
                {matchCards.map((card) => {
                  const isYellow = card.card_type === 'yellow'
                  return (
                    <div
                      key={card.id}
                      className={`rounded-lg border-l-[3px] p-2.5 ${
                        card.is_revoked
                          ? 'border-l-stone-300 dark:border-l-zinc-600 bg-stone-50 dark:bg-zinc-800/50 opacity-60'
                          : isYellow
                          ? 'border-l-yellow-400 bg-yellow-50 dark:bg-yellow-950/20'
                          : 'border-l-red-500 bg-red-50 dark:bg-red-950/20'
                      }`}
                    >
                      <div className="flex items-start gap-2">
                        <Warning
                          size={14}
                          weight="fill"
                          className={`mt-0.5 shrink-0 ${
                            card.is_revoked
                              ? 'text-stone-400 dark:text-zinc-500'
                              : isYellow
                              ? 'text-yellow-600 dark:text-yellow-400'
                              : 'text-red-600 dark:text-red-400'
                          }`}
                        />
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-1.5">
                            <span
                              className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold uppercase ${
                                isYellow
                                  ? 'bg-yellow-200 dark:bg-yellow-900/50 text-yellow-800 dark:text-yellow-300'
                                  : 'bg-red-200 dark:bg-red-900/50 text-red-800 dark:text-red-300'
                              }`}
                            >
                              {isYellow ? 'Kuning' : 'Merah'}
                            </span>
                            <span className="text-[11px] font-semibold text-esi-text truncate">
                              {card.team_name}
                            </span>
                            {!card.is_revoked && (
                              <span className={`text-[10px] font-bold ${isYellow ? 'text-yellow-700 dark:text-yellow-400' : 'text-red-700 dark:text-red-400'}`}>
                                -{card.point_deduction}p
                              </span>
                            )}
                            {card.is_revoked && (
                              <span className="rounded-full bg-stone-200 dark:bg-zinc-700 px-1.5 py-0.5 text-[9px] font-semibold text-stone-500 dark:text-zinc-400">
                                Dicabut
                              </span>
                            )}
                          </div>
                          <p className={`mt-0.5 text-xs ${card.is_revoked ? 'line-through text-stone-400 dark:text-zinc-500' : 'text-stone-600 dark:text-zinc-400'}`}>
                            {card.reason}
                          </p>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Admin Actions */}
          {isAdmin && !scoreInputMode && (
            <AdminActions
              match={match}
              isLive={isLive}
              isCompleted={isCompleted}
              isPending={isPending}
              isSeriesDecided={isSeriesDecided}
              onSetLive={onSetLive}
              onComplete={onComplete}
              onStartScoreInput={() => setScoreInputMode(true)}
            />
          )}
        </div>
      </SheetContent>
    </Sheet>
  )
}
