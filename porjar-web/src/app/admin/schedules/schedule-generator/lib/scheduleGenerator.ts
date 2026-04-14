import type { BracketMatch } from '@/types'

// ─── Types ───────────────────────────────────────────────────────────────────

export interface RoundConfig {
  round: number
  dayNum: number
  matches: BracketMatch[]
  date: string      // YYYY-MM-DD
  startTime: string // HH:mm
}

export interface PreviewEntry {
  tempId: string
  title: string
  scheduledAt: string // ISO UTC
  endAt: string       // ISO UTC
  venue: string
  bracketMatchId: string
  matchLabel: string
  round: number
  dayNum: number
}

export type Step = 'tournament' | 'config' | 'preview'

// ─── Constants ───────────────────────────────────────────────────────────────

export const STEP_LABELS = ['1. Turnamen', '2. Konfigurasi', '3. Preview']
export const STEPS: Step[] = ['tournament', 'config', 'preview']

// ─── Time Helpers ────────────────────────────────────────────────────────────

export function isoToLocalTime(iso: string): string {
  if (!iso) return ''
  const d = new Date(iso)
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

export function setLocalTime(iso: string, timeStr: string): string {
  if (!iso || !timeStr) return iso
  const d = new Date(iso)
  const [h, m] = timeStr.split(':').map(Number)
  d.setHours(h, m, 0, 0)
  return d.toISOString()
}

// ─── Round config building ───────────────────────────────────────────────────

export function buildRoundConfigsFromBracket(matches: BracketMatch[]): RoundConfig[] {
  const rounds = [...new Set(matches.map((m) => m.round))].sort((a, b) => a - b)
  return rounds.map((round, idx) => ({
    round,
    dayNum: idx + 1,
    matches: matches
      .filter((m) => m.round === round)
      .sort((a, b) => a.match_number - b.match_number),
    date: '',
    startTime: '08:00',
  }))
}

// ─── Effective (display) times for config step ──────────────────────────────

export interface EffectiveTime { start: string; end: string }

export function computeEffectiveTimes(
  roundConfigs: RoundConfig[],
  durationMin: number,
  breakMin: number
): Record<number, EffectiveTime> {
  const sorted = [...roundConfigs].sort((a, b) => a.dayNum - b.dayNum || a.round - b.round)
  const effective: Record<number, EffectiveTime> = {}
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
    effective[rc.round] = {
      start: start.toTimeString().slice(0, 5),
      end: end.toTimeString().slice(0, 5),
    }
    dayCursors[rc.dayNum] = end
  }
  return effective
}

// ─── Preview Generation ──────────────────────────────────────────────────────

export function generatePreviewEntries(
  roundConfigs: RoundConfig[],
  titlePrefix: string,
  venue: string,
  durationMin: number,
  breakMin: number
): PreviewEntry[] {
  const result: PreviewEntry[] = []

  // Sort by dayNum then round
  const sortedConfigs = [...roundConfigs].sort((a, b) => a.dayNum - b.dayNum || a.round - b.round)

  // Track time per day: each round on same day starts after previous round ends
  const dayCursors: Record<number, Date> = {}

  for (const rc of sortedConfigs) {
    if (!rc.date || !rc.startTime) continue

    // Start time for this round
    let roundStart = dayCursors[rc.dayNum]
    if (!roundStart) {
      roundStart = new Date(`${rc.date}T${rc.startTime}:00`)
    } else {
      // Next round starts after break from previous round
      roundStart = new Date(roundStart.getTime() + breakMin * 60_000)
    }

    const roundEnd = new Date(roundStart.getTime() + durationMin * 60_000)

    // ALL matches in this round start at the SAME time (parallel)
    for (const match of rc.matches) {
      result.push({
        tempId: `${match.id}-${Math.random().toString(36).slice(2)}`,
        title: `${titlePrefix} - Day ${rc.dayNum}`,
        scheduledAt: roundStart.toISOString(),
        endAt: roundEnd.toISOString(),
        venue,
        bracketMatchId: match.id,
        matchLabel: `${match.team_a?.name ?? 'TBD'} vs ${match.team_b?.name ?? 'TBD'}`,
        round: rc.round,
        dayNum: rc.dayNum,
      })
    }

    // Next round on same day starts after this round ends
    dayCursors[rc.dayNum] = roundEnd
  }

  return result
}
