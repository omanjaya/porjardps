'use client'

import { Input } from '@/components/ui/input'
import { computeEffectiveTimes, type RoundConfig } from '../lib/scheduleGenerator'

interface Props {
  roundConfigs: RoundConfig[]
  durationMin: number
  breakMin: number
  updateRoundConfig: (round: number, field: 'date' | 'startTime' | 'dayNum', value: string | number) => void
}

export function RoundConfigStep({
  roundConfigs,
  durationMin,
  breakMin,
  updateRoundConfig,
}: Props) {
  const effectiveTimes = computeEffectiveTimes(roundConfigs, durationMin, breakMin)

  return (
    <div>
      <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-stone-400 dark:text-zinc-500">
        Jadwal per Round <span className="text-stone-300 dark:text-zinc-600 font-normal">· jam otomatis dihitung dari round pertama tiap day</span>
      </p>
      <div className="overflow-hidden rounded-lg border border-stone-200 dark:border-zinc-700">
        <table className="w-full text-sm">
          <thead className="bg-stone-50 dark:bg-zinc-800/50 text-xs text-stone-500 dark:text-zinc-400">
            <tr>
              <th className="px-3 py-2 text-left font-semibold">Round</th>
              <th className="px-3 py-2 text-left font-semibold">Match</th>
              <th className="px-3 py-2 text-left font-semibold">
                Tanggal <span className="text-red-500">*</span>
              </th>
              <th className="px-3 py-2 text-left font-semibold">
                Jam Mulai <span className="text-red-500">*</span>
              </th>
              <th className="px-3 py-2 text-left font-semibold text-stone-400 dark:text-zinc-500">
                Estimasi selesai
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-100">
            {roundConfigs.map((rc) => {
              const eff = effectiveTimes[rc.round]
              const effectiveStart = eff?.start ?? '--:--'
              const endTime = eff?.end ?? '--:--'
              const isFirstOfDay = !roundConfigs.some((o) => o.dayNum === rc.dayNum && o.round < rc.round)

              return (
                <tr key={rc.round} className="hover:bg-stone-50 dark:hover:bg-zinc-800 dark:bg-zinc-800/50">
                  <td className="px-3 py-2.5">
                    <div className="flex items-center gap-1.5">
                      <span className="rounded-full bg-esi-red/10 px-2 py-0.5 text-xs font-bold text-esi-red">
                        Round {rc.round}
                      </span>
                      <select
                        value={rc.dayNum}
                        onChange={(e) => updateRoundConfig(rc.round, 'dayNum', parseInt(e.target.value))}
                        className="rounded border border-stone-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-1.5 py-0.5 text-xs font-semibold text-stone-700 dark:text-zinc-300 focus:outline-none focus:ring-1 focus:ring-esi-red/30"
                      >
                        {Array.from({ length: roundConfigs.length }, (_, i) => (
                          <option key={i + 1} value={i + 1}>Day {i + 1}</option>
                        ))}
                      </select>
                    </div>
                  </td>
                  <td className="px-3 py-2.5 text-xs text-stone-500 dark:text-zinc-400">
                    {rc.matches.length} match
                  </td>
                  <td className="px-3 py-2.5">
                    <Input
                      type="date"
                      value={rc.date}
                      onChange={(e) =>
                        updateRoundConfig(rc.round, 'date', e.target.value)
                      }
                      className="h-8 bg-white dark:bg-zinc-900 border-stone-300 dark:border-zinc-600 text-stone-900 dark:text-zinc-100 text-xs w-36"
                    />
                  </td>
                  <td className="px-3 py-2.5">
                    {isFirstOfDay ? (
                      <Input
                        type="time"
                        value={rc.startTime}
                        onChange={(e) => updateRoundConfig(rc.round, 'startTime', e.target.value)}
                        className="h-8 w-28 bg-white dark:bg-zinc-900 border-stone-300 dark:border-zinc-600 text-stone-900 dark:text-zinc-100 text-xs"
                      />
                    ) : (
                      <span className="inline-block h-8 leading-8 w-28 rounded-md border border-stone-200 dark:border-zinc-700 bg-stone-50 dark:bg-zinc-800/50 px-3 text-xs font-semibold text-stone-700 dark:text-zinc-300 tabular-nums">{effectiveStart}</span>
                    )}
                  </td>
                  <td className="px-3 py-2.5 text-xs text-stone-400 dark:text-zinc-500">
                    {endTime} <span className="text-stone-300 dark:text-zinc-600">·</span> {durationMin}m
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
