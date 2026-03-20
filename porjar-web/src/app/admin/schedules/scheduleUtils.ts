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

// ─── Helpers ─────────────────────────────────────────────────────────────────

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
