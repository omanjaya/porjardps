'use client'

import { CaretDown, PaperPlaneTilt } from '@phosphor-icons/react'
import { ScreenshotUploader } from '@/components/modules/submission/ScreenshotUploader'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

interface BRSubmitFormProps {
  placement: string
  setPlacement: (v: string) => void
  kills: string
  setKills: (v: string) => void
  onScreenshotsChange: (urls: string[]) => void
  submitting: boolean
  onSubmit: () => void
}

export function BRSubmitForm({
  placement,
  setPlacement,
  kills,
  setKills,
  onScreenshotsChange,
  submitting,
  onSubmit,
}: BRSubmitFormProps) {
  return (
    <div className="space-y-5">
      {/* Placement */}
      <div>
        <label className="mb-2 block text-sm font-medium text-porjar-text">
          Placement
        </label>
        <div className="relative">
          <select
            value={placement}
            onChange={e => setPlacement(e.target.value)}
            className="w-full appearance-none rounded-lg border border-stone-200 bg-white px-4 py-2.5 pr-10 text-sm font-medium text-porjar-text focus:border-porjar-red focus:outline-none focus:ring-2 focus:ring-porjar-red/20"
          >
            <option value="">Pilih placement...</option>
            {Array.from({ length: 16 }, (_, i) => (
              <option key={i + 1} value={String(i + 1)}>
                #{i + 1}
              </option>
            ))}
          </select>
          <CaretDown size={16} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-porjar-muted" />
        </div>
      </div>

      {/* Kills */}
      <div>
        <label className="mb-2 block text-sm font-medium text-porjar-text">
          Total Kills
        </label>
        <Input
          type="number"
          min="0"
          placeholder="0"
          value={kills}
          onChange={e => setKills(e.target.value)}
          className="border-stone-200 bg-white focus:border-porjar-red focus:ring-porjar-red/20"
        />
      </div>

      {/* Screenshots */}
      <div>
        <label className="mb-2 block text-sm font-medium text-porjar-text">
          Screenshot Bukti (placement & kills)
        </label>
        <ScreenshotUploader onUpload={onScreenshotsChange} maxFiles={5} />
      </div>

      <Button
        onClick={onSubmit}
        disabled={submitting}
        className="w-full bg-porjar-red text-white hover:brightness-110"
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
    </div>
  )
}
