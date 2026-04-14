import { ChartBar, Sword, Users, Target, CalendarBlank } from '@phosphor-icons/react'
import type { Tournament } from '@/types'
import { formatDate } from '../hooks/useTournamentReport'

interface TournamentStatCardsProps {
  tournament: Tournament
  isBR: boolean
  totalMatches: number
  totalKills: number
  teamsCount: number
  eventDays: number | null
}

export function TournamentStatCards({
  tournament,
  isBR,
  totalMatches,
  totalKills,
  teamsCount,
  eventDays,
}: TournamentStatCardsProps) {
  return (
    <div className="anim-section">
      <div className="mb-4 flex items-center gap-2">
        <ChartBar size={18} weight="fill" className="text-esi-red" />
        <h2 className="text-base font-bold text-stone-900 dark:text-zinc-100">Statistik Event</h2>
      </div>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {[
          {
            icon: Sword,
            label: 'Total Pertandingan',
            value: totalMatches.toString(),
            desc: isBR ? 'lobby selesai' : 'match selesai',
          },
          {
            icon: Users,
            label: 'Total Tim',
            value: (teamsCount || tournament.team_count).toString(),
            desc: 'tim berpartisipasi',
          },
          {
            icon: Target,
            label: 'Total Kill',
            value: totalKills > 0 ? totalKills.toString() : '—',
            desc: 'kill keseluruhan',
          },
          {
            icon: CalendarBlank,
            label: 'Durasi Event',
            value: eventDays != null ? `${eventDays} Hari` : '—',
            desc:
              tournament.start_date && tournament.end_date
                ? `${formatDate(tournament.start_date)} s/d ${formatDate(tournament.end_date)}`
                : 'belum ditentukan',
          },
        ].map(({ icon: Ic, label, value, desc }) => (
          <div
            key={label}
            className="anim-card rounded-xl border border-stone-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 p-5 shadow-sm border-l-4 border-l-esi-red"
          >
            <div className="mb-3 flex items-center gap-2 text-stone-400 dark:text-zinc-500">
              <Ic size={16} className="text-esi-red" />
              <span className="text-[10px] font-semibold uppercase tracking-wider">{label}</span>
            </div>
            <p className="text-2xl font-bold text-stone-900 dark:text-zinc-100 tabular-nums">{value}</p>
            <p className="mt-0.5 text-xs text-stone-400 dark:text-zinc-500">{desc}</p>
          </div>
        ))}
      </div>
    </div>
  )
}
