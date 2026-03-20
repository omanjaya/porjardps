'use client'

import { UsersThree } from '@phosphor-icons/react'

interface PlayerStat {
  player_name: string
  team_name: string
  value: number
}

interface TopPlayersSection {
  most_mvps: PlayerStat[]
  most_kills: PlayerStat[]
}

interface ReportTopPlayersProps {
  topPlayers: TopPlayersSection
}

export function ReportTopPlayers({ topPlayers }: ReportTopPlayersProps) {
  if (topPlayers.most_mvps.length === 0 && topPlayers.most_kills.length === 0) {
    return null
  }

  return (
    <div className="print-section">
      <h3 className="mb-4 flex items-center gap-2 text-lg font-semibold text-slate-200">
        <UsersThree className="h-5 w-5" />
        Pemain Terbaik
      </h3>
      <div className="grid gap-4 md:grid-cols-2">
        {topPlayers.most_mvps.length > 0 && (
          <div className="rounded-lg border border-slate-700 p-4">
            <h4 className="mb-3 text-sm font-semibold text-yellow-400">Most MVPs</h4>
            <div className="space-y-2">
              {topPlayers.most_mvps.map((p, i) => (
                <div key={i} className="flex items-center justify-between">
                  <div>
                    <span className="text-slate-200">{p.player_name}</span>
                    <span className="ml-2 text-xs text-slate-500">({p.team_name})</span>
                  </div>
                  <span className="font-bold text-yellow-400">{p.value}</span>
                </div>
              ))}
            </div>
          </div>
        )}
        {topPlayers.most_kills.length > 0 && (
          <div className="rounded-lg border border-slate-700 p-4">
            <h4 className="mb-3 text-sm font-semibold text-red-400">Most Kills</h4>
            <div className="space-y-2">
              {topPlayers.most_kills.map((p, i) => (
                <div key={i} className="flex items-center justify-between">
                  <div>
                    <span className="text-slate-200">{p.player_name}</span>
                    <span className="ml-2 text-xs text-slate-500">({p.team_name})</span>
                  </div>
                  <span className="font-bold text-red-400">{p.value}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
