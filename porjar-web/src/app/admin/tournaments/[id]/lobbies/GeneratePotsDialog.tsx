'use client'

import { useState, useMemo } from 'react'
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
import { ArrowsClockwise, PencilSimple, CheckCircle, Warning } from '@phosphor-icons/react'
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

/** Simple fuzzy match: returns 0-1 similarity score */
function similarity(a: string, b: string): number {
  a = a.toLowerCase().trim()
  b = b.toLowerCase().trim()
  if (a === b) return 1
  if (a.includes(b) || b.includes(a)) return 0.9
  // Bigram similarity
  const bigrams = (s: string) => {
    const set: string[] = []
    for (let i = 0; i < s.length - 1; i++) set.push(s.slice(i, i + 2))
    return set
  }
  const aG = bigrams(a)
  const bG = bigrams(b)
  if (aG.length === 0 || bG.length === 0) return 0
  let hits = 0
  const bCopy = [...bG]
  for (const g of aG) {
    const idx = bCopy.indexOf(g)
    if (idx !== -1) { hits++; bCopy.splice(idx, 1) }
  }
  return (2 * hits) / (aG.length + bG.length)
}

function fuzzyMatch(name: string, teams: TeamSummary[]): TeamSummary | null {
  let best: TeamSummary | null = null
  let bestScore = 0
  for (const t of teams) {
    const s = similarity(name, t.name)
    if (s > bestScore) { bestScore = s; best = t }
  }
  return bestScore >= 0.5 ? best : null
}

type Mode = 'random' | 'manual'

export function GeneratePotsDialog({
  open,
  onOpenChange,
  teams,
  lobbiesCount,
  onSave,
}: GeneratePotsDialogProps) {
  const [mode, setMode] = useState<Mode>('random')

  // --- Random mode state ---
  const [genNumPots, setGenNumPots] = useState('2')
  const [genTeamsPerPot, setGenTeamsPerPot] = useState('6')
  const [genDay, setGenDay] = useState('1')
  const [genStep, setGenStep] = useState<'config' | 'shuffling' | 'result'>('config')
  const [shuffleDisplay, setShuffleDisplay] = useState<string[][]>([])
  const [finalPots, setFinalPots] = useState<{ name: string; teams: TeamSummary[] }[]>([])
  const [saving, setSaving] = useState(false)

  // --- Manual mode state ---
  const [manNumPots, setManNumPots] = useState('2')
  const [manDay, setManDay] = useState('1')
  const [manTexts, setManTexts] = useState<string[]>(['', ''])
  const [manStep, setManStep] = useState<'input' | 'preview'>('input')

  function reset() {
    setGenStep('config')
    setFinalPots([])
    setShuffleDisplay([])
    setManStep('input')
    setManTexts(Array(parseInt(manNumPots) || 2).fill(''))
  }

  function handleOpenChange(nextOpen: boolean) {
    if (!nextOpen) reset()
    onOpenChange(nextOpen)
  }

  // Sync manTexts length when manNumPots changes
  function handleManNumPotsChange(val: string) {
    setManNumPots(val)
    const n = parseInt(val) || 2
    setManTexts(prev => {
      const next = [...prev]
      while (next.length < n) next.push('')
      return next.slice(0, n)
    })
  }

  // --- Random shuffle logic ---
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

  async function handleSaveRandom() {
    const day = parseInt(genDay) || 1
    setSaving(true)
    try {
      await onSave(finalPots, day)
      reset()
    } finally {
      setSaving(false)
    }
  }

  // --- Manual preview ---
  interface MatchedLine { raw: string; team: TeamSummary | null }
  interface ManualPot { name: string; lines: MatchedLine[] }

  const manualPreviews: ManualPot[] = useMemo(() => {
    return manTexts.map((text, i) => {
      const lines = text.split('\n').map(l => l.trim()).filter(Boolean)
      return {
        name: `POT ${i + 1}`,
        lines: lines.map(raw => ({ raw, team: fuzzyMatch(raw, teams) })),
      }
    })
  }, [manTexts, teams])

  const allAssigned = useMemo(() => {
    if (manStep !== 'preview') return false
    const usedIds = new Set<string>()
    for (const pot of manualPreviews) {
      for (const l of pot.lines) {
        if (!l.team) return false
        if (usedIds.has(l.team.id)) return false
        usedIds.add(l.team.id)
      }
    }
    return manualPreviews.some(p => p.lines.length > 0)
  }, [manualPreviews, manStep])

  async function handleSaveManual() {
    const day = parseInt(manDay) || 1
    const pots = manualPreviews.map(p => ({
      name: p.name,
      teams: p.lines.map(l => l.team).filter(Boolean) as TeamSummary[],
    }))
    setSaving(true)
    try {
      await onSave(pots, day)
      reset()
    } finally {
      setSaving(false)
    }
  }

  // Teams already assigned in manual pots (for duplicate detection)
  const assignedTeamIds = useMemo(() => {
    const ids = new Set<string>()
    for (const pot of manualPreviews) {
      for (const l of pot.lines) {
        if (l.team) ids.add(l.team.id)
      }
    }
    return ids
  }, [manualPreviews])

  function isDuplicate(line: MatchedLine, potIdx: number, lineIdx: number): boolean {
    if (!line.team) return false
    for (let pi = 0; pi < manualPreviews.length; pi++) {
      for (let li = 0; li < manualPreviews[pi].lines.length; li++) {
        if (pi === potIdx && li === lineIdx) continue
        if (manualPreviews[pi].lines[li].team?.id === line.team.id) return true
      }
    }
    return false
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="bg-white dark:bg-zinc-900 border-stone-200 dark:border-zinc-700 sm:max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="text-stone-900 dark:text-zinc-100">
            {mode === 'random'
              ? (genStep === 'config' ? 'Acak POT' : genStep === 'shuffling' ? 'Mengacak Tim...' : 'Hasil Pengacakan')
              : (manStep === 'input' ? 'Input Manual POT' : 'Preview Penugasan')}
          </DialogTitle>
          <DialogDescription className="text-stone-500 dark:text-zinc-400">
            {mode === 'random' && genStep === 'config' && `${teams.length} tim terdaftar — atur jumlah POT lalu acak`}
            {mode === 'random' && genStep === 'shuffling' && 'Tunggu 5 detik...'}
            {mode === 'random' && genStep === 'result' && 'Periksa hasil pengacakan, lalu simpan'}
            {mode === 'manual' && manStep === 'input' && `${teams.length} tim terdaftar — ketik/paste nama tim per baris di setiap POT`}
            {mode === 'manual' && manStep === 'preview' && 'Periksa pencocokan nama, lalu simpan'}
          </DialogDescription>
        </DialogHeader>

        {/* Mode toggle — only shown on first step */}
        {((mode === 'random' && genStep === 'config') || (mode === 'manual' && manStep === 'input')) && (
          <div className="flex gap-1 rounded-lg border border-stone-200 dark:border-zinc-700 p-1 w-fit">
            <button
              onClick={() => setMode('random')}
              className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold transition-colors ${
                mode === 'random' ? 'bg-esi-red text-white' : 'text-stone-500 dark:text-zinc-400 hover:bg-stone-50 dark:hover:bg-zinc-800'
              }`}
            >
              <ArrowsClockwise size={13} /> Acak Otomatis
            </button>
            <button
              onClick={() => setMode('manual')}
              className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold transition-colors ${
                mode === 'manual' ? 'bg-esi-red text-white' : 'text-stone-500 dark:text-zinc-400 hover:bg-stone-50 dark:hover:bg-zinc-800'
              }`}
            >
              <PencilSimple size={13} /> Input Manual
            </button>
          </div>
        )}

        <div className="flex-1 overflow-y-auto py-2">

          {/* ====== RANDOM MODE ====== */}
          {mode === 'random' && (
            <>
              {genStep === 'config' && (
                <div className="space-y-4">
                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className="mb-1 block text-xs font-medium text-stone-500 dark:text-zinc-400">Jumlah POT</label>
                      <Input type="number" min="1" max="20" value={genNumPots} onChange={(e) => setGenNumPots(e.target.value)} className="bg-white dark:bg-zinc-900 border-stone-300 dark:border-zinc-600 text-sm focus:border-esi-red" />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-medium text-stone-500 dark:text-zinc-400">Tim per POT</label>
                      <Input type="number" min="1" max="20" value={genTeamsPerPot} onChange={(e) => setGenTeamsPerPot(e.target.value)} className="bg-white dark:bg-zinc-900 border-stone-300 dark:border-zinc-600 text-sm focus:border-esi-red" />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-medium text-stone-500 dark:text-zinc-400">Day</label>
                      <Input type="number" min="1" value={genDay} onChange={(e) => setGenDay(e.target.value)} className="bg-white dark:bg-zinc-900 border-stone-300 dark:border-zinc-600 text-sm focus:border-esi-red" />
                    </div>
                  </div>
                  <div className="rounded-lg bg-stone-50 dark:bg-zinc-800/50 border border-stone-200 dark:border-zinc-700 p-3 text-xs text-stone-600 dark:text-zinc-400">
                    <p>{genNumPots} POT x {genTeamsPerPot} tim = <strong>{(parseInt(genNumPots) || 0) * (parseInt(genTeamsPerPot) || 0)} slot</strong></p>
                    <p>{teams.length} tim terdaftar</p>
                    {(parseInt(genNumPots) || 0) * (parseInt(genTeamsPerPot) || 0) < teams.length && (
                      <p className="text-amber-600 font-medium mt-1">Slot kurang! {teams.length - (parseInt(genNumPots) || 0) * (parseInt(genTeamsPerPot) || 0)} tim tidak masuk</p>
                    )}
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-stone-400 dark:text-zinc-500 uppercase tracking-wider mb-2">Tim Terdaftar ({teams.length})</p>
                    <div className="max-h-[200px] overflow-y-auto rounded-lg border border-stone-200 dark:border-zinc-700">
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-px bg-stone-100 dark:bg-zinc-800">
                        {teams.map((t) => (
                          <div key={t.id} className="bg-white dark:bg-zinc-900 px-2.5 py-1.5 text-[11px] font-medium text-stone-700 dark:text-zinc-300 truncate">
                            {t.name}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {genStep === 'shuffling' && (
                <div className="space-y-3">
                  <div className="text-center py-4">
                    <div className="inline-flex items-center gap-2 rounded-full bg-esi-red/10 px-4 py-2 text-sm font-bold text-esi-red">
                      <ArrowsClockwise size={18} className="animate-spin" />
                      Mengacak...
                    </div>
                  </div>
                  <div className="grid gap-3" style={{ gridTemplateColumns: `repeat(${Math.min(parseInt(genNumPots) || 2, 4)}, 1fr)` }}>
                    {shuffleDisplay.map((potTeams, i) => (
                      <div key={i} className="rounded-lg border border-stone-200 dark:border-zinc-700 overflow-hidden">
                        <div className="bg-esi-red px-3 py-1.5 text-xs font-bold text-white text-center">POT {i + 1}</div>
                        <div className="p-2 space-y-0.5 min-h-[100px]">
                          {potTeams.map((name, j) => (
                            <div key={j} className="rounded bg-stone-50 dark:bg-zinc-800/50 px-2 py-0.5 text-[10px] text-stone-600 dark:text-zinc-400 truncate transition-all duration-75">
                              {name}
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {genStep === 'result' && (
                <div className="grid gap-3" style={{ gridTemplateColumns: `repeat(${Math.min(finalPots.length, 4)}, 1fr)` }}>
                  {finalPots.map((pot, i) => (
                    <div key={i} className="rounded-lg border border-stone-200 dark:border-zinc-700 overflow-hidden">
                      <div className="bg-esi-red px-3 py-2 text-xs font-bold text-white text-center">
                        {pot.name}
                        <span className="ml-1 opacity-70">({pot.teams.length} tim)</span>
                      </div>
                      <div className="p-2 space-y-1">
                        {pot.teams.map((t, j) => (
                          <div key={t.id} className="flex items-center gap-1.5 rounded bg-stone-50 dark:bg-zinc-800/50 px-2 py-1 text-[11px]">
                            <span className="text-[9px] font-bold text-stone-400 dark:text-zinc-500 w-4">{j + 1}.</span>
                            <span className="text-stone-700 dark:text-zinc-300 font-medium truncate">{t.name}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}

          {/* ====== MANUAL MODE ====== */}
          {mode === 'manual' && (
            <>
              {manStep === 'input' && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="mb-1 block text-xs font-medium text-stone-500 dark:text-zinc-400">Jumlah POT</label>
                      <Input
                        type="number" min="1" max="20"
                        value={manNumPots}
                        onChange={(e) => handleManNumPotsChange(e.target.value)}
                        className="bg-white dark:bg-zinc-900 border-stone-300 dark:border-zinc-600 text-sm focus:border-esi-red"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-medium text-stone-500 dark:text-zinc-400">Day</label>
                      <Input
                        type="number" min="1"
                        value={manDay}
                        onChange={(e) => setManDay(e.target.value)}
                        className="bg-white dark:bg-zinc-900 border-stone-300 dark:border-zinc-600 text-sm focus:border-esi-red"
                      />
                    </div>
                  </div>

                  <div className="grid gap-3" style={{ gridTemplateColumns: `repeat(${Math.min(parseInt(manNumPots) || 2, 3)}, 1fr)` }}>
                    {manTexts.map((text, i) => (
                      <div key={i}>
                        <label className="mb-1 block text-xs font-semibold text-stone-600 dark:text-zinc-400">POT {i + 1}</label>
                        <textarea
                          value={text}
                          onChange={(e) => {
                            const next = [...manTexts]
                            next[i] = e.target.value
                            setManTexts(next)
                          }}
                          placeholder={"Nama tim, satu per baris\nContoh:\nSMAN 1 Denpasar A\nSMKN 2 Denpasar"}
                          rows={8}
                          className="w-full rounded-lg border border-stone-300 dark:border-zinc-600 bg-white dark:bg-zinc-900 px-3 py-2 text-xs text-stone-800 dark:text-zinc-200 placeholder:text-stone-400 dark:placeholder:text-zinc-500 focus:outline-none focus:border-esi-red resize-y"
                        />
                        <p className="mt-0.5 text-[10px] text-stone-400 dark:text-zinc-500">
                          {text.split('\n').filter(l => l.trim()).length} baris
                        </p>
                      </div>
                    ))}
                  </div>

                  <div className="rounded-lg bg-stone-50 dark:bg-zinc-800/50 border border-stone-200 dark:border-zinc-700 p-3 text-xs text-stone-600 dark:text-zinc-400">
                    <p className="font-semibold text-stone-500 dark:text-zinc-400 uppercase tracking-wider text-[10px] mb-1.5">Tim Terdaftar ({teams.length})</p>
                    <div className="max-h-[100px] overflow-y-auto columns-2 gap-2">
                      {teams.map(t => (
                        <div key={t.id} className="text-[10px] truncate leading-5">{t.name}</div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {manStep === 'preview' && (
                <div className="space-y-3">
                  <div className="grid gap-3" style={{ gridTemplateColumns: `repeat(${Math.min(manualPreviews.length, 3)}, 1fr)` }}>
                    {manualPreviews.map((pot, pi) => (
                      <div key={pi} className="rounded-lg border border-stone-200 dark:border-zinc-700 overflow-hidden">
                        <div className="bg-esi-red px-3 py-2 text-xs font-bold text-white text-center">
                          {pot.name}
                          <span className="ml-1 opacity-70">({pot.lines.length} tim)</span>
                        </div>
                        <div className="p-2 space-y-1">
                          {pot.lines.map((line, li) => {
                            const dup = isDuplicate(line, pi, li)
                            const ok = line.team && !dup
                            return (
                              <div
                                key={li}
                                className={`flex items-start gap-1.5 rounded px-2 py-1 text-[11px] ${
                                  ok
                                    ? 'bg-green-50 dark:bg-green-950/30'
                                    : 'bg-red-50 dark:bg-red-950/30'
                                }`}
                              >
                                {ok
                                  ? <CheckCircle size={12} weight="fill" className="shrink-0 mt-0.5 text-green-500" />
                                  : <Warning size={12} weight="fill" className="shrink-0 mt-0.5 text-red-500" />
                                }
                                <div className="min-w-0">
                                  {line.team && !dup ? (
                                    <p className="font-medium text-stone-700 dark:text-zinc-300 truncate">{line.team.name}</p>
                                  ) : (
                                    <>
                                      <p className="text-red-600 dark:text-red-400 truncate line-through">{line.raw}</p>
                                      {!line.team && <p className="text-[9px] text-red-500">Tidak ditemukan</p>}
                                      {dup && <p className="text-[9px] text-red-500">Duplikat</p>}
                                    </>
                                  )}
                                </div>
                              </div>
                            )
                          })}
                          {pot.lines.length === 0 && (
                            <p className="text-center text-[10px] text-stone-400 py-3">Kosong</p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>

                  {!allAssigned && (
                    <div className="rounded-lg border border-red-200 dark:border-red-800/50 bg-red-50 dark:bg-red-950/30 p-3 text-xs text-red-600 dark:text-red-400">
                      <Warning size={14} className="inline mr-1" weight="fill" />
                      Ada nama yang tidak cocok atau duplikat. Kembali dan perbaiki sebelum menyimpan.
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>

        <DialogFooter className="border-t border-stone-200 dark:border-zinc-700 pt-3">
          {/* Random mode buttons */}
          {mode === 'random' && genStep === 'config' && (
            <>
              <Button variant="outline" onClick={() => handleOpenChange(false)} className="border-stone-300 dark:border-zinc-600 text-stone-600 dark:text-zinc-400">Batal</Button>
              <Button onClick={handleStartShuffle} disabled={parseInt(genNumPots) <= 0 || parseInt(genTeamsPerPot) <= 0 || teams.length === 0} className="bg-esi-red hover:bg-esi-red-dark text-white">
                <ArrowsClockwise size={16} className="mr-1" />
                Mulai Acak
              </Button>
            </>
          )}
          {mode === 'random' && genStep === 'shuffling' && (
            <p className="text-xs text-stone-400 dark:text-zinc-500 w-full text-center">Tunggu sebentar...</p>
          )}
          {mode === 'random' && genStep === 'result' && (
            <>
              <Button variant="outline" onClick={handleStartShuffle} className="border-stone-300 dark:border-zinc-600 text-stone-600 dark:text-zinc-400">
                <ArrowsClockwise size={14} className="mr-1" />
                Acak Ulang
              </Button>
              <Button onClick={handleSaveRandom} disabled={saving} className="bg-esi-red hover:bg-esi-red-dark text-white">
                {saving ? 'Menyimpan...' : 'Simpan POT'}
              </Button>
            </>
          )}

          {/* Manual mode buttons */}
          {mode === 'manual' && manStep === 'input' && (
            <>
              <Button variant="outline" onClick={() => handleOpenChange(false)} className="border-stone-300 dark:border-zinc-600 text-stone-600 dark:text-zinc-400">Batal</Button>
              <Button
                onClick={() => setManStep('preview')}
                disabled={manTexts.every(t => !t.trim())}
                className="bg-esi-red hover:bg-esi-red-dark text-white"
              >
                Preview →
              </Button>
            </>
          )}
          {mode === 'manual' && manStep === 'preview' && (
            <>
              <Button variant="outline" onClick={() => setManStep('input')} className="border-stone-300 dark:border-zinc-600 text-stone-600 dark:text-zinc-400">
                ← Edit
              </Button>
              <Button onClick={handleSaveManual} disabled={saving || !allAssigned} className="bg-esi-red hover:bg-esi-red-dark text-white">
                {saving ? 'Menyimpan...' : 'Simpan POT'}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
