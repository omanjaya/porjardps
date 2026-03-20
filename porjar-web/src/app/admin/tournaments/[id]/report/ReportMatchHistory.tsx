'use client'

import { Badge } from '@/components/ui/badge'
import { Trophy } from '@phosphor-icons/react'

interface ReportMatch {
  id: string
  round: number
  match_number: number
  team_a_name: string | null
  team_b_name: string | null
  winner_name: string | null
  score_a: number | null
  score_b: number | null
  status: string
  completed_at: string | null
  bracket_position: string | null
}

interface ReportMatchHistoryProps {
  matches: ReportMatch[]
}

export function ReportMatchHistory({ matches }: ReportMatchHistoryProps) {
  if (matches.length === 0) return null

  return (
    <div className="print-section">
      <h3 className="mb-4 flex items-center gap-2 text-lg font-semibold text-slate-200">
        <Trophy className="h-5 w-5" />
        Hasil Pertandingan
      </h3>

      {/* Group by round */}
      {Array.from(new Set(matches.map((m) => m.round)))
        .sort((a, b) => a - b)
        .map((round) => {
          const roundMatches = matches.filter((m) => m.round === round)
          return (
            <div key={round} className="mb-4">
              <h4 className="mb-2 text-sm font-semibold text-slate-400">
                Round {round}
              </h4>
              <div className="grid gap-2 sm:grid-cols-2">
                {roundMatches.map((m) => (
                  <div
                    key={m.id}
                    className="flex items-center justify-between rounded-lg border border-slate-700 p-3"
                  >
                    <div className="flex-1">
                      <span
                        className={
                          m.winner_name === m.team_a_name
                            ? 'font-bold text-green-400'
                            : 'text-slate-300'
                        }
                      >
                        {m.team_a_name || 'TBD'}
                      </span>
                    </div>
                    <div className="mx-3 text-center">
                      {m.status === 'completed' ? (
                        <span className="font-mono text-sm font-bold text-slate-200">
                          {m.score_a ?? 0} - {m.score_b ?? 0}
                        </span>
                      ) : (
                        <Badge variant="outline" className="border-slate-600 text-xs text-slate-500">
                          {m.status === 'live' ? 'LIVE' : m.status === 'bye' ? 'BYE' : 'Pending'}
                        </Badge>
                      )}
                    </div>
                    <div className="flex-1 text-right">
                      <span
                        className={
                          m.winner_name === m.team_b_name
                            ? 'font-bold text-green-400'
                            : 'text-slate-300'
                        }
                      >
                        {m.team_b_name || 'TBD'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )
        })}
    </div>
  )
}
