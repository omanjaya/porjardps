'use client'

import { Trash } from '@phosphor-icons/react'
import { isoToLocalTime, type PreviewEntry, type RoundConfig } from '../lib/scheduleGenerator'

interface Props {
  entries: PreviewEntry[]
  roundConfigs: RoundConfig[]
  saving: boolean
  saveProgress: number
  updateEntry: (tempId: string, patch: Partial<PreviewEntry>) => void
  handleTimeChange: (entry: PreviewEntry, field: 'scheduledAt' | 'endAt', timeStr: string) => void
  removeEntry: (tempId: string) => void
}

export function PreviewStep({
  entries,
  roundConfigs,
  saving,
  saveProgress,
  updateEntry,
  handleTimeChange,
  removeEntry,
}: Props) {
  return (
    <div className="py-2">
      {/* Summary bar */}
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-sm text-stone-500 dark:text-zinc-400">
            <span className="font-semibold text-stone-900 dark:text-zinc-100">{entries.length} jadwal</span>
            {' · '}
            <span className="font-semibold text-stone-900 dark:text-zinc-100">{new Set(roundConfigs.map(r => r.dayNum)).size} hari</span>
          </span>
          <div className="flex gap-1.5">
            {roundConfigs.map((rc) => (
              <span
                key={rc.round}
                className="rounded-full bg-esi-red/10 px-2 py-0.5 text-[11px] font-bold text-esi-red"
              >
                Day {rc.dayNum}: {entries.filter((e) => e.dayNum === rc.dayNum).length} match
              </span>
            ))}
          </div>
        </div>
        <p className="text-[11px] text-stone-400 dark:text-zinc-500">Klik sel untuk edit inline</p>
      </div>

      {/* Preview table */}
      <div className="max-h-[50vh] overflow-x-auto overflow-y-auto rounded-lg border border-stone-200 dark:border-zinc-700">
        <table className="w-full text-xs">
          <thead className="sticky top-0 z-10 bg-stone-50 dark:bg-zinc-800/50 text-stone-500 dark:text-zinc-400">
            <tr className="border-b border-stone-200 dark:border-zinc-700">
              <th className="px-3 py-2 text-left font-semibold">Day</th>
              <th className="px-3 py-2 text-left font-semibold">Match</th>
              <th className="px-3 py-2 text-left font-semibold" style={{ minWidth: 160 }}>
                Judul
              </th>
              <th className="px-3 py-2 text-left font-semibold whitespace-nowrap">
                Jam Mulai
              </th>
              <th className="px-3 py-2 text-left font-semibold whitespace-nowrap">
                Jam Selesai
              </th>
              <th className="px-3 py-2 text-left font-semibold" style={{ minWidth: 90 }}>
                Venue
              </th>
              <th className="w-8 px-2 py-2" />
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-100">
            {entries.map((entry) => (
              <tr key={entry.tempId} className="group hover:bg-stone-50 dark:hover:bg-zinc-800 dark:bg-zinc-800/50">
                <td className="px-3 py-1.5">
                  <span className="rounded-full bg-esi-red/10 px-2 py-0.5 text-[11px] font-bold text-esi-red whitespace-nowrap">
                    Day {entry.dayNum}
                  </span>
                </td>
                <td className="px-3 py-1.5 text-stone-400 dark:text-zinc-500 whitespace-nowrap">
                  {entry.matchLabel}
                </td>
                <td className="px-3 py-1.5">
                  <input
                    value={entry.title}
                    onChange={(e) => updateEntry(entry.tempId, { title: e.target.value })}
                    className="w-full min-w-[140px] rounded border border-transparent bg-transparent px-1 py-0.5 text-stone-900 dark:text-zinc-100 hover:border-stone-300 dark:border-zinc-600 focus:border-esi-red focus:bg-white dark:bg-zinc-900 focus:outline-none"
                  />
                </td>
                <td className="px-3 py-1.5">
                  <input
                    type="time"
                    value={isoToLocalTime(entry.scheduledAt)}
                    onChange={(e) => handleTimeChange(entry, 'scheduledAt', e.target.value)}
                    className="w-20 rounded border border-transparent bg-transparent px-1 py-0.5 text-stone-900 dark:text-zinc-100 hover:border-stone-300 dark:border-zinc-600 focus:border-esi-red focus:bg-white dark:bg-zinc-900 focus:outline-none"
                  />
                </td>
                <td className="px-3 py-1.5">
                  <input
                    type="time"
                    value={isoToLocalTime(entry.endAt)}
                    onChange={(e) => handleTimeChange(entry, 'endAt', e.target.value)}
                    className="w-20 rounded border border-transparent bg-transparent px-1 py-0.5 text-stone-900 dark:text-zinc-100 hover:border-stone-300 dark:border-zinc-600 focus:border-esi-red focus:bg-white dark:bg-zinc-900 focus:outline-none"
                  />
                </td>
                <td className="px-3 py-1.5">
                  <input
                    value={entry.venue}
                    onChange={(e) => updateEntry(entry.tempId, { venue: e.target.value })}
                    placeholder="—"
                    className="w-full rounded border border-transparent bg-transparent px-1 py-0.5 text-stone-900 dark:text-zinc-100 hover:border-stone-300 dark:border-zinc-600 focus:border-esi-red focus:bg-white dark:bg-zinc-900 focus:outline-none"
                  />
                </td>
                <td className="px-2 py-1.5">
                  <button
                    onClick={() => removeEntry(entry.tempId)}
                    className="rounded p-1 text-stone-300 dark:text-zinc-600 transition-colors hover:bg-red-50 dark:bg-red-950/30 hover:text-red-500"
                  >
                    <Trash size={12} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Save progress */}
      {saving && (
        <div className="mt-3">
          <div className="mb-1 flex items-center justify-between text-xs text-stone-500 dark:text-zinc-400">
            <span>Menyimpan & sinkronisasi bracket...</span>
            <span>
              {saveProgress} / {entries.length}
            </span>
          </div>
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-stone-100 dark:bg-zinc-800">
            <div
              className="h-full bg-esi-red transition-all duration-200"
              style={{ width: `${(saveProgress / entries.length) * 100}%` }}
            />
          </div>
        </div>
      )}
    </div>
  )
}
