'use client'

import { useEffect, useState, useCallback, useMemo } from 'react'
import { useParams } from 'next/navigation'
import { toast } from 'sonner'
import { api } from '@/lib/api'
import { PublicLayout } from '@/components/layouts/PublicLayout'
import { PageHeader } from '@/components/shared/PageHeader'
import { BracketView } from '@/components/modules/bracket/BracketView'
import { MatchDetailSheet } from '@/components/modules/bracket/MatchDetailSheet'
import { EmbedCodeDialog } from '@/components/modules/bracket/EmbedCodeDialog'
import { MatchResultFeed } from '@/components/modules/bracket/MatchResultFeed'
import { CountdownTimer } from '@/components/shared/CountdownTimer'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { Skeleton } from '@/components/ui/skeleton'
import { useWebSocket } from '@/hooks/useWebSocket'
import {
  Trophy,
  Lightning,
  GameController,
  CalendarBlank,
  Users,
} from '@phosphor-icons/react'
import type { Tournament, BracketMatch, WSMessage } from '@/types'

export default function BracketPage() {
  const params = useParams<{ id: string }>()
  const [tournament, setTournament] = useState<Tournament | null>(null)
  const [matches, setMatches] = useState<BracketMatch[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedMatch, setSelectedMatch] = useState<BracketMatch | null>(null)
  const [sheetOpen, setSheetOpen] = useState(false)
  const [newMatchIds, setNewMatchIds] = useState<string[]>([])

  const loadData = useCallback(async () => {
    try {
      const result = await api.get<{ tournament: Tournament; matches: BracketMatch[] }>(
        `/tournaments/${params.id}/with-bracket`
      )
      setTournament(result.tournament)
      setMatches(result.matches ?? [])
    } catch {
      toast.error('Gagal memuat data bracket')
    } finally {
      setLoading(false)
    }
  }, [params.id])

  useEffect(() => {
    loadData()
  }, [loadData])

  // WebSocket real-time updates for live matches
  // bracket_advance changes structure → full refetch; score/status → patch in-place
  const handleWSMessage = useCallback(
    (msg: WSMessage) => {
      if (msg.type === 'bracket_advance') {
        const data = msg.data as Record<string, unknown> | undefined
        const teamName = data?.team_name as string | undefined
        if (teamName) {
          toast.success(`${teamName} lolos ke round berikutnya`, { duration: 4000 })
        } else {
          toast.success('Tim lolos ke round berikutnya', { duration: 4000 })
        }
        loadData()
        return
      }

      if (msg.type === 'match_complete') {
        const data = msg.data as Record<string, unknown> | undefined
        const winnerName = data?.winner_name as string | undefined
        const loserName = data?.loser_name as string | undefined
        const matchId = data?.match_id as string | undefined
        if (winnerName && loserName) {
          toast.success(`${winnerName} menang vs ${loserName}`, {
            duration: 6000,
            icon: '🏆',
          })
        } else if (winnerName) {
          toast.success(`${winnerName} menang!`, { duration: 6000, icon: '🏆' })
        }
        if (matchId) {
          setNewMatchIds((prev) => [matchId, ...prev].slice(0, 20))
          // Clear highlight after 4s
          setTimeout(() => {
            setNewMatchIds((prev) => prev.filter((id) => id !== matchId))
          }, 4000)
        }
        loadData()
        return
      }

      const data = msg.data as Record<string, unknown> | undefined
      const matchId = data?.match_id as string | undefined
      const matchNumber = data?.match_number as number | undefined
      const matchLabel = matchNumber != null ? `#${matchNumber}` : ''

      if (!matchId) {
        loadData()
        return
      }

      if (msg.type === 'score_update') {
        const scoreA = data?.score_a as number | undefined
        const scoreB = data?.score_b as number | undefined
        if (scoreA != null && scoreB != null) {
          toast(`Match ${matchLabel}: ${scoreA} - ${scoreB}`, { duration: 3000 })
        }
      }

      if (msg.type === 'match_status') {
        const status = data?.status as string | undefined
        if (status === 'live') {
          toast(`Match ${matchLabel} sedang berlangsung!`, { icon: '🔴' })
        } else if (status === 'completed') {
          const winnerName = data?.winner_name as string | undefined
          if (winnerName) {
            toast.success(`Match ${matchLabel} selesai · ${winnerName} menang`)
          } else {
            toast.success(`Match ${matchLabel} selesai`)
          }
        }
      }

      setMatches((prev) => {
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
    [loadData]
  )

  useWebSocket({
    channels: [`tournament:${params.id}`],
    messageTypes: ['score_update', 'match_status', 'match_complete', 'bracket_advance'],
    onMessage: handleWSMessage,
  })

  const maxRound = useMemo(
    () => matches.reduce((max, m) => Math.max(max, m.round), 0),
    [matches]
  )

  const liveMatchIds = useMemo(
    () => matches.filter((m) => m.status === 'live').map((m) => m.id),
    [matches]
  )

  // Next scheduled match (for countdown)
  const nextScheduledMatch = useMemo(() => {
    const now = Date.now()
    const scheduled = matches
      .filter((m) => m.scheduled_at && (m.status === 'pending' || m.status === 'scheduled'))
      .filter((m) => new Date(m.scheduled_at!).getTime() > now)
      .sort((a, b) => new Date(a.scheduled_at!).getTime() - new Date(b.scheduled_at!).getTime())
    return scheduled[0] ?? null
  }, [matches])

  // Live matches count
  const liveCount = liveMatchIds.length

  function handleMatchClick(matchId: string) {
    const match = matches.find((m) => m.id === matchId)
    if (match) {
      setSelectedMatch(match)
      setSheetOpen(true)
    }
  }

  if (loading) {
    return (
      <PublicLayout>
        <Skeleton className="h-10 w-64 bg-stone-100" />
        <Skeleton className="mt-4 h-24 w-full bg-stone-100" />
        <Skeleton className="mt-4 h-96 w-full bg-stone-100" />
      </PublicLayout>
    )
  }

  return (
    <PublicLayout>
      <PageHeader
        title={tournament?.name ?? 'Bracket'}
        description={
          tournament
            ? `Format: ${tournament.format.replace(/_/g, ' ')} | Best of ${tournament.best_of}`
            : undefined
        }
        breadcrumbs={[
          { label: 'Turnamen', href: '/tournaments' },
          { label: tournament?.name ?? '', href: `/tournaments/${params.id}` },
          { label: 'Bracket' },
        ]}
      />

      {/* Tournament info header */}
      {tournament && (
        <div className="mb-6 rounded-xl border border-stone-200 bg-white p-4 shadow-sm">
          <div className="flex flex-wrap items-center gap-4">
            {/* Game & format info */}
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-red-50 border border-porjar-red/20">
                <GameController size={20} className="text-porjar-red" />
              </div>
              <div>
                <span className="text-sm font-semibold text-stone-900 block">
                  {tournament.game?.name ?? 'Game'}
                </span>
                <span className="text-xs text-stone-500">
                  {tournament.format?.replace(/_/g, ' ')} &middot; BO{tournament.best_of}
                </span>
              </div>
            </div>

            <div className="hidden sm:block h-8 w-px bg-stone-200" />

            {/* Status */}
            <StatusBadge status={tournament.status} />

            {/* Teams count */}
            <div className="flex items-center gap-1.5 text-xs text-stone-500">
              <Users size={14} />
              <span>{tournament.team_count} tim</span>
            </div>

            {/* Live indicator */}
            {liveCount > 0 && (
              <>
                <div className="hidden sm:block h-8 w-px bg-stone-200" />
                <div className="flex items-center gap-1.5 text-xs text-porjar-red">
                  <Lightning size={14} weight="fill" className="animate-pulse" />
                  <span className="font-semibold">{liveCount} match sedang berlangsung</span>
                </div>
              </>
            )}

            {/* Countdown to next match */}
            {nextScheduledMatch && liveCount === 0 && (
              <>
                <div className="hidden sm:block h-8 w-px bg-stone-200" />
                <div className="flex items-center gap-2">
                  <CalendarBlank size={14} className="text-stone-400" />
                  <CountdownTimer
                    targetDate={nextScheduledMatch.scheduled_at!}
                    label="Match berikutnya"
                    size="sm"
                  />
                </div>
              </>
            )}

            {/* Embed button */}
            {matches.length > 0 && (
              <>
                <div className="hidden sm:block h-8 w-px bg-stone-200" />
                <EmbedCodeDialog
                  tournamentId={params.id}
                  tournamentName={tournament.name}
                />
              </>
            )}
          </div>
        </div>
      )}

      {/* Live results feed */}
      <MatchResultFeed matches={matches} newMatchIds={newMatchIds} />

      {/* Bracket */}
      {matches.length > 0 ? (
        <BracketView
          matches={matches}
          rounds={maxRound}
          liveMatchIds={liveMatchIds}
          onMatchClick={handleMatchClick}
        />
      ) : (
        <div className="flex flex-col items-center justify-center gap-4 rounded-xl border border-stone-200 bg-white py-20 shadow-sm">
          <Trophy size={48} className="text-stone-300" />
          <div className="text-center">
            <p className="text-stone-600 font-medium">Bracket belum tersedia</p>
            <p className="text-sm text-stone-400 mt-1">
              Bracket akan ditampilkan setelah panitia melakukan pengundian.
            </p>
          </div>
        </div>
      )}

      {/* Match Detail Sheet (non-admin) */}
      <MatchDetailSheet
        match={selectedMatch}
        open={sheetOpen}
        onClose={() => {
          setSheetOpen(false)
          setSelectedMatch(null)
        }}
        isAdmin={false}
      />
    </PublicLayout>
  )
}
