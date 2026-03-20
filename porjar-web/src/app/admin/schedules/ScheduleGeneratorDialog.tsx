'use client'

import { useState, useEffect } from 'react'
import { toast } from 'sonner'
import { api } from '@/lib/api'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import {
  ArrowRight,
  ArrowLeft,
  Trash,
  CheckCircle,
  WarningCircle,
  Info,
} from '@phosphor-icons/react'
import { cn } from '@/lib/utils'
import { GAME_CONFIG } from '@/constants/games'
import type { Tournament, BracketMatch, GameSlug } from '@/types'
import {
  type RoundConfig,
  type PreviewEntry,
  type Step,
  STEP_LABELS,
  STEPS,
  isoToLocalTime,
  setLocalTime,
  generatePreviewEntries,
} from './scheduleUtils'

// ─── Types ───────────────────────────────────────────────────────────────────

interface Props {
  open: boolean
  onOpenChange: (v: boolean) => void
  tournaments: Tournament[]
  onSaved: () => void
}

// ─── Component ───────────────────────────────────────────────────────────────

export function ScheduleGeneratorDialog({ open, onOpenChange, tournaments, onSaved }: Props) {
  const [step, setStep] = useState<Step>('tournament')
  const [tournamentId, setTournamentId] = useState('')
  const [bracketLoading, setBracketLoading] = useState(false)
  const [bracketMatches, setBracketMatches] = useState<BracketMatch[]>([])
  const [hasBracket, setHasBracket] = useState(false)
  const [isBR, setIsBR] = useState(false)

  // Config state
  const [titlePrefix, setTitlePrefix] = useState('')
  const [venue, setVenue] = useState('')
  const [durationMinStr, setDurationMinStr] = useState('45')
  const [breakMinStr, setBreakMinStr] = useState('15')
  const durationMin = parseInt(durationMinStr) || 0
  const breakMin = parseInt(breakMinStr) || 0
  const [roundConfigs, setRoundConfigs] = useState<RoundConfig[]>([])

  // Preview state
  const [entries, setEntries] = useState<PreviewEntry[]>([])
  const [saving, setSaving] = useState(false)
  const [saveProgress, setSaveProgress] = useState(0)

  const tournament = tournaments.find((t) => t.id === tournamentId)

  // Reset when dialog closes
  useEffect(() => {
    if (!open) {
      const t = setTimeout(() => {
        setStep('tournament')
        setTournamentId('')
        setBracketMatches([])
        setHasBracket(false)
        setIsBR(false)
        setTitlePrefix('')
        setVenue('')
        setDurationMinStr('45')
        setBreakMinStr('15')
        setRoundConfigs([])
        setEntries([])
        setSaveProgress(0)
      }, 200)
      return () => clearTimeout(t)
    }
  }, [open])

  // ─── Step 1: Select tournament & fetch bracket ────────────────────────────

  async function handleSelectTournament(id: string | null) {
    if (!id) return
    setTournamentId(id)
    const t = tournaments.find((t) => t.id === id)
    if (!t) return

    setTitlePrefix(t.name)
    const br = t.format === 'battle_royale_points'
    setIsBR(br)
    setBracketMatches([])
    setHasBracket(false)

    if (!br) {
      setBracketLoading(true)
      try {
        const data = await api.get<BracketMatch[]>(`/tournaments/${id}/bracket`)
        const valid = (data ?? []).filter((m) => m.status !== 'bye')
        setBracketMatches(valid)
        const has = valid.length > 0
        setHasBracket(has)

        if (has) {
          const rounds = [...new Set(valid.map((m) => m.round))].sort((a, b) => a - b)
          setRoundConfigs(
            rounds.map((round, idx) => ({
              round,
              dayNum: idx + 1,
              matches: valid
                .filter((m) => m.round === round)
                .sort((a, b) => a.match_number - b.match_number),
              date: '',
              startTime: '08:00',
            }))
          )
        }
      } catch {
        setHasBracket(false)
      } finally {
        setBracketLoading(false)
      }
    }
  }

  // ─── Step 2: Config ───────────────────────────────────────────────────────

  function updateRoundConfig(round: number, field: 'date' | 'startTime' | 'dayNum', value: string | number) {
    setRoundConfigs((prev) => {
      const updated = prev.map((rc) => (rc.round === round ? { ...rc, [field]: value } : rc))
      // When changing dayNum, auto-copy date from another round with same day
      if (field === 'dayNum') {
        const sameDay = updated.find((rc) => rc.dayNum === value && rc.round !== round && rc.date)
        if (sameDay) {
          return updated.map((rc) => rc.round === round ? { ...rc, dayNum: value as number, date: sameDay.date } : rc)
        }
      }
      // When changing date, sync to all rounds with same day
      if (field === 'date') {
        const thisRound = updated.find((rc) => rc.round === round)
        if (thisRound) {
          return updated.map((rc) => rc.dayNum === thisRound.dayNum ? { ...rc, date: value as string } : rc)
        }
      }
      return updated
    })
  }

  function generatePreview() {
    const result = generatePreviewEntries(roundConfigs, titlePrefix, venue, durationMin, breakMin)
    setEntries(result)
    setStep('preview')
  }

  // ─── Step 3: Preview editing ──────────────────────────────────────────────

  function updateEntry(tempId: string, patch: Partial<PreviewEntry>) {
    setEntries((prev) => prev.map((e) => (e.tempId === tempId ? { ...e, ...patch } : e)))
  }

  function handleTimeChange(entry: PreviewEntry, field: 'scheduledAt' | 'endAt', timeStr: string) {
    const newIso = setLocalTime(entry[field], timeStr)
    if (field === 'scheduledAt') {
      // Recalculate endAt to preserve duration
      const endIso = new Date(new Date(newIso).getTime() + durationMin * 60_000).toISOString()
      updateEntry(entry.tempId, { scheduledAt: newIso, endAt: endIso })
    } else {
      updateEntry(entry.tempId, { endAt: newIso })
    }
  }

  function removeEntry(tempId: string) {
    setEntries((prev) => prev.filter((e) => e.tempId !== tempId))
  }

  // ─── Save ─────────────────────────────────────────────────────────────────

  async function handleSave() {
    setSaving(true)
    setSaveProgress(0)
    let saved = 0
    let failed = 0
    let syncSkipped = 0

    // Send in batches of 5 with small delay to avoid rate limiting
    const batchSize = 5
    for (let i = 0; i < entries.length; i++) {
      const entry = entries[i]
      try {
        await api.post('/admin/schedules', {
          tournament_id: tournamentId,
          bracket_match_id: entry.bracketMatchId || undefined,
          title: entry.title,
          scheduled_at: entry.scheduledAt,
          end_at: entry.endAt,
          venue: entry.venue || undefined,
        })
        // Sync match scheduled_at in bracket
        if (entry.bracketMatchId) {
          try {
            await api.put(`/admin/matches/${entry.bracketMatchId}/schedule`, {
              scheduled_at: entry.scheduledAt,
            })
          } catch {
            // Match already completed/live — can't reschedule, that's OK
            syncSkipped++
          }
        }
        saved++
      } catch {
        failed++
      }
      setSaveProgress(i + 1)
      // Small delay every batch to avoid rate limiting
      if ((i + 1) % batchSize === 0 && i < entries.length - 1) {
        await new Promise((r) => setTimeout(r, 200))
      }
    }

    setSaving(false)
    if (failed === 0) {
      let msg = `${saved} jadwal berhasil disimpan`
      if (syncSkipped > 0) {
        msg += ` (${syncSkipped} match sudah selesai, tidak disinkronkan)`
      } else {
        msg += ' & bracket disinkronkan'
      }
      toast.success(msg)
      onSaved()
      onOpenChange(false)
    } else {
      toast.warning(`${saved} berhasil, ${failed} gagal`)
      onSaved()
    }
  }

  // ─── Derived ──────────────────────────────────────────────────────────────

  const configIsValid =
    roundConfigs.length > 0 && roundConfigs.every((rc) => rc.date && rc.startTime)

  const gameSlug = tournament?.game?.slug as GameSlug | undefined
  const gameConfig = gameSlug ? GAME_CONFIG[gameSlug] : null

  const totalEstimatePerDay = roundConfigs.map((rc) => ({
    dayNum: rc.dayNum,
    totalMin: durationMin, // all matches in a round run parallel
  }))

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={cn(
          'bg-white border-stone-200 text-stone-900 transition-all max-h-[90vh] flex flex-col overflow-hidden',
          step === 'preview' ? 'sm:max-w-5xl' : step === 'config' ? 'sm:max-w-2xl' : 'sm:max-w-lg'
        )}
      >
        <DialogHeader>
          <DialogTitle className="text-stone-900">Generate Jadwal dari Bracket</DialogTitle>
          {/* Step indicator */}
          <div className="flex items-center gap-1.5 pt-1">
            {STEPS.map((s, idx) => {
              const stepIdx = STEPS.indexOf(step)
              const isActive = s === step
              const isDone = idx < stepIdx
              return (
                <div key={s} className="flex items-center gap-1.5">
                  {idx > 0 && <div className="h-px w-5 bg-stone-200" />}
                  <span
                    className={cn(
                      'rounded-full px-2.5 py-0.5 text-xs font-semibold transition-colors',
                      isActive
                        ? 'bg-porjar-red text-white'
                        : isDone
                        ? 'bg-green-100 text-green-700'
                        : 'bg-stone-100 text-stone-400'
                    )}
                  >
                    {STEP_LABELS[idx]}
                  </span>
                </div>
              )
            })}
          </div>
        </DialogHeader>

        {/* ══════ Step 1: Pilih Turnamen ══════ */}
        {step === 'tournament' && (
          <div className="space-y-4 py-2">
            <div>
              <label className="mb-1.5 block text-xs font-medium text-stone-500">
                Pilih Turnamen <span className="text-red-500">*</span>
              </label>
              <Select value={tournamentId} onValueChange={handleSelectTournament}>
                <SelectTrigger className="w-full bg-white border-stone-300 text-stone-900">
                  {tournament ? (
                    <div className="flex items-center gap-2">
                      {(() => { const gs = tournament.game?.slug as GameSlug | undefined; const gc = gs ? GAME_CONFIG[gs] : null; return gc?.logo ? <img src={gc.logo} alt="" className="h-4 w-4 object-contain" /> : null })()}
                      <span>{tournament.name}</span>
                    </div>
                  ) : (
                    <SelectValue placeholder="Pilih turnamen..." />
                  )}
                </SelectTrigger>
                <SelectContent>
                  {tournaments.map((t) => {
                    const gs = t.game?.slug as GameSlug | undefined
                    const gc = gs ? GAME_CONFIG[gs] : null
                    return (
                      <SelectItem key={t.id} value={t.id} className="text-stone-900">
                        <div className="flex items-center gap-2">
                          {gc?.logo && (
                            <img src={gc.logo} alt="" className="h-4 w-4 object-contain" />
                          )}
                          {t.name}
                        </div>
                      </SelectItem>
                    )
                  })}
                </SelectContent>
              </Select>
            </div>

            {bracketLoading && (
              <div className="space-y-2 rounded-lg border border-stone-100 bg-stone-50 p-3">
                <Skeleton className="h-3 w-48 bg-stone-200" />
                <Skeleton className="h-3 w-32 bg-stone-200" />
              </div>
            )}

            {!bracketLoading && tournamentId && (
              <>
                {isBR ? (
                  <div className="flex gap-2.5 rounded-lg border border-blue-200 bg-blue-50 p-3 text-sm text-blue-700">
                    <Info size={16} className="mt-0.5 shrink-0" />
                    <span>
                      Turnamen Battle Royale tidak memiliki bracket. Gunakan{' '}
                      <strong>Tambah Manual</strong> atau generate dari halaman lobby.
                    </span>
                  </div>
                ) : hasBracket ? (
                  <div className="flex gap-2.5 rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-700">
                    <CheckCircle size={16} weight="fill" className="mt-0.5 shrink-0" />
                    <div>
                      Bracket ditemukan:{' '}
                      <strong>{roundConfigs.length} round</strong> ·{' '}
                      <strong>{bracketMatches.length} pertandingan</strong>
                      {gameConfig && (
                        <span className="ml-2 text-xs text-green-600">
                          · {tournament?.game?.name}
                        </span>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="flex gap-2.5 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-700">
                    <WarningCircle size={16} className="mt-0.5 shrink-0" />
                    <span>
                      Bracket belum dibuat untuk turnamen ini. Jadwal tidak akan terhubung ke
                      pertandingan — buat bracket dulu untuk hasil terbaik.
                    </span>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* ══════ Step 2: Konfigurasi ══════ */}
        {step === 'config' && (
          <div className="max-h-[60vh] space-y-5 overflow-y-auto py-2 pr-1">
            {/* Global settings */}
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <label className="mb-1.5 block text-xs font-medium text-stone-500">
                  Prefix Judul Jadwal
                </label>
                <Input
                  value={titlePrefix}
                  onChange={(e) => setTitlePrefix(e.target.value)}
                  placeholder="PORJAR HOK SMA"
                  className="bg-white border-stone-300 text-stone-900"
                />
                <p className="mt-1 text-[11px] text-stone-400">
                  Contoh hasil: &ldquo;{titlePrefix || 'PORJAR HOK SMA'} - Day 1&rdquo;
                </p>
              </div>

              <div className="col-span-2">
                <label className="mb-1.5 block text-xs font-medium text-stone-500">
                  Venue (opsional)
                </label>
                <Input
                  value={venue}
                  onChange={(e) => setVenue(e.target.value)}
                  placeholder="GOR Ngurah Rai"
                  className="bg-white border-stone-300 text-stone-900"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-medium text-stone-500">
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
                    className="bg-white border-stone-300 text-stone-900"
                  />
                  <span className="shrink-0 text-xs text-stone-400">menit</span>
                </div>
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-medium text-stone-500">
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
                    className="bg-white border-stone-300 text-stone-900"
                  />
                  <span className="shrink-0 text-xs text-stone-400">menit</span>
                </div>
              </div>
            </div>

            {/* Round config table */}
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-stone-400">
                Jadwal per Round <span className="text-stone-300 font-normal">· jam otomatis dihitung dari round pertama tiap day</span>
              </p>
              <div className="overflow-hidden rounded-lg border border-stone-200">
                <table className="w-full text-sm">
                  <thead className="bg-stone-50 text-xs text-stone-500">
                    <tr>
                      <th className="px-3 py-2 text-left font-semibold">Round</th>
                      <th className="px-3 py-2 text-left font-semibold">Match</th>
                      <th className="px-3 py-2 text-left font-semibold">
                        Tanggal <span className="text-red-500">*</span>
                      </th>
                      <th className="px-3 py-2 text-left font-semibold">
                        Jam Mulai <span className="text-red-500">*</span>
                      </th>
                      <th className="px-3 py-2 text-left font-semibold text-stone-400">
                        Estimasi selesai
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-100">
                    {(() => {
                      // Calculate effective start/end for each round
                      const sorted = [...roundConfigs].sort((a, b) => a.dayNum - b.dayNum || a.round - b.round)
                      const effectiveTimes: Record<number, { start: string; end: string }> = {}
                      const dayCursors: Record<number, Date> = {}

                      for (const rc of sorted) {
                        if (!rc.date) continue
                        const isFirst = !sorted.some((o) => o.dayNum === rc.dayNum && o.round < rc.round)
                        let start: Date
                        if (isFirst || !dayCursors[rc.dayNum]) {
                          start = new Date(`${rc.date}T${rc.startTime || '08:00'}:00`)
                        } else {
                          start = new Date(dayCursors[rc.dayNum].getTime() + breakMin * 60_000)
                        }
                        const end = new Date(start.getTime() + durationMin * 60_000)
                        effectiveTimes[rc.round] = {
                          start: start.toTimeString().slice(0, 5),
                          end: end.toTimeString().slice(0, 5),
                        }
                        dayCursors[rc.dayNum] = end
                      }

                      return roundConfigs.map((rc) => {
                      const eff = effectiveTimes[rc.round]
                      const effectiveStart = eff?.start ?? '--:--'
                      const endTime = eff?.end ?? '--:--'
                      const isFirstOfDay = !roundConfigs.some((o) => o.dayNum === rc.dayNum && o.round < rc.round)

                      return (
                        <tr key={rc.round} className="hover:bg-stone-50/50">
                          <td className="px-3 py-2.5">
                            <div className="flex items-center gap-1.5">
                              <span className="rounded-full bg-porjar-red/10 px-2 py-0.5 text-xs font-bold text-porjar-red">
                                Round {rc.round}
                              </span>
                              <select
                                value={rc.dayNum}
                                onChange={(e) => updateRoundConfig(rc.round, 'dayNum', parseInt(e.target.value))}
                                className="rounded border border-stone-200 bg-white px-1.5 py-0.5 text-xs font-semibold text-stone-700 focus:outline-none focus:ring-1 focus:ring-porjar-red/30"
                              >
                                {Array.from({ length: roundConfigs.length }, (_, i) => (
                                  <option key={i + 1} value={i + 1}>Day {i + 1}</option>
                                ))}
                              </select>
                            </div>
                          </td>
                          <td className="px-3 py-2.5 text-xs text-stone-500">
                            {rc.matches.length} match
                          </td>
                          <td className="px-3 py-2.5">
                            <Input
                              type="date"
                              value={rc.date}
                              onChange={(e) =>
                                updateRoundConfig(rc.round, 'date', e.target.value)
                              }
                              className="h-8 bg-white border-stone-300 text-stone-900 text-xs w-36"
                            />
                          </td>
                          <td className="px-3 py-2.5">
                            {isFirstOfDay ? (
                              <Input
                                type="time"
                                value={rc.startTime}
                                onChange={(e) => updateRoundConfig(rc.round, 'startTime', e.target.value)}
                                className="h-8 w-28 bg-white border-stone-300 text-stone-900 text-xs"
                              />
                            ) : (
                              <span className="inline-block h-8 leading-8 w-28 rounded-md border border-stone-200 bg-stone-50 px-3 text-xs font-semibold text-stone-700 tabular-nums">{effectiveStart}</span>
                            )}
                          </td>
                          <td className="px-3 py-2.5 text-xs text-stone-400">
                            {endTime} <span className="text-stone-300">·</span> {durationMin}m
                          </td>
                        </tr>
                      )
                    })
                    })()}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ══════ Step 3: Preview ══════ */}
        {step === 'preview' && (
          <div className="py-2">
            {/* Summary bar */}
            <div className="mb-3 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="text-sm text-stone-500">
                  <span className="font-semibold text-stone-900">{entries.length} jadwal</span>
                  {' · '}
                  <span className="font-semibold text-stone-900">{new Set(roundConfigs.map(r => r.dayNum)).size} hari</span>
                </span>
                <div className="flex gap-1.5">
                  {roundConfigs.map((rc) => (
                    <span
                      key={rc.round}
                      className="rounded-full bg-porjar-red/10 px-2 py-0.5 text-[11px] font-bold text-porjar-red"
                    >
                      Day {rc.dayNum}: {entries.filter((e) => e.dayNum === rc.dayNum).length} match
                    </span>
                  ))}
                </div>
              </div>
              <p className="text-[11px] text-stone-400">Klik sel untuk edit inline</p>
            </div>

            {/* Preview table */}
            <div className="max-h-[50vh] overflow-y-auto rounded-lg border border-stone-200">
              <table className="w-full text-xs">
                <thead className="sticky top-0 z-10 bg-stone-50 text-stone-500">
                  <tr className="border-b border-stone-200">
                    <th className="px-3 py-2 text-left font-semibold">Day</th>
                    <th className="px-3 py-2 text-left font-semibold">Match</th>
                    <th className="px-3 py-2 text-left font-semibold" style={{ minWidth: 160 }}>
                      Judul
                    </th>
                    <th className="px-3 py-2 text-left font-semibold whitespace-nowrap">
                      Jam Mulai
                    </th>
                    <th className="px-3 py-2 text-left font-semibold whitespace-nowrap">
                      Jam Selesai
                    </th>
                    <th className="px-3 py-2 text-left font-semibold" style={{ minWidth: 90 }}>
                      Venue
                    </th>
                    <th className="w-8 px-2 py-2" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {entries.map((entry) => (
                    <tr key={entry.tempId} className="group hover:bg-stone-50/50">
                      <td className="px-3 py-1.5">
                        <span className="rounded-full bg-porjar-red/10 px-2 py-0.5 text-[11px] font-bold text-porjar-red whitespace-nowrap">
                          Day {entry.dayNum}
                        </span>
                      </td>
                      <td className="px-3 py-1.5 text-stone-400 whitespace-nowrap">
                        {entry.matchLabel}
                      </td>
                      <td className="px-3 py-1.5">
                        <input
                          value={entry.title}
                          onChange={(e) => updateEntry(entry.tempId, { title: e.target.value })}
                          className="w-full min-w-[140px] rounded border border-transparent bg-transparent px-1 py-0.5 text-stone-900 hover:border-stone-300 focus:border-porjar-red focus:bg-white focus:outline-none"
                        />
                      </td>
                      <td className="px-3 py-1.5">
                        <input
                          type="time"
                          value={isoToLocalTime(entry.scheduledAt)}
                          onChange={(e) => handleTimeChange(entry, 'scheduledAt', e.target.value)}
                          className="w-20 rounded border border-transparent bg-transparent px-1 py-0.5 text-stone-900 hover:border-stone-300 focus:border-porjar-red focus:bg-white focus:outline-none"
                        />
                      </td>
                      <td className="px-3 py-1.5">
                        <input
                          type="time"
                          value={isoToLocalTime(entry.endAt)}
                          onChange={(e) => handleTimeChange(entry, 'endAt', e.target.value)}
                          className="w-20 rounded border border-transparent bg-transparent px-1 py-0.5 text-stone-900 hover:border-stone-300 focus:border-porjar-red focus:bg-white focus:outline-none"
                        />
                      </td>
                      <td className="px-3 py-1.5">
                        <input
                          value={entry.venue}
                          onChange={(e) => updateEntry(entry.tempId, { venue: e.target.value })}
                          placeholder="—"
                          className="w-full rounded border border-transparent bg-transparent px-1 py-0.5 text-stone-900 hover:border-stone-300 focus:border-porjar-red focus:bg-white focus:outline-none"
                        />
                      </td>
                      <td className="px-2 py-1.5">
                        <button
                          onClick={() => removeEntry(entry.tempId)}
                          className="rounded p-1 text-stone-300 transition-colors hover:bg-red-50 hover:text-red-500"
                        >
                          <Trash size={12} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Save progress */}
            {saving && (
              <div className="mt-3">
                <div className="mb-1 flex items-center justify-between text-xs text-stone-500">
                  <span>Menyimpan & sinkronisasi bracket...</span>
                  <span>
                    {saveProgress} / {entries.length}
                  </span>
                </div>
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-stone-100">
                  <div
                    className="h-full bg-porjar-red transition-all duration-200"
                    style={{ width: `${(saveProgress / entries.length) * 100}%` }}
                  />
                </div>
              </div>
            )}
          </div>
        )}

        {/* ══════ Footer ══════ */}
        <DialogFooter className="flex-row items-center justify-between gap-2">
          <div>
            {step !== 'tournament' && (
              <Button
                variant="outline"
                onClick={() => setStep(step === 'preview' ? 'config' : 'tournament')}
                className="border-stone-300 text-stone-600"
                disabled={saving}
              >
                <ArrowLeft size={14} className="mr-1" />
                Kembali
              </Button>
            )}
          </div>

          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="border-stone-300 text-stone-600"
              disabled={saving}
            >
              Batal
            </Button>

            {step === 'tournament' && (
              <Button
                onClick={() => setStep('config')}
                disabled={!tournamentId || bracketLoading || isBR || !hasBracket}
                className="bg-porjar-red hover:bg-porjar-red-dark text-white"
              >
                Lanjut
                <ArrowRight size={14} className="ml-1" />
              </Button>
            )}

            {step === 'config' && (
              <Button
                onClick={generatePreview}
                disabled={!configIsValid}
                className="bg-porjar-red hover:bg-porjar-red-dark text-white"
              >
                Generate Preview
                <ArrowRight size={14} className="ml-1" />
              </Button>
            )}

            {step === 'preview' && (
              <Button
                onClick={handleSave}
                disabled={saving || entries.length === 0}
                className="bg-porjar-red hover:bg-porjar-red-dark text-white"
              >
                {saving ? 'Menyimpan...' : `Simpan ${entries.length} Jadwal`}
              </Button>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
