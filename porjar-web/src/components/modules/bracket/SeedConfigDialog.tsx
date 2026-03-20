'use client'

import { useState, useMemo, useCallback, useEffect, useRef } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import {
  Shuffle,
  TreeStructure,
  Trophy,
  ArrowsClockwise,
} from '@phosphor-icons/react'
import type { Team } from '@/types'
import { mediaUrl } from '@/lib/utils'

interface SeedConfigDialogProps {
  open: boolean
  teams: Team[]
  onConfirm: (seeds: { teamId: string; seed: number }[]) => void
  onCancel: () => void
}

interface SeedEntry {
  teamId: string
  teamName: string
  logoUrl: string | null
  seed: number
}

type Step = 'teams' | 'shuffling' | 'preview'

export function SeedConfigDialog({ open, teams, onConfirm, onCancel }: SeedConfigDialogProps) {
  const [step, setStep] = useState<Step>('teams')
  const [seeds, setSeeds] = useState<SeedEntry[]>([])
  const [shuffleSeeds, setShuffleSeeds] = useState<SeedEntry[]>([])
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Initialize seeds when teams change
  useEffect(() => {
    if (teams.length > 0) {
      setSeeds(teams.map((t, i) => ({
        teamId: t.id,
        teamName: t.name,
        logoUrl: t.logo_url,
        seed: i + 1,
      })))
    }
  }, [teams])

  // Reset step when dialog opens
  useEffect(() => {
    if (open) setStep('teams')
  }, [open])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
      if (timeoutRef.current) clearTimeout(timeoutRef.current)
    }
  }, [])

  function fisherYatesShuffle(arr: SeedEntry[]): SeedEntry[] {
    const a = [...arr]
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1))
      ;[a[i], a[j]] = [a[j], a[i]]
    }
    return a.map((s, i) => ({ ...s, seed: i + 1 }))
  }

  function startShuffle() {
    setStep('shuffling')

    // Roulette: shuffle every 100ms for 5 seconds
    intervalRef.current = setInterval(() => {
      setShuffleSeeds(fisherYatesShuffle(seeds))
    }, 100)

    timeoutRef.current = setTimeout(() => {
      if (intervalRef.current) clearInterval(intervalRef.current)
      const final = fisherYatesShuffle(seeds)
      setShuffleSeeds(final)
      setSeeds(final)
      setStep('preview')
    }, 5000)
  }

  function reshuffle() {
    startShuffle()
  }

  // Matchup preview from seeds
  const matchupPreview = useMemo(() => {
    const sorted = [...seeds].sort((a, b) => a.seed - b.seed)
    const matchups: { a: SeedEntry; b: SeedEntry | null }[] = []
    const count = sorted.length
    // Standard bracket pairing: seed 1 vs seed N, seed 2 vs seed N-1, etc.
    const half = Math.ceil(count / 2)
    for (let i = 0; i < half; i++) {
      matchups.push({
        a: sorted[i],
        b: i + half < count ? sorted[i + half] : null,
      })
    }
    return matchups
  }, [seeds])

  // Display seeds during shuffle or final
  const displaySeeds = step === 'shuffling' ? shuffleSeeds : seeds
  const displaySorted = [...displaySeeds].sort((a, b) => a.seed - b.seed)

  function handleConfirm() {
    onConfirm(seeds.map((s) => ({ teamId: s.teamId, seed: s.seed })))
  }

  function handleClose() {
    if (intervalRef.current) clearInterval(intervalRef.current)
    if (timeoutRef.current) clearTimeout(timeoutRef.current)
    setStep('teams')
    onCancel()
  }

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && handleClose()}>
      <DialogContent className="bg-white border-stone-200 text-stone-800 sm:max-w-2xl max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-stone-900">
            {step === 'teams' && <><TreeStructure size={20} className="text-porjar-red" /> Acak Bagan</>}
            {step === 'shuffling' && <><ArrowsClockwise size={20} className="text-porjar-red animate-spin" /> Mengacak Bagan...</>}
            {step === 'preview' && <><TreeStructure size={20} className="text-porjar-red" /> Hasil Pengacakan</>}
          </DialogTitle>
          <DialogDescription className="text-stone-500">
            {step === 'teams' && `${teams.length} tim akan diacak posisinya di bagan turnamen`}
            {step === 'shuffling' && 'Tunggu 5 detik...'}
            {step === 'preview' && 'Periksa hasil pengacakan bagan, lalu generate bracket'}
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto py-2">
          {/* Step 1: Show teams */}
          {step === 'teams' && (
            <div className="space-y-3">
              <p className="text-xs font-semibold text-stone-400 uppercase tracking-wider">
                Tim Terdaftar ({teams.length})
              </p>
              <div className="max-h-[350px] overflow-y-auto rounded-lg border border-stone-200">
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-px bg-stone-100">
                  {teams.map((t) => (
                    <div key={t.id} className="flex items-center gap-2 bg-white px-3 py-2">
                      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-stone-50 border border-stone-200">
                        {t.logo_url ? (
                          <img src={mediaUrl(t.logo_url)!} alt="" className="h-5 w-5 object-cover rounded" />
                        ) : (
                          <Trophy size={12} className="text-stone-400" />
                        )}
                      </div>
                      <span className="text-[11px] font-medium text-stone-700 truncate">{t.name}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Step 2: Shuffling animation */}
          {step === 'shuffling' && (
            <div className="space-y-3">
              <div className="text-center py-3">
                <div className="inline-flex items-center gap-2 rounded-full bg-porjar-red/10 px-4 py-2 text-sm font-bold text-porjar-red">
                  <ArrowsClockwise size={18} className="animate-spin" />
                  Mengacak posisi...
                </div>
              </div>
              <div className="max-h-[300px] overflow-y-auto rounded-lg border border-stone-200">
                <div className="grid grid-cols-2 gap-px bg-stone-100">
                  {displaySorted.map((entry) => (
                    <div key={entry.teamId} className="flex items-center gap-2 bg-white px-3 py-1.5 transition-all duration-75">
                      <span className="w-6 text-center text-xs font-bold text-porjar-red">{entry.seed}</span>
                      <span className="text-[11px] font-medium text-stone-700 truncate">{entry.teamName}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Step 3: Preview matchups */}
          {step === 'preview' && (
            <div className="space-y-4">
              {/* Matchup preview */}
              <div>
                <p className="text-xs font-semibold text-stone-400 uppercase tracking-wider mb-2">
                  Preview Ronde 1 ({matchupPreview.length} match)
                </p>
                <div className="max-h-[350px] overflow-y-auto space-y-1.5">
                  {matchupPreview.map((m, i) => (
                    <div key={i} className="flex items-center gap-2 rounded-lg bg-stone-50 border border-stone-200 px-3 py-2 text-xs">
                      <span className="text-[10px] font-bold text-stone-400 w-7">M{i + 1}</span>
                      <div className="flex-1 flex items-center gap-1 truncate">
                        <span className="text-porjar-red font-mono text-[10px]">#{m.a.seed}</span>
                        <span className="font-medium text-stone-800 truncate">{m.a.teamName}</span>
                      </div>
                      <span className="text-[10px] font-bold text-stone-400 px-2">VS</span>
                      <div className="flex-1 flex items-center gap-1 justify-end truncate">
                        {m.b ? (
                          <>
                            <span className="font-medium text-stone-800 truncate text-right">{m.b.teamName}</span>
                            <span className="text-porjar-red font-mono text-[10px]">#{m.b.seed}</span>
                          </>
                        ) : (
                          <span className="text-stone-400 italic">BYE</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="border-t border-stone-200 pt-4">
          {step === 'teams' && (
            <>
              <Button variant="outline" onClick={handleClose} className="border-stone-200 text-stone-700">
                Batal
              </Button>
              <Button onClick={startShuffle} disabled={teams.length < 2} className="bg-porjar-red hover:bg-porjar-red-dark text-white">
                <Shuffle size={16} className="mr-1.5" />
                Mulai Acak
              </Button>
            </>
          )}
          {step === 'shuffling' && (
            <p className="text-xs text-stone-400 w-full text-center">Tunggu sebentar...</p>
          )}
          {step === 'preview' && (
            <>
              <Button variant="outline" onClick={reshuffle} className="border-stone-200 text-stone-700">
                <ArrowsClockwise size={14} className="mr-1" />
                Acak Ulang
              </Button>
              <Button onClick={handleConfirm} className="bg-porjar-red hover:bg-porjar-red-dark text-white">
                <TreeStructure size={16} className="mr-1.5" />
                Generate Bracket
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
