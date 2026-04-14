'use client'

import { FormDialog } from '@/components/shared/FormDialog'
import { getRoundLabel } from '@/components/modules/bracket/BracketRoundHeader'
import type { BracketMatch } from '@/types'

interface BOConfigDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  rounds: number[]
  maxRound: number
  format: string
  matches: BracketMatch[]
  roundBoConfig: Record<number, number>
  setRoundBoConfig: React.Dispatch<React.SetStateAction<Record<number, number>>>
  savingBo: boolean
  onSave: () => void
}

export function BOConfigDialog({
  open,
  onOpenChange,
  rounds,
  maxRound,
  format,
  matches,
  roundBoConfig,
  setRoundBoConfig,
  savingBo,
  onSave,
}: BOConfigDialogProps) {
  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Atur Best Of per Round"
      description="Custom BO untuk setiap round. Misal BO1 untuk kualifikasi, BO3 untuk semifinal & final."
      onSubmit={(e) => { e.preventDefault(); onSave() }}
      submitting={savingBo}
      maxWidth="sm"
    >
      {rounds.map((r) => {
        const label = getRoundLabel(r - 1, maxRound, format)
        const matchCount = matches.filter((m) => m.round === r && m.status !== 'bye').length
        return (
          <div key={r} className="flex items-center justify-between rounded-lg border border-stone-200 dark:border-zinc-700 px-3 py-2">
            <div>
              <p className="text-sm font-medium text-stone-900 dark:text-zinc-100">{label}</p>
              <p className="text-[10px] text-stone-400 dark:text-zinc-500">{matchCount} match</p>
            </div>
            <div className="flex items-center gap-1">
              {[1, 3, 5].map((bo) => (
                <button
                  key={bo}
                  type="button"
                  onClick={() => setRoundBoConfig((prev) => ({ ...prev, [r]: bo }))}
                  className={`rounded-md border px-3 py-1 text-xs font-bold transition-colors ${
                    (roundBoConfig[r] ?? 1) === bo
                      ? 'border-esi-red bg-esi-red text-white'
                      : 'border-stone-200 dark:border-zinc-700 text-stone-500 dark:text-zinc-400 hover:border-stone-400'
                  }`}
                >
                  BO{bo}
                </button>
              ))}
            </div>
          </div>
        )
      })}
    </FormDialog>
  )
}
