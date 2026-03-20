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
import { CalendarBlank } from '@phosphor-icons/react'
import { sanitizeUrl } from '@/lib/utils'
import type { BracketMatch } from '@/types'

interface MatchDetailSheetProps {
  match: BracketMatch | null
  open: boolean
  onClose: () => void
  isAdmin?: boolean
  onScoreUpdate?: (matchId: string, scoreA: number, scoreB: number) => void
  onSetLive?: (matchId: string) => void
  onComplete?: (matchId: string, winnerId: string) => void
  onScheduleUpdate?: () => void
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
}: MatchDetailSheetProps) {
  const [scoreInputMode, setScoreInputMode] = useState(false)
  const [scheduleInput, setScheduleInput] = useState('')
  const [scheduleSaving, setScheduleSaving] = useState(false)

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
        className="bg-white border-stone-200 overflow-y-auto sm:max-w-md w-full"
      >
        <SheetHeader className="border-b border-stone-200 pb-4">
          <SheetTitle className="text-stone-900 flex items-center gap-2">
            <span className="text-porjar-red font-mono text-sm">#{match.match_number}</span>
            <span>{roundLabel}</span>
          </SheetTitle>
          <SheetDescription className="text-stone-500">
            <StatusBadge status={match.status} />
            {sanitizeUrl(match.stream_url) && (
              <a
                href={sanitizeUrl(match.stream_url)}
                target="_blank"
                rel="noopener noreferrer"
                className="ml-2 text-xs text-blue-400 hover:text-blue-300 underline"
              >
                Watch Stream
              </a>
            )}
          </SheetDescription>
        </SheetHeader>

        <div className="flex-1 space-y-6 p-4">
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
              <h3 className="text-xs font-semibold uppercase tracking-wider text-stone-500 px-1">
                Jadwalkan Match
              </h3>
              <div className="rounded-xl border border-stone-200 bg-stone-50 p-3 space-y-3">
                {match.scheduled_at && (
                  <p className="text-xs text-stone-500">
                    Saat ini:{' '}
                    <span className="text-stone-700 font-medium">
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
                    className="flex-1 rounded-lg border border-stone-200 bg-white px-3 py-1.5 text-sm text-stone-700 focus:outline-none focus:ring-2 focus:ring-porjar-red/30 focus:border-porjar-red"
                  />
                  <Button
                    size="sm"
                    onClick={handleScheduleMatch}
                    disabled={scheduleSaving || !scheduleInput}
                    className="bg-porjar-red hover:bg-porjar-red-dark text-white text-xs"
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
            <MatchSubmissions matchId={match.id} isAdmin={isAdmin} />
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
