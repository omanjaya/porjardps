'use client'

import Image from 'next/image'
import { Lightning } from '@phosphor-icons/react'
import type { BracketMatch } from '@/types'

interface LiveScoreCardProps {
  match: BracketMatch
  onClick?: (match: BracketMatch) => void
}

function TeamAvatar({ name, logoUrl }: { name: string; logoUrl?: string | null }) {
  if (logoUrl) {
    return (
      <div className="h-10 w-10 shrink-0 overflow-hidden rounded-full border border-white/10">
        <Image src={logoUrl} alt={name} width={40} height={40} className="h-full w-full object-cover" />
      </div>
    )
  }
  return (
    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/10">
      <Lightning size={18} className="text-white/50" weight="fill" />
    </div>
  )
}

export function LiveScoreCard({ match, onClick }: LiveScoreCardProps) {
  const isLive = match.status === 'live'
  const gamesPlayed = match.score_a + match.score_b
  const totalGames = match.best_of
  const scoreAWinning = match.score_a > match.score_b
  const scoreBWinning = match.score_b > match.score_a

  return (
    <button
      onClick={() => onClick?.(match)}
      className="group relative w-full overflow-hidden rounded-2xl text-left shadow-lg transition-all duration-300 hover:brightness-110 hover:shadow-[0_0_32px_rgba(196,30,42,0.4)]"
      style={{ background: '#C41E2A', boxShadow: '0 4px 24px rgba(196,30,42,0.3)' }}
    >
      {/* Top glow line */}
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/30 to-transparent" />

      <div className="relative z-10 p-5">
        {/* Header: BO info + LIVE badge */}
        <div className="mb-4 flex items-center justify-between">
          <span className="text-[10px] font-semibold uppercase tracking-widest text-white/30">
            BO{totalGames} · Game {gamesPlayed}/{totalGames}
          </span>

          {/* LIVE badge */}
          {isLive && (
            <div className="flex items-center gap-1.5 rounded-full border border-white/25 bg-black/20 px-2.5 py-1">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-white opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-white" />
              </span>
              <span className="text-[10px] font-black uppercase tracking-widest text-white">LIVE</span>
            </div>
          )}
        </div>

        {/* Score section: Team A | Score | Team B */}
        <div className="flex items-center gap-3">
          {/* Team A */}
          <div className="flex flex-1 flex-col items-center gap-2 text-center">
            <TeamAvatar name={match.team_a?.name ?? 'TBD'} logoUrl={match.team_a?.logo_url} />
            <span className={`line-clamp-2 text-xs font-bold leading-tight ${scoreAWinning ? 'text-white' : 'text-white/50'}`}>
              {match.team_a?.name ?? 'TBD'}
            </span>
          </div>

          {/* Center: Score */}
          <div className="flex shrink-0 flex-col items-center gap-1">
            <div className="flex items-center gap-2">
              <span className={`text-5xl font-black tabular-nums leading-none ${scoreAWinning ? 'text-white' : 'text-white/40'}`}>
                {match.score_a}
              </span>
              <span className="text-2xl font-light text-white/20">—</span>
              <span className={`text-5xl font-black tabular-nums leading-none ${scoreBWinning ? 'text-white' : 'text-white/40'}`}>
                {match.score_b}
              </span>
            </div>
            {/* Tournament name */}
            {match.tournament?.name && (
              <span className="mt-1 max-w-[120px] truncate text-center text-[9px] font-semibold uppercase tracking-wider text-white/20">
                {match.tournament.name}
              </span>
            )}
          </div>

          {/* Team B */}
          <div className="flex flex-1 flex-col items-center gap-2 text-center">
            <TeamAvatar name={match.team_b?.name ?? 'TBD'} logoUrl={match.team_b?.logo_url} />
            <span className={`line-clamp-2 text-xs font-bold leading-tight ${scoreBWinning ? 'text-white' : 'text-white/50'}`}>
              {match.team_b?.name ?? 'TBD'}
            </span>
          </div>
        </div>

        {/* Bottom: round info */}
        <div className="mt-4 flex items-center justify-center">
          <span className="text-[10px] font-semibold text-white/20">
            Round {match.round} · Match #{match.match_number}
          </span>
        </div>
      </div>

      {/* Bottom glow line */}
      <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />
    </button>
  )
}
