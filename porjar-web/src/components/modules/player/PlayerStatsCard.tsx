'use client'

import { Trophy, Star, ChartBar } from '@phosphor-icons/react'

interface PlayerStatsCardProps {
  matchesPlayed: number
  winRate: number
  mvpCount: number
}

export function PlayerStatsCard({ matchesPlayed, winRate, mvpCount }: PlayerStatsCardProps) {
  return (
    <div className="flex items-center gap-4 rounded-lg border border-slate-700/30 bg-slate-900/50 px-4 py-3">
      <div className="flex items-center gap-1.5">
        <ChartBar size={14} weight="bold" className="text-blue-400" />
        <span className="text-xs text-slate-400">Pertandingan</span>
        <span className="text-sm font-semibold text-slate-200">{matchesPlayed}</span>
      </div>

      <div className="h-4 w-px bg-slate-700" />

      <div className="flex items-center gap-1.5">
        <Trophy size={14} weight="bold" className="text-green-400" />
        <span className="text-xs text-slate-400">Win Rate</span>
        <span className="text-sm font-semibold text-slate-200">{winRate.toFixed(1)}%</span>
      </div>

      <div className="h-4 w-px bg-slate-700" />

      <div className="flex items-center gap-1.5">
        <Star size={14} weight="bold" className="text-amber-400" />
        <span className="text-xs text-slate-400">MVP</span>
        <span className="text-sm font-semibold text-slate-200">{mvpCount}</span>
      </div>
    </div>
  )
}
