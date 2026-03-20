'use client'

import React, { useState } from 'react'
import { cn } from '@/lib/utils'
import { resolveMediaUrl } from '@/lib/api'
import { ArrowBendRightDown, Check, Clock } from '@phosphor-icons/react'
import type { BracketMatch, TeamSummary } from '@/types'

function TeamLogo({
  team,
  isEmpty,
  isByeSlot,
}: {
  team: TeamSummary | null
  isEmpty: boolean
  isByeSlot: boolean
}) {
  const [imgError, setImgError] = useState(false)
  const src = resolveMediaUrl(team?.school_logo_url ?? team?.logo_url)

  if (src && !imgError) {
    return (
      <img
        src={src}
        alt={team!.name}
        className="h-5 w-5 rounded object-contain flex-shrink-0 bg-white"
        onError={() => setImgError(true)}
      />
    )
  }

  return (
    <div
      className={cn(
        'h-5 w-5 rounded flex-shrink-0 flex items-center justify-center text-[8px] font-bold',
        isEmpty || isByeSlot ? 'bg-stone-100 text-stone-300' : 'bg-stone-200 text-stone-500'
      )}
    >
      {team ? team.name.charAt(0).toUpperCase() : ''}
    </div>
  )
}

interface MatchNodeProps {
  match: BracketMatch
  isLive?: boolean
  isHighlighted?: boolean
  highlightTeamId?: string
  roundLabel?: string
  loserFromNumbers?: number[]
  onClick?: (matchId: string) => void
}

const TeamRow = React.memo(function TeamRow({
  team,
  score,
  isWinner,
  isLive,
  isHighlighted,
  isPending,
  isBye,
  position,
}: {
  team: TeamSummary | null
  score: number
  isWinner: boolean
  isLive: boolean
  isHighlighted: boolean
  isPending: boolean
  isBye: boolean
  position: 'top' | 'bottom'
}) {
  const isEmpty = !team
  const isByeSlot = isBye && position === 'bottom'

  return (
    <div
      className={cn(
        'flex items-center justify-between gap-1 px-2 py-1 transition-colors duration-150',
        position === 'top' ? 'rounded-t' : '',
        position === 'bottom' ? '' : 'border-b border-stone-200/60',
        isWinner && 'bg-emerald-50/80',
        isLive && !isWinner && 'bg-white',
        isHighlighted && 'bg-sky-50/80',
        isByeSlot && 'bg-stone-50/60',
        isEmpty && !isByeSlot && 'opacity-50'
      )}
      style={{
        borderLeft: isWinner
          ? '3px solid rgba(16, 185, 129, 0.7)'
          : isLive
            ? '3px solid rgba(196, 30, 42, 0.5)'
            : '3px solid transparent',
      }}
    >
      {/* Name */}
      <div className="flex items-center gap-1.5 min-w-0 flex-1">
        {/* School logo → team logo → initial fallback (with error handling) */}
        <TeamLogo team={team} isEmpty={isEmpty} isByeSlot={isByeSlot} />
        <span
          title={team?.name ?? (isByeSlot ? 'BYE' : 'TBD')}
          className={cn(
            'truncate text-[11px] font-medium leading-tight',
            isWinner ? 'text-stone-900 font-semibold' : 'text-stone-700',
            isEmpty && !isByeSlot && 'text-stone-400 italic',
            isByeSlot && 'text-stone-300 italic'
          )}
        >
          {team?.name ?? (isByeSlot ? 'BYE' : 'TBD')}
        </span>
      </div>

      {/* Score + Winner check */}
      <div className="flex items-center gap-1.5 flex-shrink-0">
        <span
          className={cn(
            'text-sm font-bold tabular-nums min-w-[16px] text-right',
            isWinner ? 'text-emerald-700' : 'text-stone-500',
            isPending && 'text-stone-300'
          )}
        >
          {isPending ? '-' : score}
        </span>
        {isWinner && (
          <Check size={12} weight="bold" className="text-emerald-500 flex-shrink-0" />
        )}
        {!isWinner && <span className="w-3 flex-shrink-0" />}
      </div>
    </div>
  )
})

export const MatchNode = React.memo(function MatchNode({
  match,
  isLive = false,
  isHighlighted = false,
  highlightTeamId,
  roundLabel,
  loserFromNumbers,
  onClick,
}: MatchNodeProps) {
  const isPending = match.status === 'pending' || match.status === 'scheduled'
  const isCompleted = match.status === 'completed'
  const isBye = match.status === 'bye'

  const teamAHighlighted = highlightTeamId != null && match.team_a?.id === highlightTeamId
  const teamBHighlighted = highlightTeamId != null && match.team_b?.id === highlightTeamId

  const scheduledTime = match.scheduled_at
    ? new Date(match.scheduled_at).toLocaleTimeString('id-ID', {
        hour: '2-digit',
        minute: '2-digit',
      })
    : null

  const bestOfLabel = match.best_of > 1 ? `BO${match.best_of}` : null

  const infoSegments = [bestOfLabel, roundLabel, scheduledTime].filter(Boolean)

  return (
    <div className="relative">
      {/* Loser drop label — floats above the card, outside so card height stays fixed */}
      {loserFromNumbers && loserFromNumbers.length > 0 && (
        <div className="absolute -top-5 left-0 flex items-center gap-1 pointer-events-none">
          <ArrowBendRightDown size={9} weight="bold" className="text-amber-500 flex-shrink-0" />
          <span className="text-[9px] text-amber-600 font-medium whitespace-nowrap">
            Loser dari #{loserFromNumbers.join(', #')}
          </span>
        </div>
      )}

    <button
      onClick={() => onClick?.(match.id)}
      className={cn(
        'group relative w-[200px] rounded-md border text-left transition-all duration-200',
        'bg-white shadow-sm',
        'hover:scale-[1.02] hover:shadow-md hover:z-10',
        isPending && 'border-stone-200 border-dashed',
        isLive && 'border-red-600/50 shadow-[0_0_12px_rgba(196,30,42,0.10)]',
        isCompleted && 'border-emerald-400/40',
        isBye && 'border-stone-200/40 opacity-50 bg-stone-50',
        isHighlighted && 'ring-2 ring-sky-400/40 shadow-[0_0_12px_rgba(56,189,248,0.12)]'
      )}
      style={isLive ? { animation: 'live-glow 2s ease-in-out infinite' } : undefined}
    >
      {/* Match number badge */}
      <div className="absolute -top-2 -right-2 z-10 flex h-5 min-w-5 items-center justify-center rounded-full bg-stone-100 px-1.5 text-[9px] font-bold text-stone-500 border border-stone-200">
        #{match.match_number}
      </div>

      {/* Team rows */}
      <div className="overflow-hidden rounded-t-lg">
        <TeamRow
          team={match.team_a}
          score={match.score_a}
          isWinner={isCompleted && match.winner?.id === match.team_a?.id}
          isLive={isLive}
          isHighlighted={teamAHighlighted}
          isPending={isPending}
          isBye={isBye}
          position="top"
        />
        <TeamRow
          team={match.team_b}
          score={match.score_b}
          isWinner={isCompleted && match.winner?.id === match.team_b?.id}
          isLive={isLive}
          isHighlighted={teamBHighlighted}
          isPending={isPending}
          isBye={isBye && !match.team_b}
          position="bottom"
        />
      </div>

      {/* Info bar */}
      {infoSegments.length > 0 && (
        <div className="flex items-center justify-center gap-1.5 border-t border-stone-100 px-2.5 py-1 rounded-b-lg bg-stone-50/60">
          {scheduledTime && <Clock size={10} className="text-stone-400" />}
          <span className="text-[10px] text-stone-400 tracking-wide">
            {infoSegments.join(' \u00B7 ')}
          </span>
        </div>
      )}
    </button>
    </div>
  )
})
