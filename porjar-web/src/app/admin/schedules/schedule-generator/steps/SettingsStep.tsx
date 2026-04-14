'use client'

import { Input } from '@/components/ui/input'

interface Props {
  titlePrefix: string
  setTitlePrefix: (v: string) => void
  venue: string
  setVenue: (v: string) => void
  durationMinStr: string
  setDurationMinStr: (v: string) => void
  breakMinStr: string
  setBreakMinStr: (v: string) => void
}

export function SettingsStep({
  titlePrefix, setTitlePrefix,
  venue, setVenue,
  durationMinStr, setDurationMinStr,
  breakMinStr, setBreakMinStr,
}: Props) {
  return (
    <div className="grid grid-cols-2 gap-3">
      <div className="col-span-2">
        <label className="mb-1.5 block text-xs font-medium text-stone-500 dark:text-zinc-400">
          Prefix Judul Jadwal
        </label>
        <Input
          value={titlePrefix}
          onChange={(e) => setTitlePrefix(e.target.value)}
          placeholder="ESI HOK SMA"
          className="bg-white dark:bg-zinc-900 border-stone-300 dark:border-zinc-600 text-stone-900 dark:text-zinc-100"
        />
        <p className="mt-1 text-[11px] text-stone-400 dark:text-zinc-500">
          Contoh hasil: &ldquo;{titlePrefix || 'ESI HOK SMA'} - Day 1&rdquo;
        </p>
      </div>

      <div className="col-span-2">
        <label className="mb-1.5 block text-xs font-medium text-stone-500 dark:text-zinc-400">
          Venue (opsional)
        </label>
        <Input
          value={venue}
          onChange={(e) => setVenue(e.target.value)}
          placeholder="GOR Ngurah Rai"
          className="bg-white dark:bg-zinc-900 border-stone-300 dark:border-zinc-600 text-stone-900 dark:text-zinc-100"
        />
      </div>

      <div>
        <label className="mb-1.5 block text-xs font-medium text-stone-500 dark:text-zinc-400">
          Estimasi durasi per match
        </label>
        <div className="flex items-center gap-2">
          <Input
            type="number"
            min={5}
            max={300}
            value={durationMinStr}
            onChange={(e) => setDurationMinStr(e.target.value)}
            onFocus={(e) => e.target.select()}
            className="bg-white dark:bg-zinc-900 border-stone-300 dark:border-zinc-600 text-stone-900 dark:text-zinc-100"
          />
          <span className="shrink-0 text-xs text-stone-400 dark:text-zinc-500">menit</span>
        </div>
      </div>

      <div>
        <label className="mb-1.5 block text-xs font-medium text-stone-500 dark:text-zinc-400">
          Istirahat antar match
        </label>
        <div className="flex items-center gap-2">
          <Input
            type="number"
            min={0}
            max={180}
            value={breakMinStr}
            onChange={(e) => setBreakMinStr(e.target.value)}
            onFocus={(e) => e.target.select()}
            className="bg-white dark:bg-zinc-900 border-stone-300 dark:border-zinc-600 text-stone-900 dark:text-zinc-100"
          />
          <span className="shrink-0 text-xs text-stone-400 dark:text-zinc-500">menit</span>
        </div>
      </div>
    </div>
  )
}
