'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { useParams } from 'next/navigation'
import { api } from '@/lib/api'
import { useWebSocket } from '@/hooks/useWebSocket'
import { PublicLayout } from '@/components/layouts/PublicLayout'
import { PageHeader } from '@/components/shared/PageHeader'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { Skeleton } from '@/components/ui/skeleton'
import { Clock, Timer, User, Trophy } from '@phosphor-icons/react'
import { cn, sanitizeUrl } from '@/lib/utils'
import { MatchRecap } from '@/components/modules/match/MatchRecap'
import { MatchPrediction } from '@/components/modules/match/MatchPrediction'
import { MediaGallery } from '@/components/modules/media/MediaGallery'
import type { BracketMatch, WSMessage } from '@/types'
import { usePageAnimation } from '@/hooks/usePageAnimation'

export default function MatchDetailPage() {
  const params = useParams<{ id: string }>()
  const [match, setMatch] = useState<BracketMatch | null>(null)
  const [loading, setLoading] = useState(true)
  const containerRef = useRef<HTMLDivElement>(null)
  usePageAnimation(containerRef, [loading])

  useEffect(() => {
    async function load() {
      try {
        const data = await api.get<BracketMatch>(`/matches/${params.id}`)
        setMatch(data)
      } catch (err) {
        console.error('Gagal memuat detail match:', err)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [params.id])

  const handleWSMessage = useCallback(
    (msg: WSMessage) => {
      const update = msg.data as BracketMatch
      if (update.id === params.id) {
        setMatch(update)
      }
    },
    [params.id]
  )

  useWebSocket({
    channels: [`match:${params.id}`],
    onMessage: handleWSMessage,
    messageTypes: ['score_update', 'match_status'],
    autoConnect: match?.status === 'live',
  })

  if (loading) {
    return (
      <PublicLayout>
        <div className="space-y-4">
          <Skeleton className="h-10 w-64 bg-stone-100" />
          <Skeleton className="h-64 w-full bg-stone-100" />
        </div>
      </PublicLayout>
    )
  }

  if (!match) {
    return (
      <PublicLayout>
        <div className="py-16 text-center text-stone-500">Pertandingan tidak ditemukan.</div>
      </PublicLayout>
    )
  }

  const isLive = match.status === 'live'

  return (
    <PublicLayout>
      <PageHeader
        title="Detail Pertandingan"
        breadcrumbs={[
          ...(match.tournament_id
            ? [
                {
                  label: match.tournament?.name ?? 'Turnamen',
                  href: `/tournaments/${match.tournament_id}/bracket`,
                },
              ]
            : [{ label: 'Pertandingan', href: '/matches/live' }]),
          { label: `${match.team_a?.name ?? 'TBD'} vs ${match.team_b?.name ?? 'TBD'}` },
        ]}
      />

      <div ref={containerRef}>
      {/* Use MatchRecap for completed matches */}
      {match.status === 'completed' && match.winner ? (
        <MatchRecap match={match} />
      ) : (
        <>
          {/* Main score card */}
          <div
            className={cn(
              'anim-hero rounded-xl border bg-white p-6 shadow-sm',
              isLive ? 'border-red-300 shadow-[0_0_25px_rgba(196,30,42,0.08)]' : 'border-stone-200'
            )}
          >
            {/* Red top accent */}
            {isLive && <div className="absolute inset-x-0 top-0 h-1 bg-porjar-red rounded-t-xl" />}

            {/* Status row */}
            <div className="mb-6 flex items-center justify-center gap-3">
              <StatusBadge status={match.status} />
              <span className="text-xs text-stone-400">
                BO{match.best_of} &middot; Round {match.round}
              </span>
            </div>

            {/* Teams + Score */}
            <div className="flex items-center justify-center gap-8">
              {/* Team A */}
              <div className="flex flex-col items-center gap-2">
                <div className="flex h-16 w-16 items-center justify-center rounded-xl bg-stone-50 border border-stone-200">
                  <Trophy size={28} className="text-stone-400" />
                </div>
                <span className="text-lg font-bold text-stone-900">
                  {match.team_a?.name ?? 'TBD'}
                </span>
              </div>

              {/* Score */}
              <div className="flex items-baseline gap-4">
                <span
                  className={cn(
                    'text-4xl font-black tabular-nums',
                    match.score_a > match.score_b ? 'text-porjar-red' : 'text-stone-400'
                  )}
                >
                  {match.score_a}
                </span>
                <span className="text-lg font-bold text-stone-300">:</span>
                <span
                  className={cn(
                    'text-4xl font-black tabular-nums',
                    match.score_b > match.score_a ? 'text-porjar-red' : 'text-stone-400'
                  )}
                >
                  {match.score_b}
                </span>
              </div>

              {/* Team B */}
              <div className="flex flex-col items-center gap-2">
                <div className="flex h-16 w-16 items-center justify-center rounded-xl bg-stone-50 border border-stone-200">
                  <Trophy size={28} className="text-stone-400" />
                </div>
                <span className="text-lg font-bold text-stone-900">
                  {match.team_b?.name ?? 'TBD'}
                </span>
              </div>
            </div>

            {/* Meta info */}
            <div className="mt-6 flex items-center justify-center gap-6 text-xs text-stone-500">
              {match.scheduled_at && (
                <div className="flex items-center gap-1">
                  <Clock size={12} />
                  <span>
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
                </div>
              )}
              {sanitizeUrl(match.stream_url) && (
                <a
                  href={sanitizeUrl(match.stream_url)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-porjar-red hover:text-porjar-red-dark underline"
                >
                  Tonton Live
                </a>
              )}
            </div>
          </div>

          {/* Game-by-game breakdown */}
          {match.games && match.games.length > 0 && (
            <div className="anim-section mt-6 space-y-3">
              <h2 className="text-sm font-semibold uppercase tracking-wider text-stone-500">
                Detail Per Game
              </h2>
              <div className="space-y-2">
                {match.games.map((game) => (
                  <div
                    key={game.game_number}
                    className="anim-list-item flex items-center gap-4 rounded-xl border border-stone-200 bg-white px-4 py-3 shadow-sm"
                  >
                    <span className="w-20 text-xs font-semibold uppercase tracking-wider text-stone-400">
                      Game {game.game_number}
                    </span>

                    <div className="flex flex-1 items-center justify-center gap-4">
                      <span
                        className={cn(
                          'text-sm font-bold tabular-nums',
                          game.score_a > game.score_b ? 'text-green-600' : 'text-stone-400'
                        )}
                      >
                        {game.score_a}
                      </span>
                      <span className="text-[10px] text-stone-300">-</span>
                      <span
                        className={cn(
                          'text-sm font-bold tabular-nums',
                          game.score_b > game.score_a ? 'text-green-600' : 'text-stone-400'
                        )}
                      >
                        {game.score_b}
                      </span>
                    </div>

                    <div className="flex items-center gap-4 text-xs text-stone-500">
                      {game.duration_minutes && (
                        <div className="flex items-center gap-1">
                          <Timer size={12} />
                          <span>{game.duration_minutes}m</span>
                        </div>
                      )}
                      {game.mvp && (
                        <div className="flex items-center gap-1">
                          <User size={12} />
                          <span className="text-porjar-red font-medium">MVP: {game.mvp}</span>
                        </div>
                      )}
                      {game.map_name && (
                        <span className="text-stone-400">{game.map_name}</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {/* Prediction Section */}
      {match.team_a && match.team_b && (
        <div className="anim-section mt-6">
          <MatchPrediction
            matchId={match.id}
            teamA={match.team_a}
            teamB={match.team_b}
            matchStatus={match.status}
            winnerId={match.winner?.id}
          />
        </div>
      )}

      {/* Galeri Section */}
      <div className="anim-section mt-8">
        <h2 className="mb-4 text-lg font-bold text-stone-900">Galeri</h2>
        <MediaGallery entityType="match" entityId={params.id} />
      </div>
      </div>
    </PublicLayout>
  )
}
