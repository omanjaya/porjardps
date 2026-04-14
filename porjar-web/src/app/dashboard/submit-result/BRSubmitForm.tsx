'use client'

import { useState } from 'react'
import { CaretDown, PaperPlaneTilt, WarningCircle } from '@phosphor-icons/react'
import { ScreenshotUploader } from '@/components/modules/submission/ScreenshotUploader'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

// TODO: These max placement values should ideally come from the API
// (e.g. from tournament or game config). The backend validates placement
// regardless, so these are just UI limits for the dropdown.
const BR_MAX_PLACEMENT: Record<string, number> = {
  pubgm: 25,
  ff: 18,
}
const BR_MAX_PLACEMENT_DEFAULT = 100

function getMaxPlacement(gameSlug?: string): number {
  if (gameSlug && gameSlug in BR_MAX_PLACEMENT) {
    return BR_MAX_PLACEMENT[gameSlug]
  }
  return BR_MAX_PLACEMENT_DEFAULT
}

interface BRSubmitFormProps {
  gameSlug?: string
  mapName?: string
  placement: string
  setPlacement: (v: string) => void
  killsP1: string
  setKillsP1: (v: string) => void
  killsP2: string
  setKillsP2: (v: string) => void
  killsP3: string
  setKillsP3: (v: string) => void
  killsP4: string
  setKillsP4: (v: string) => void
  onScreenshotsChange: (urls: string[]) => void
  submitting: boolean
  onSubmit: () => void
}

export function BRSubmitForm({
  gameSlug,
  mapName,
  placement,
  setPlacement,
  killsP1,
  setKillsP1,
  killsP2,
  setKillsP2,
  killsP3,
  setKillsP3,
  killsP4,
  setKillsP4,
  onScreenshotsChange,
  submitting,
  onSubmit,
}: BRSubmitFormProps) {
  const [showConfirm, setShowConfirm] = useState(false)
  const maxPlacement = getMaxPlacement(gameSlug)
  const totalKills = [killsP1, killsP2, killsP3, killsP4]
    .map(v => parseInt(v) || 0)
    .reduce((a, b) => a + b, 0)

  const handleSubmitClick = () => {
    if (!placement) return
    setShowConfirm(true)
  }
  const handleConfirm = () => {
    setShowConfirm(false)
    onSubmit()
  }

  return (
    <div className="space-y-5">
      {/* Map name indicator */}
      {mapName && (
        <div className="rounded-lg bg-blue-50 dark:bg-blue-950/30 px-3 py-2 text-sm font-medium text-blue-700 dark:text-blue-300">
          Map: {mapName}
        </div>
      )}

      {/* Placement */}
      <div>
        <label className="mb-2 block text-sm font-medium text-esi-text">
          Placement
        </label>
        <div className="relative">
          <select
            value={placement}
            onChange={e => setPlacement(e.target.value)}
            className="w-full min-h-[52px] appearance-none rounded-lg border border-stone-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 dark:text-zinc-100 px-4 py-3 pr-10 text-base font-semibold text-esi-text focus:border-esi-red focus:outline-none focus:ring-2 focus:ring-esi-red/20"
          >
            <option value="">Pilih placement...</option>
            {Array.from({ length: maxPlacement }, (_, i) => (
              <option key={i + 1} value={String(i + 1)}>
                #{i + 1}
              </option>
            ))}
          </select>
          <CaretDown size={16} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-esi-muted" />
        </div>
      </div>

      {/* Kills per player */}
      <div>
        <div className="mb-2 flex items-center justify-between">
          <label className="text-sm font-medium text-esi-text">
            Kills per Pemain
          </label>
          <span className="text-xs font-semibold text-esi-muted">
            Total: <span className="text-esi-red">{totalKills}</span>
          </span>
        </div>
        <div className="grid grid-cols-2 gap-3">
          {[
            { label: 'Pemain 1', value: killsP1, set: setKillsP1 },
            { label: 'Pemain 2', value: killsP2, set: setKillsP2 },
            { label: 'Pemain 3', value: killsP3, set: setKillsP3 },
            { label: 'Pemain 4', value: killsP4, set: setKillsP4 },
          ].map(({ label, value, set }) => (
            <div key={label}>
              <label className="mb-1 block text-xs text-esi-muted">{label}</label>
              <Input
                type="number"
                inputMode="numeric"
                pattern="[0-9]*"
                min="0"
                max="99"
                placeholder="0"
                value={value}
                onFocus={e => e.target.select()}
                onChange={e => set(e.target.value)}
                className="h-14 text-center text-2xl font-bold border-stone-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 dark:text-zinc-100 focus:border-esi-red focus:ring-esi-red/20 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
              />
            </div>
          ))}
        </div>
      </div>

      {/* Screenshots */}
      <div>
        <label className="mb-2 block text-sm font-medium text-esi-text">
          Screenshot Bukti
        </label>
        <p className="mb-2 text-xs text-esi-muted">
          Screenshot 1: hasil akhir (placement) · Screenshot 2: detail kills (maks 2 file)
        </p>
        <ScreenshotUploader onUpload={onScreenshotsChange} maxFiles={2} />
      </div>

      {showConfirm && (
        <div className="rounded-lg border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/30 p-4 space-y-3">
          <div className="flex items-start gap-2">
            <WarningCircle size={18} weight="fill" className="text-amber-500 mt-0.5 shrink-0" />
            <div className="text-sm text-stone-700 dark:text-zinc-300">
              <p className="font-semibold mb-1">Kirim hasil ini?</p>
              <p className="text-xs text-stone-500 dark:text-zinc-400 mb-2">
                Pastikan data berikut sudah benar.
              </p>
              <div className="bg-white dark:bg-zinc-800 rounded-md border border-stone-200 dark:border-zinc-700 p-3 space-y-1.5 text-xs">
                <div className="flex justify-between"><span className="text-stone-500 dark:text-zinc-400">Placement</span><span className="font-bold">#{placement}</span></div>
                <div className="flex justify-between"><span className="text-stone-500 dark:text-zinc-400">Total Kills</span><span className="font-bold">{totalKills}</span></div>
                {mapName && <div className="flex justify-between"><span className="text-stone-500 dark:text-zinc-400">Map</span><span className="font-bold">{mapName}</span></div>}
              </div>
            </div>
          </div>
          <div className="flex gap-2 ml-6">
            <Button variant="outline" onClick={() => setShowConfirm(false)} className="flex-1 min-h-[48px]">Batal</Button>
            <Button onClick={handleConfirm} disabled={submitting} className="flex-1 min-h-[48px] bg-esi-red text-white hover:brightness-110">
              {submitting ? 'Mengirim...' : 'Ya, Kirim Sekarang'}
            </Button>
          </div>
        </div>
      )}

      {!showConfirm && (
        <Button
          onClick={handleSubmitClick}
          disabled={submitting || !placement}
          className="w-full min-h-[52px] text-base font-semibold bg-esi-red text-white hover:brightness-110"
        >
          {submitting ? (
            <span className="flex items-center gap-2">
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
              Mengirim...
            </span>
          ) : (
            <span className="flex items-center gap-2">
              <PaperPlaneTilt size={18} weight="fill" />
              Kirim Hasil
            </span>
          )}
        </Button>
      )}
    </div>
  )
}
