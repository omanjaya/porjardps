'use client'

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
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
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-white border-stone-200 sm:max-w-sm">
        <DialogHeader>
          <DialogTitle className="text-stone-900">Atur Best Of per Round</DialogTitle>
          <DialogDescription className="text-stone-500">
            Custom BO untuk setiap round. Misal BO1 untuk kualifikasi, BO3 untuk semifinal & final.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-2 py-2">
          {rounds.map((r) => {
            const label = getRoundLabel(r - 1, maxRound, format)
            const matchCount = matches.filter((m) => m.round === r && m.status !== 'bye').length
            return (
              <div key={r} className="flex items-center justify-between rounded-lg border border-stone-200 px-3 py-2">
                <div>
                  <p className="text-sm font-medium text-stone-900">{label}</p>
                  <p className="text-[10px] text-stone-400">{matchCount} match</p>
                </div>
                <div className="flex items-center gap-1">
                  {[1, 3, 5].map((bo) => (
                    <button
                      key={bo}
                      onClick={() => setRoundBoConfig((prev) => ({ ...prev, [r]: bo }))}
                      className={`rounded-md border px-3 py-1 text-xs font-bold transition-colors ${
                        (roundBoConfig[r] ?? 1) === bo
                          ? 'border-porjar-red bg-porjar-red text-white'
                          : 'border-stone-200 text-stone-500 hover:border-stone-400'
                      }`}
                    >
                      BO{bo}
                    </button>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} className="border-stone-300 text-stone-600">
            Batal
          </Button>
          <Button onClick={onSave} disabled={savingBo} className="bg-porjar-red hover:bg-porjar-red-dark text-white">
            {savingBo ? 'Menyimpan...' : 'Simpan'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
