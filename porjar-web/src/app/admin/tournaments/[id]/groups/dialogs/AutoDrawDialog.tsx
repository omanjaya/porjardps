'use client'

import { Shuffle, Trophy } from '@phosphor-icons/react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import type { TeamSummary } from '@/types'

interface AutoDrawDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  availableTeams: TeamSummary[]
  numGroups: number
  setNumGroups: (v: number) => void
  advancePerGroup: number
  setAdvancePerGroup: (v: number) => void
  autoDrawLegs: number
  setAutoDrawLegs: (v: number) => void
  drawing: boolean
  drawPhase: 'idle' | 'shuffling' | 'done'
  shuffleDisplay: string[]
  onAutoDraw: () => void
}

export function AutoDrawDialog({
  open, onOpenChange, availableTeams, numGroups, setNumGroups,
  advancePerGroup, setAdvancePerGroup, autoDrawLegs, setAutoDrawLegs,
  drawing, drawPhase, shuffleDisplay, onAutoDraw,
}: AutoDrawDialogProps) {
  return (
    <Dialog open={open} onOpenChange={(o) => { if (!drawing) onOpenChange(o) }}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {drawPhase === 'shuffling' ? 'Mengacak Tim...' : drawPhase === 'done' ? 'Selesai!' : 'Acak Grup Otomatis'}
          </DialogTitle>
        </DialogHeader>
        {drawPhase === 'idle' && (
          <>
            <div className="rounded-lg bg-stone-50 dark:bg-zinc-800/50 border border-stone-200 dark:border-zinc-700 px-3 py-2 mb-4 text-sm">
              <span className="font-medium text-stone-700 dark:text-zinc-300">{availableTeams.length}</span>
              <span className="text-stone-500 dark:text-zinc-400"> tim terdaftar</span>
              {availableTeams.length === 0 && <p className="text-xs text-red-500 mt-1">Belum ada tim. Tambahkan tim di halaman turnamen.</p>}
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-stone-700 dark:text-zinc-300">Jumlah Grup</label>
                <Input type="number" min={2} max={16} value={numGroups} onChange={(e) => setNumGroups(e.target.value === '' ? 2 : parseInt(e.target.value))} />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-stone-700 dark:text-zinc-300">Lolos per Grup</label>
                <Input type="number" min={1} max={8} value={advancePerGroup} onChange={(e) => setAdvancePerGroup(e.target.value === '' ? 1 : parseInt(e.target.value))} />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-stone-700 dark:text-zinc-300">Jumlah Leg</label>
                <select
                  value={autoDrawLegs}
                  onChange={(e) => setAutoDrawLegs(parseInt(e.target.value))}
                  className="flex h-9 w-full rounded-md border border-stone-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 py-1 text-sm text-stone-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-esi-red"
                >
                  <option value={1}>1 (Single)</option>
                  <option value={2}>2 (Home &amp; Away)</option>
                </select>
              </div>
            </div>
            <p className="text-xs text-stone-400 dark:text-zinc-500 mt-2">~{Math.ceil(availableTeams.length / numGroups)} tim/grup &middot; Total lolos: {numGroups * advancePerGroup} tim</p>
            <DialogFooter>
              <Button variant="outline" onClick={() => onOpenChange(false)}>Batal</Button>
              <Button onClick={onAutoDraw} disabled={availableTeams.length < numGroups * 2} className="bg-esi-red hover:bg-esi-red/90">
                <Shuffle className="mr-1.5 h-4 w-4" /> Acak Sekarang
              </Button>
            </DialogFooter>
          </>
        )}
        {drawPhase === 'shuffling' && (
          <div className="py-6 space-y-3">
            <div className="flex justify-center mb-4">
              <div className="h-16 w-16 rounded-full bg-esi-red/10 flex items-center justify-center animate-spin">
                <Shuffle size={32} className="text-esi-red" />
              </div>
            </div>
            <div className="space-y-2 font-mono text-xs">
              {shuffleDisplay.map((line, i) => (
                <div key={i} className="rounded-lg bg-stone-900 text-green-400 px-3 py-2">{line}</div>
              ))}
            </div>
            <p className="text-center text-xs text-stone-400 dark:text-zinc-500 animate-pulse">Mengacak tim ke dalam grup...</p>
          </div>
        )}
        {drawPhase === 'done' && (
          <div className="py-8 text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
              <Trophy size={32} className="text-green-600" />
            </div>
            <p className="text-lg font-bold text-stone-900 dark:text-zinc-100">{numGroups} Grup Berhasil Dibuat!</p>
            <p className="text-sm text-stone-500 dark:text-zinc-400 mt-1">Jadwal round robin sudah di-generate.</p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
