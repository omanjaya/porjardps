'use client'

import { ChartBar } from '@phosphor-icons/react'

interface ReportStatistics {
  total_teams: number
  total_matches: number
  completed_matches: number
  total_lobbies: number
  completed_lobbies: number
  total_games_played: number
  avg_duration_mins: number
}

function StatCard({
  label,
  value,
  sub,
}: {
  label: string
  value: string | number
  sub?: string
}) {
  return (
    <div className="rounded-lg border border-slate-700 bg-slate-800/50 p-4">
      <p className="text-sm text-slate-400">{label}</p>
      <p className="mt-1 text-2xl font-bold text-slate-100">{value}</p>
      {sub && <p className="text-xs text-slate-500">{sub}</p>}
    </div>
  )
}

interface ReportStatsCardsProps {
  statistics: ReportStatistics
}

export function ReportStatsCards({ statistics: stats }: ReportStatsCardsProps) {
  return (
    <div className="print-section">
      <h3 className="mb-4 flex items-center gap-2 text-lg font-semibold text-slate-200">
        <ChartBar className="h-5 w-5" />
        Ringkasan Statistik
      </h3>
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <StatCard label="Total Tim" value={stats.total_teams} />
        <StatCard
          label="Pertandingan"
          value={`${stats.completed_matches}/${stats.total_matches}`}
          sub="selesai"
        />
        {stats.total_lobbies > 0 && (
          <StatCard
            label="Lobbies"
            value={`${stats.completed_lobbies}/${stats.total_lobbies}`}
            sub="selesai"
          />
        )}
        <StatCard label="Total Game Dimainkan" value={stats.total_games_played} />
        {stats.avg_duration_mins > 0 && (
          <StatCard
            label="Rata-rata Durasi"
            value={`${stats.avg_duration_mins.toFixed(1)} menit`}
          />
        )}
      </div>
    </div>
  )
}
