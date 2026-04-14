'use client'

import { useState } from 'react'
import Link from 'next/link'
import {
  Clock,
  CheckCircle,
  XCircle,
  Eye,
  CaretDown,
} from '@phosphor-icons/react'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { ShareButton } from '@/components/shared/ShareButton'
import type { BracketMatch } from '@/types'

export function MatchHistoryCard({
  match,
  myTeamId,
  myTeamName,
}: {
  match: BracketMatch
  myTeamId: string
  myTeamName?: string
}) {
  const [isExpanded, setIsExpanded] = useState(false)
  const isMyTeamA = match.team_a?.id === myTeamId
  const myTeam = isMyTeamA ? match.team_a : match.team_b
  const opponent = isMyTeamA ? match.team_b : match.team_a
  const myScore = isMyTeamA ? match.score_a : match.score_b
  const opponentScore = isMyTeamA ? match.score_b : match.score_a
  const didWin = match.winner?.id === myTeamId
  const isCompleted = match.status === 'completed'
  const teamName = myTeamName ?? myTeam?.name ?? 'Tim'

  return (
    <div className={`rounded-xl border bg-white dark:bg-zinc-900 shadow-sm transition-all hover:shadow-md border-l-4 ${
      isCompleted
        ? didWin
          ? 'border-green-200 dark:border-green-800/50 hover:border-green-300 dark:hover:border-green-700 border-l-green-500'
          : 'border-red-200 dark:border-red-800/50 hover:border-red-300 dark:hover:border-red-700 border-l-red-500'
        : 'border-esi-border hover:border-esi-red/30 border-l-blue-500'
    }`}>
      <div className="flex items-center gap-3 p-3 sm:p-4">
        <button
          type="button"
          onClick={() => setIsExpanded((v) => !v)}
          className="flex items-center gap-3 min-w-0 flex-1 text-left"
        >
          {/* Result indicator */}
          <div
            className={`flex h-9 w-9 sm:h-10 sm:w-10 shrink-0 items-center justify-center rounded-lg ${
              isCompleted
                ? didWin
                  ? 'bg-green-50 dark:bg-green-950/30'
                  : 'bg-red-50 dark:bg-red-950/30'
                : 'bg-blue-50 dark:bg-blue-950/30'
            }`}
          >
            {isCompleted ? (
              didWin ? (
                <CheckCircle size={20} weight="fill" className="text-green-600" />
              ) : (
                <XCircle size={20} weight="fill" className="text-red-600" />
              )
            ) : (
              <Clock size={20} className="text-blue-600" />
            )}
          </div>

          {/* Info */}
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-esi-text truncate">
              vs {opponent?.name ?? 'TBD'}
            </p>
            <div className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5 mt-0.5">
              <StatusBadge status={match.status} />
              <span className="text-[11px] text-esi-muted">
                R{match.round} M{match.match_number}
              </span>
            </div>
          </div>

          {/* Score */}
          {isCompleted && (
            <div className="shrink-0 text-right">
              <span className={`text-base sm:text-lg font-bold tabular-nums ${didWin ? 'text-green-600' : 'text-red-600'}`}>
                {myScore}-{opponentScore}
              </span>
            </div>
          )}

          <CaretDown
            size={14}
            className={`shrink-0 text-stone-400 dark:text-zinc-500 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}
          />
        </button>

        {/* Share button for completed matches */}
        {isCompleted && didWin && (
          <ShareButton
            title="Hasil Pertandingan ESI Denpasar"
            text={`\u{1F3C6} ${teamName} menang ${myScore}-${opponentScore} vs ${opponent?.name ?? 'TBD'} di ESI Denpasar 2026! #ESIDenpasar`}
          />
        )}
      </div>

      {/* Expanded detail */}
      <div
        className={`overflow-hidden transition-all duration-300 ease-in-out ${
          isExpanded ? 'max-h-40 opacity-100' : 'max-h-0 opacity-0'
        }`}
      >
        <div className="border-t border-esi-border px-3 sm:px-4 py-3 space-y-2">
          {/* Full score display */}
          {isCompleted && (
            <div className="flex items-center justify-center gap-3">
              <span className="text-xs font-medium text-esi-muted truncate max-w-[120px]">{myTeam?.name ?? 'Tim Kamu'}</span>
              <span className={`text-lg font-bold tabular-nums ${didWin ? 'text-green-600' : 'text-red-600'}`}>
                {myScore} - {opponentScore}
              </span>
              <span className="text-xs font-medium text-esi-muted truncate max-w-[120px]">{opponent?.name ?? 'TBD'}</span>
            </div>
          )}

          {/* Match date/time */}
          {match.scheduled_at && (
            <p className="text-center text-xs text-esi-muted">
              {new Date(match.scheduled_at).toLocaleString('id-ID', {
                weekday: 'long',
                day: 'numeric',
                month: 'long',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              })}
            </p>
          )}

          {/* Link to full detail */}
          <div className="text-center pt-1">
            <Link
              href={`/matches/${match.id}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-esi-red hover:underline"
              onClick={(e) => e.stopPropagation()}
            >
              <Eye size={14} />
              Lihat detail lengkap
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
