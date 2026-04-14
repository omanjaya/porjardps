'use client'

import { toast } from 'sonner'
import { api } from '@/lib/api'
import type { Tournament, BracketMatch } from '@/types'
import {
  generatePreviewEntries,
  buildRoundConfigsFromBracket,
  setLocalTime,
  type PreviewEntry,
} from '../lib/scheduleGenerator'
import type { ScheduleFormState } from './useScheduleForm'

export function useScheduleGeneration(
  form: ScheduleFormState,
  tournaments: Tournament[],
  onSaved: () => void,
  onOpenChange: (v: boolean) => void,
) {
  async function handleSelectTournament(id: string | null) {
    if (!id) return
    form.setTournamentId(id)
    const t = tournaments.find((t) => t.id === id)
    if (!t) return

    form.setTitlePrefix(t.name)
    const br = t.format === 'battle_royale_points'
    form.setIsBR(br)
    form.setBracketMatches([])
    form.setHasBracket(false)

    if (!br) {
      form.setBracketLoading(true)
      try {
        const data = await api.get<BracketMatch[]>(`/tournaments/${id}/bracket`)
        const valid = (data ?? []).filter((m) => m.status !== 'bye')
        form.setBracketMatches(valid)
        const has = valid.length > 0
        form.setHasBracket(has)
        if (has) {
          form.setRoundConfigs(buildRoundConfigsFromBracket(valid))
        }
      } catch {
        form.setHasBracket(false)
      } finally {
        form.setBracketLoading(false)
      }
    }
  }

  function updateRoundConfig(round: number, field: 'date' | 'startTime' | 'dayNum', value: string | number) {
    form.setRoundConfigs((prev) => {
      const updated = prev.map((rc) => (rc.round === round ? { ...rc, [field]: value } : rc))
      if (field === 'dayNum') {
        const sameDay = updated.find((rc) => rc.dayNum === value && rc.round !== round && rc.date)
        if (sameDay) {
          return updated.map((rc) => rc.round === round ? { ...rc, dayNum: value as number, date: sameDay.date } : rc)
        }
      }
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
    const result = generatePreviewEntries(
      form.roundConfigs,
      form.titlePrefix,
      form.venue,
      form.durationMin,
      form.breakMin,
    )
    form.setEntries(result)
    form.setStep('preview')
  }

  function updateEntry(tempId: string, patch: Partial<PreviewEntry>) {
    form.setEntries((prev) => prev.map((e) => (e.tempId === tempId ? { ...e, ...patch } : e)))
  }

  function handleTimeChange(entry: PreviewEntry, field: 'scheduledAt' | 'endAt', timeStr: string) {
    const newIso = setLocalTime(entry[field], timeStr)
    if (field === 'scheduledAt') {
      const endIso = new Date(new Date(newIso).getTime() + form.durationMin * 60_000).toISOString()
      updateEntry(entry.tempId, { scheduledAt: newIso, endAt: endIso })
    } else {
      updateEntry(entry.tempId, { endAt: newIso })
    }
  }

  function removeEntry(tempId: string) {
    form.setEntries((prev) => prev.filter((e) => e.tempId !== tempId))
  }

  async function handleSave() {
    form.setSaving(true)
    form.setSaveProgress(0)
    let saved = 0
    let failed = 0
    let syncSkipped = 0

    const batchSize = 5
    const entries = form.entries
    for (let i = 0; i < entries.length; i++) {
      const entry = entries[i]
      try {
        await api.post('/admin/schedules', {
          tournament_id: form.tournamentId,
          bracket_match_id: entry.bracketMatchId || undefined,
          title: entry.title,
          scheduled_at: entry.scheduledAt,
          end_at: entry.endAt,
          venue: entry.venue || undefined,
        })
        if (entry.bracketMatchId) {
          try {
            await api.put(`/admin/matches/${entry.bracketMatchId}/schedule`, {
              scheduled_at: entry.scheduledAt,
            })
          } catch {
            syncSkipped++
          }
        }
        saved++
      } catch {
        failed++
      }
      form.setSaveProgress(i + 1)
      if ((i + 1) % batchSize === 0 && i < entries.length - 1) {
        await new Promise((r) => setTimeout(r, 200))
      }
    }

    form.setSaving(false)
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

  return {
    handleSelectTournament,
    updateRoundConfig,
    generatePreview,
    updateEntry,
    handleTimeChange,
    removeEntry,
    handleSave,
  }
}
