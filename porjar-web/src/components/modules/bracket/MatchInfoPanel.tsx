import { StatusBadge } from '@/components/shared/StatusBadge'
import {
  Lightning,
  Clock,
  Timer,
  Star,
} from '@phosphor-icons/react'
import type { BracketMatch } from '@/types'

interface MatchInfoPanelProps {
  match: BracketMatch
  totalDuration: number | null
}

export function MatchInfoPanel({ match, totalDuration }: MatchInfoPanelProps) {
  return (
    <div className="space-y-2">
      <h3 className="text-xs font-semibold uppercase tracking-wider text-stone-500 px-1">
        Info
      </h3>
      <div className="rounded-xl border border-stone-200 bg-stone-50 divide-y divide-stone-200/60">
        <InfoRow
          icon={<Lightning size={14} />}
          label="Status"
          value={<StatusBadge status={match.status} className="text-[10px]" />}
        />
        {match.scheduled_at && (
          <InfoRow
            icon={<Clock size={14} />}
            label="Dijadwalkan"
            value={
              <span className="text-sm text-stone-700">
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
            }
          />
        )}
        {totalDuration && (
          <InfoRow
            icon={<Timer size={14} />}
            label="Durasi"
            value={
              <span className="text-sm text-stone-700">{totalDuration} menit</span>
            }
          />
        )}
        {match.games?.some((g) => g.mvp) && (
          <InfoRow
            icon={<Star size={14} />}
            label="MVP"
            value={
              <span className="text-sm text-amber-400">
                {match.games!.find((g) => g.mvp)?.mvp}
              </span>
            }
          />
        )}
      </div>
    </div>
  )
}

function InfoRow({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode
  label: string
  value: React.ReactNode
}) {
  return (
    <div className="flex items-center justify-between px-3 py-2.5">
      <div className="flex items-center gap-2 text-stone-500">
        {icon}
        <span className="text-xs font-medium">{label}</span>
      </div>
      {value}
    </div>
  )
}
