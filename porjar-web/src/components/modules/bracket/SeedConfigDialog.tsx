'use client'

import { useState, useMemo, useEffect, useRef } from 'react'
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
  ClipboardText,
  ListNumbers,
  WarningCircle,
  CheckCircle,
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
type Mode = 'shuffle' | 'paste'

// Normalize string for fuzzy matching: lowercase, trim, collapse whitespace
function normalize(s: string): string {
  return s.toLowerCase().trim().replace(/\s+/g, ' ')
}

// Try to find a matching team by name (exact first, then fuzzy)
function findTeamMatch(input: string, teams: Team[], usedIds: Set<string>): Team | null {
  const norm = normalize(input)
  if (!norm) return null

  // Exact match (normalized)
  for (const t of teams) {
    if (!usedIds.has(t.id) && normalize(t.name) === norm) return t
  }

  // Starts-with match
  for (const t of teams) {
    if (!usedIds.has(t.id) && normalize(t.name).startsWith(norm)) return t
  }

  // Contains match
  for (const t of teams) {
    if (!usedIds.has(t.id) && normalize(t.name).includes(norm)) return t
  }

  return null
}

export function SeedConfigDialog({ open, teams, onConfirm, onCancel }: SeedConfigDialogProps) {
  const [step, setStep] = useState<Step>('teams')
  const [mode, setMode] = useState<Mode>('shuffle')
  const [seeds, setSeeds] = useState<SeedEntry[]>([])
  const [shuffleSeeds, setShuffleSeeds] = useState<SeedEntry[]>([])
  const [pasteText, setPasteText] = useState('')
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

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
    if (open) {
      setStep('teams')
      setMode('shuffle')
      setPasteText('')
    }
  }, [open])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
      if (timeoutRef.current) clearTimeout(timeoutRef.current)
    }
  }, [])

  // Focus textarea when switching to paste mode
  useEffect(() => {
    if (mode === 'paste' && step === 'teams') {
      setTimeout(() => textareaRef.current?.focus(), 100)
    }
  }, [mode, step])

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

  // Parse paste text and match to teams
  const pasteResults = useMemo(() => {
    const lines = pasteText.split('\n').map(l => l.trim()).filter(Boolean)
    const matched: { line: string; team: Team | null; seed: number }[] = []
    const usedIds = new Set<string>()

    for (let i = 0; i < lines.length; i++) {
      const team = findTeamMatch(lines[i], teams, usedIds)
      if (team) usedIds.add(team.id)
      matched.push({ line: lines[i], team, seed: i + 1 })
    }

    return matched
  }, [pasteText, teams])

  const pasteMatchedCount = pasteResults.filter(r => r.team).length
  const pasteUnmatchedCount = pasteResults.filter(r => !r.team).length
  const canApplyPaste = pasteResults.length >= 2 && pasteUnmatchedCount === 0

  function applyPasteOrder() {
    const newSeeds: SeedEntry[] = pasteResults
      .filter(r => r.team)
      .map((r, i) => ({
        teamId: r.team!.id,
        teamName: r.team!.name,
        logoUrl: r.team!.logo_url,
        seed: i + 1,
      }))
    setSeeds(newSeeds)
    setStep('preview')
  }

  // Matchup preview from seeds
  const matchupPreview = useMemo(() => {
    const sorted = [...seeds].sort((a, b) => a.seed - b.seed)
    const matchups: { a: SeedEntry; b: SeedEntry | null }[] = []
    const count = sorted.length
    const half = Math.ceil(count / 2)
    for (let i = 0; i < half; i++) {
      matchups.push({
        a: sorted[i],
        b: i + half < count ? sorted[i + half] : null,
      })
    }
    return matchups
  }, [seeds])

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
      <DialogContent className="bg-white dark:bg-zinc-900 border-stone-200 dark:border-zinc-700 text-stone-800 dark:text-zinc-200 sm:max-w-2xl max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-stone-900 dark:text-zinc-100">
            {step === 'teams' && mode === 'shuffle' && <><TreeStructure size={20} className="text-esi-red" /> Acak Bagan</>}
            {step === 'teams' && mode === 'paste' && <><ClipboardText size={20} className="text-esi-red" /> Paste Urutan Tim</>}
            {step === 'shuffling' && <><ArrowsClockwise size={20} className="text-esi-red animate-spin" /> Mengacak Bagan...</>}
            {step === 'preview' && <><TreeStructure size={20} className="text-esi-red" /> {mode === 'paste' ? 'Preview Urutan Manual' : 'Hasil Pengacakan'}</>}
          </DialogTitle>
          <DialogDescription className="text-stone-500 dark:text-zinc-400">
            {step === 'teams' && mode === 'shuffle' && `${teams.length} tim akan diacak posisinya di bagan turnamen`}
            {step === 'teams' && mode === 'paste' && 'Paste nama tim satu per baris, urutan = seed'}
            {step === 'shuffling' && 'Tunggu 5 detik...'}
            {step === 'preview' && 'Periksa hasil bagan, lalu generate bracket'}
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto py-2">
          {/* Step 1: Show teams or paste */}
          {step === 'teams' && (
            <div className="space-y-3">
              {/* Mode toggle */}
              <div className="flex rounded-lg border border-stone-200 dark:border-zinc-700 overflow-hidden">
                <button
                  onClick={() => setMode('shuffle')}
                  className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-semibold transition-colors ${
                    mode === 'shuffle'
                      ? 'bg-esi-red text-white'
                      : 'bg-white dark:bg-zinc-900 text-stone-500 dark:text-zinc-400 hover:bg-stone-50 dark:hover:bg-zinc-800'
                  }`}
                >
                  <Shuffle size={14} />
                  Acak Otomatis
                </button>
                <button
                  onClick={() => setMode('paste')}
                  className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-semibold transition-colors ${
                    mode === 'paste'
                      ? 'bg-esi-red text-white'
                      : 'bg-white dark:bg-zinc-900 text-stone-500 dark:text-zinc-400 hover:bg-stone-50 dark:hover:bg-zinc-800'
                  }`}
                >
                  <ClipboardText size={14} />
                  Paste Manual
                </button>
              </div>

              {mode === 'shuffle' && (
                <>
                  <p className="text-xs font-semibold text-stone-400 dark:text-zinc-500 uppercase tracking-wider">
                    Tim Terdaftar ({teams.length})
                  </p>
                  <div className="max-h-[350px] overflow-y-auto rounded-lg border border-stone-200 dark:border-zinc-700">
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-px bg-stone-100 dark:bg-zinc-800">
                      {teams.map((t) => (
                        <div key={t.id} className="flex items-center gap-2 bg-white dark:bg-zinc-900 px-3 py-2">
                          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-stone-50 dark:bg-zinc-800/50 border border-stone-200 dark:border-zinc-700">
                            {t.logo_url ? (
                              <img src={mediaUrl(t.logo_url)!} alt="" className="h-5 w-5 object-cover rounded" />
                            ) : (
                              <Trophy size={12} className="text-stone-400 dark:text-zinc-500" />
                            )}
                          </div>
                          <span className="text-[11px] font-medium text-stone-700 dark:text-zinc-300 truncate">{t.name}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              )}

              {mode === 'paste' && (
                <>
                  <div className="rounded-lg border border-stone-200 dark:border-zinc-700 overflow-hidden">
                    <textarea
                      ref={textareaRef}
                      value={pasteText}
                      onChange={(e) => setPasteText(e.target.value)}
                      placeholder={`Paste nama tim, satu per baris:\nSMP Negeri 1 Denpasar\nSMP Negeri 2 Denpasar\nSMP Negeri 3 Denpasar\n...`}
                      rows={8}
                      className="w-full resize-none bg-white dark:bg-zinc-900 px-3 py-2.5 text-sm text-stone-800 dark:text-zinc-200 placeholder:text-stone-400 dark:placeholder:text-zinc-600 focus:outline-none font-mono"
                    />
                  </div>

                  {/* Match results */}
                  {pasteResults.length > 0 && (
                    <div className="space-y-2">
                      <div className="flex items-center gap-3 text-xs">
                        <span className="flex items-center gap-1 text-green-600">
                          <CheckCircle size={14} weight="fill" />
                          {pasteMatchedCount} cocok
                        </span>
                        {pasteUnmatchedCount > 0 && (
                          <span className="flex items-center gap-1 text-red-500">
                            <WarningCircle size={14} weight="fill" />
                            {pasteUnmatchedCount} tidak ditemukan
                          </span>
                        )}
                      </div>

                      <div className="max-h-[200px] overflow-y-auto rounded-lg border border-stone-200 dark:border-zinc-700">
                        {pasteResults.map((r, i) => (
                          <div
                            key={i}
                            className={`flex items-center gap-2 px-3 py-1.5 text-xs border-b last:border-b-0 border-stone-100 dark:border-zinc-800 ${
                              r.team
                                ? 'bg-white dark:bg-zinc-900'
                                : 'bg-red-50 dark:bg-red-950/20'
                            }`}
                          >
                            <span className="w-6 text-center font-bold text-esi-red shrink-0">{r.seed}</span>
                            {r.team ? (
                              <>
                                <CheckCircle size={14} className="text-green-500 shrink-0" weight="fill" />
                                <span className="font-medium text-stone-800 dark:text-zinc-200 truncate">{r.team.name}</span>
                                {normalize(r.line) !== normalize(r.team.name) && (
                                  <span className="text-stone-400 dark:text-zinc-500 truncate ml-auto text-[10px]">
                                    &larr; &quot;{r.line}&quot;
                                  </span>
                                )}
                              </>
                            ) : (
                              <>
                                <WarningCircle size={14} className="text-red-500 shrink-0" weight="fill" />
                                <span className="font-medium text-red-600 dark:text-red-400 truncate">&quot;{r.line}&quot;</span>
                                <span className="text-red-400 dark:text-red-500 text-[10px] ml-auto shrink-0">tidak ditemukan</span>
                              </>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {/* Step 2: Shuffling animation */}
          {step === 'shuffling' && (
            <div className="space-y-3">
              <div className="text-center py-3">
                <div className="inline-flex items-center gap-2 rounded-full bg-esi-red/10 px-4 py-2 text-sm font-bold text-esi-red">
                  <ArrowsClockwise size={18} className="animate-spin" />
                  Mengacak posisi...
                </div>
              </div>
              <div className="max-h-[300px] overflow-y-auto rounded-lg border border-stone-200 dark:border-zinc-700">
                <div className="grid grid-cols-2 gap-px bg-stone-100 dark:bg-zinc-800">
                  {displaySorted.map((entry) => (
                    <div key={entry.teamId} className="flex items-center gap-2 bg-white dark:bg-zinc-900 px-3 py-1.5 transition-all duration-75">
                      <span className="w-6 text-center text-xs font-bold text-esi-red">{entry.seed}</span>
                      <span className="text-[11px] font-medium text-stone-700 dark:text-zinc-300 truncate">{entry.teamName}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Step 3: Preview matchups */}
          {step === 'preview' && (
            <div className="space-y-4">
              <div>
                <p className="text-xs font-semibold text-stone-400 dark:text-zinc-500 uppercase tracking-wider mb-2">
                  Preview Ronde 1 ({matchupPreview.length} match)
                </p>
                <div className="max-h-[350px] overflow-y-auto space-y-1.5">
                  {matchupPreview.map((m, i) => (
                    <div key={i} className="flex items-center gap-2 rounded-lg bg-stone-50 dark:bg-zinc-800/50 border border-stone-200 dark:border-zinc-700 px-3 py-2 text-xs">
                      <span className="text-[10px] font-bold text-stone-400 dark:text-zinc-500 w-7">M{i + 1}</span>
                      <div className="flex-1 flex items-center gap-1 truncate">
                        <span className="text-esi-red font-mono text-[10px]">#{m.a.seed}</span>
                        <span className="font-medium text-stone-800 dark:text-zinc-200 truncate">{m.a.teamName}</span>
                      </div>
                      <span className="text-[10px] font-bold text-stone-400 dark:text-zinc-500 px-2">VS</span>
                      <div className="flex-1 flex items-center gap-1 justify-end truncate">
                        {m.b ? (
                          <>
                            <span className="font-medium text-stone-800 dark:text-zinc-200 truncate text-right">{m.b.teamName}</span>
                            <span className="text-esi-red font-mono text-[10px]">#{m.b.seed}</span>
                          </>
                        ) : (
                          <span className="text-stone-400 dark:text-zinc-500 italic">BYE</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="border-t border-stone-200 dark:border-zinc-700 pt-4">
          {step === 'teams' && mode === 'shuffle' && (
            <>
              <Button variant="outline" onClick={handleClose} className="border-stone-200 dark:border-zinc-700 text-stone-700 dark:text-zinc-300">
                Batal
              </Button>
              <Button onClick={startShuffle} disabled={teams.length < 2} className="bg-esi-red hover:bg-esi-red-dark text-white">
                <Shuffle size={16} className="mr-1.5" />
                Mulai Acak
              </Button>
            </>
          )}
          {step === 'teams' && mode === 'paste' && (
            <>
              <Button variant="outline" onClick={handleClose} className="border-stone-200 dark:border-zinc-700 text-stone-700 dark:text-zinc-300">
                Batal
              </Button>
              <Button onClick={applyPasteOrder} disabled={!canApplyPaste} className="bg-esi-red hover:bg-esi-red-dark text-white">
                <ListNumbers size={16} className="mr-1.5" />
                Terapkan Urutan ({pasteMatchedCount} tim)
              </Button>
            </>
          )}
          {step === 'shuffling' && (
            <p className="text-xs text-stone-400 dark:text-zinc-500 w-full text-center">Tunggu sebentar...</p>
          )}
          {step === 'preview' && (
            <>
              <Button
                variant="outline"
                onClick={() => { setStep('teams') }}
                className="border-stone-200 dark:border-zinc-700 text-stone-700 dark:text-zinc-300"
              >
                {mode === 'paste' ? (
                  <><ClipboardText size={14} className="mr-1" /> Ubah Urutan</>
                ) : (
                  <><ArrowsClockwise size={14} className="mr-1" /> Acak Ulang</>
                )}
              </Button>
              <Button onClick={handleConfirm} className="bg-esi-red hover:bg-esi-red-dark text-white">
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
