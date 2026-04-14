'use client'

import { Trophy } from '@phosphor-icons/react'
import type { BracketMatch } from '@/types'
import { MatchHistoryCard } from './MatchHistoryCard'

export function MatchHistory({
  matches,
  myTeamId,
}: {
  matches: BracketMatch[]
  myTeamId: string
}) {
  if (matches.length === 0) return null

  return (
    <div className="space-y-3">
      <h2 className="flex items-center gap-2 text-lg font-bold text-esi-text">
        <Trophy size={20} weight="bold" />
        Riwayat Pertandingan
      </h2>
      <div className="space-y-2">
        {matches.map((match) => (
          <MatchHistoryCard key={match.id} match={match} myTeamId={myTeamId} />
        ))}
      </div>
    </div>
  )
}
