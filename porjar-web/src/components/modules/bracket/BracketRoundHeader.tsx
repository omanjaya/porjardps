'use client'

import { cn } from '@/lib/utils'

interface BracketRoundHeaderProps {
  rounds: number
  format: 'single_elimination' | 'double_elimination' | 'round_robin'
  columnWidth: number
  columnGap: number
  offsetX: number
}

function getRoundLabel(
  roundIndex: number,
  totalRounds: number,
  format: string
): string {
  const roundNum = roundIndex + 1

  if (format === 'double_elimination') {
    if (roundNum === totalRounds) return 'Grand Final'
    // In double elim, winners and losers round naming is handled by the layout
    // For now, use standard naming
  }

  if (roundNum === totalRounds) return 'Final'
  if (roundNum === totalRounds - 1) return 'Semi-final'
  if (roundNum === totalRounds - 2 && totalRounds >= 4) return 'Quarter-final'
  return `Round ${roundNum}`
}

export function BracketRoundHeader({
  rounds,
  format,
  columnWidth,
  columnGap,
  offsetX,
}: BracketRoundHeaderProps) {
  const labels: string[] = []
  for (let i = 0; i < rounds; i++) {
    labels.push(getRoundLabel(i, rounds, format))
  }

  return (
    <div
      className="flex pointer-events-none select-none"
      style={{
        paddingLeft: offsetX,
      }}
    >
      {labels.map((label, i) => (
        <div
          key={i}
          className="flex-shrink-0 text-center"
          style={{
            width: columnWidth,
            marginRight: i < labels.length - 1 ? columnGap - columnWidth : 0,
          }}
        >
          <span
            className={cn(
              'inline-block rounded-md px-3 py-1 text-[11px] font-semibold uppercase tracking-wider',
              'bg-stone-50 text-stone-600 border border-stone-200'
            )}
          >
            {label}
          </span>
        </div>
      ))}
    </div>
  )
}

export { getRoundLabel }
