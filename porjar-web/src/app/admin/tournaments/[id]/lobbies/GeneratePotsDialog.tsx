'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { ArrowsClockwise } from '@phosphor-icons/react'
import type { TeamSummary } from '@/types'

interface GeneratePotsDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  teams: TeamSummary[]
  lobbiesCount: number
  onSave: (pots: { name: string; teams: TeamSummary[] }[], day: number) => Promise<void>
}

function shuffleArray<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

function distributeToPots(shuffledTeams: TeamSummary[], numPots: number, perPot: number) {
  const pots: { name: string; teams: TeamSummary[] }[] = []
  for (let i = 0; i < numPots; i++) {
    const start = i * perPot
    const end = Math.min(start + perPot, shuffledTeams.length)
    pots.push({
      name: `POT ${i + 1}`,
      teams: shuffledTeams.slice(start, end),
    })
  }
  return pots
}

export function GeneratePotsDialog({
  open,
  onOpenChange,
  teams,
  lobbiesCount,
  onSave,
}: GeneratePotsDialogProps) {
  const [genNumPots, setGenNumPots] = useState('2')
  const [genTeamsPerPot, setGenTeamsPerPot] = useState('6')
  const [genDay, setGenDay] = useState('1')
  const [genStep, setGenStep] = useState<'config' | 'shuffling' | 'result'>('config')
  const [shuffleDisplay, setShuffleDisplay] = useState<string[][]>([])
  const [finalPots, setFinalPots] = useState<{ name: string; teams: TeamSummary[] }[]>([])
  const [saving, setSaving] = useState(false)

  function reset() {
    setGenStep('config')
    setFinalPots([])
    setShuffleDisplay([])
  }

  function handleOpenChange(nextOpen: boolean) {
    if (!nextOpen) {
      reset()
    }
    onOpenChange(nextOpen)
  }

  function handleStartShuffle() {
    const numPots = parseInt(genNumPots) || 2
    const perPot = parseInt(genTeamsPerPot) || 6
    setGenStep('shuffling')

    const interval = setInterval(() => {
      const shuffled = shuffleArray(teams)
      const pots = distributeToPots(shuffled, numPots, perPot)
      setShuffleDisplay(pots.map((p) => p.teams.map((t) => t.name)))
    }, 100)

    setTimeout(() => {
      clearInterval(interval)
      const finalShuffle = shuffleArray(teams)
      const pots = distributeToPots(finalShuffle, numPots, perPot)
      setFinalPots(pots)
      setShuffleDisplay(pots.map((p) => p.teams.map((t) => t.name)))
      setGenStep('result')
    }, 5000)
  }

  async function handleSavePots() {
    const day = parseInt(genDay) || 1
    setSaving(true)
    try {
      await onSave(finalPots, day)
      reset()
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="bg-white border-stone-200 sm:max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="text-stone-900">
            {genStep === 'config' ? 'Acak POT' : genStep === 'shuffling' ? 'Mengacak Tim...' : 'Hasil Pengacakan'}
          </DialogTitle>
          <DialogDescription className="text-stone-500">
            {genStep === 'config' && `${teams.length} tim terdaftar — atur jumlah POT lalu acak`}
            {genStep === 'shuffling' && 'Tunggu 5 detik...'}
            {genStep === 'result' && 'Periksa hasil pengacakan, lalu simpan'}
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto py-2">
          {/* Step 1: Config */}
          {genStep === 'config' && (
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="mb-1 block text-xs font-medium text-stone-500">Jumlah POT</label>
                  <Input type="number" min="1" max="20" value={genNumPots} onChange={(e) => setGenNumPots(e.target.value)} className="bg-white border-stone-300 text-sm focus:border-porjar-red" />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-stone-500">Tim per POT</label>
                  <Input type="number" min="1" max="20" value={genTeamsPerPot} onChange={(e) => setGenTeamsPerPot(e.target.value)} className="bg-white border-stone-300 text-sm focus:border-porjar-red" />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-stone-500">Day</label>
                  <Input type="number" min="1" value={genDay} onChange={(e) => setGenDay(e.target.value)} className="bg-white border-stone-300 text-sm focus:border-porjar-red" />
                </div>
              </div>

              {/* Info */}
              <div className="rounded-lg bg-stone-50 border border-stone-200 p-3 text-xs text-stone-600">
                <p>{genNumPots} POT x {genTeamsPerPot} tim = <strong>{(parseInt(genNumPots) || 0) * (parseInt(genTeamsPerPot) || 0)} slot</strong></p>
                <p>{teams.length} tim terdaftar</p>
                {(parseInt(genNumPots) || 0) * (parseInt(genTeamsPerPot) || 0) < teams.length && (
                  <p className="text-amber-600 font-medium mt-1">Slot kurang! {teams.length - (parseInt(genNumPots) || 0) * (parseInt(genTeamsPerPot) || 0)} tim tidak masuk</p>
                )}
              </div>

              {/* Team list preview */}
              <div>
                <p className="text-xs font-semibold text-stone-400 uppercase tracking-wider mb-2">Tim Terdaftar ({teams.length})</p>
                <div className="max-h-[200px] overflow-y-auto rounded-lg border border-stone-200">
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-px bg-stone-100">
                    {teams.map((t) => (
                      <div key={t.id} className="bg-white px-2.5 py-1.5 text-[11px] font-medium text-stone-700 truncate">
                        {t.name}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Step 2: Shuffling animation */}
          {genStep === 'shuffling' && (
            <div className="space-y-3">
              <div className="text-center py-4">
                <div className="inline-flex items-center gap-2 rounded-full bg-porjar-red/10 px-4 py-2 text-sm font-bold text-porjar-red">
                  <ArrowsClockwise size={18} className="animate-spin" />
                  Mengacak...
                </div>
              </div>
              <div className="grid gap-3" style={{ gridTemplateColumns: `repeat(${Math.min(parseInt(genNumPots) || 2, 4)}, 1fr)` }}>
                {shuffleDisplay.map((potTeams, i) => (
                  <div key={i} className="rounded-lg border border-stone-200 overflow-hidden">
                    <div className="bg-porjar-red px-3 py-1.5 text-xs font-bold text-white text-center">POT {i + 1}</div>
                    <div className="p-2 space-y-0.5 min-h-[100px]">
                      {potTeams.map((name, j) => (
                        <div key={j} className="rounded bg-stone-50 px-2 py-0.5 text-[10px] text-stone-600 truncate transition-all duration-75">
                          {name}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Step 3: Final result */}
          {genStep === 'result' && (
            <div className="space-y-3">
              <div className="grid gap-3" style={{ gridTemplateColumns: `repeat(${Math.min(finalPots.length, 4)}, 1fr)` }}>
                {finalPots.map((pot, i) => (
                  <div key={i} className="rounded-lg border border-stone-200 overflow-hidden">
                    <div className="bg-porjar-red px-3 py-2 text-xs font-bold text-white text-center">
                      {pot.name}
                      <span className="ml-1 opacity-70">({pot.teams.length} tim)</span>
                    </div>
                    <div className="p-2 space-y-1">
                      {pot.teams.map((t, j) => (
                        <div key={t.id} className="flex items-center gap-1.5 rounded bg-stone-50 px-2 py-1 text-[11px]">
                          <span className="text-[9px] font-bold text-stone-400 w-4">{j + 1}.</span>
                          <span className="text-stone-700 font-medium truncate">{t.name}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="border-t border-stone-200 pt-3">
          {genStep === 'config' && (
            <>
              <Button variant="outline" onClick={() => handleOpenChange(false)} className="border-stone-300 text-stone-600">Batal</Button>
              <Button onClick={handleStartShuffle} disabled={parseInt(genNumPots) <= 0 || parseInt(genTeamsPerPot) <= 0 || teams.length === 0} className="bg-porjar-red hover:bg-porjar-red-dark text-white">
                <ArrowsClockwise size={16} className="mr-1" />
                Mulai Acak
              </Button>
            </>
          )}
          {genStep === 'shuffling' && (
            <p className="text-xs text-stone-400 w-full text-center">Tunggu sebentar...</p>
          )}
          {genStep === 'result' && (
            <>
              <Button variant="outline" onClick={handleStartShuffle} className="border-stone-300 text-stone-600">
                <ArrowsClockwise size={14} className="mr-1" />
                Acak Ulang
              </Button>
              <Button onClick={handleSavePots} disabled={saving} className="bg-porjar-red hover:bg-porjar-red-dark text-white">
                {saving ? 'Menyimpan...' : 'Simpan POT'}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
