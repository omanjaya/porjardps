import type { BracketMatch } from '@/types'

// Layout constants
export const MATCH_WIDTH = 200
export const MATCH_HEIGHT = 68
export const ROUND_GAP = 250
export const CONNECTOR_GAP = ROUND_GAP - MATCH_WIDTH
export const PADDING_X = 40
export const PADDING_Y = 40

const MIN_GAP = 36

export interface MatchPosition {
  x: number
  y: number
  match: BracketMatch
}

export function calculatePositions(
  matches: BracketMatch[],
  rounds: number
): MatchPosition[] {
  const positions: MatchPosition[] = []

  // Group matches by round
  const roundColumns: BracketMatch[][] = []
  for (let r = 1; r <= rounds; r++) {
    roundColumns.push(
      matches
        .filter((m) => m.round === r)
        .sort((a, b) => a.match_number - b.match_number)
    )
  }

  // Filter out BYE matches from round 1
  const visibleRounds: BracketMatch[][] = []
  for (let r = 0; r < roundColumns.length; r++) {
    if (r === 0) {
      const realMatches = roundColumns[r].filter((m) => m.status !== 'bye')
      if (realMatches.length > 0) visibleRounds.push(realMatches)
    } else {
      visibleRounds.push(roundColumns[r])
    }
  }

  if (visibleRounds.length === 0) return positions

  // Find the round with most matches — this is the "widest" round
  // Layout is driven by this round to prevent overlap in all rounds
  const widestRoundIdx = visibleRounds.reduce(
    (maxIdx, round, idx) => (round.length > visibleRounds[maxIdx].length ? idx : maxIdx),
    0
  )
  const widestCount = visibleRounds[widestRoundIdx].length

  // The step for the widest round must ensure NO overlap in any later round
  // Each subsequent round halves the match count and centers between pairs
  // For round N matches to not overlap, widest round step must be:
  //   step >= MATCH_HEIGHT + MIN_GAP (trivially, for widest round itself)
  // But for round widest+1: positions are averaged from pairs → gap = 2*step - MATCH_HEIGHT
  //   must be >= MIN_GAP → step >= (MATCH_HEIGHT + MIN_GAP) / 2
  // This is always satisfied if step >= MATCH_HEIGHT + MIN_GAP
  const step = MATCH_HEIGHT + MIN_GAP

  // Layout all rounds using index-based positioning from the widest round
  // Each round's positions: y = PADDING_Y + i * (step * multiplier)
  // where multiplier = 2^(roundIdx - widestRoundIdx) for rounds after widest
  // and = 1/2^(widestRoundIdx - roundIdx) for rounds before widest (should not happen normally)

  const matchYMap = new Map<string, number>()

  // Losers bracket base Y — pushed below the entire winners bracket section
  // so loser-drop rounds never overlap with winners bracket connectors
  // Formula: bottom of widest round + gap
  const losersBaseY = PADDING_Y + (widestCount - 1) * step + MATCH_HEIGHT + 40

  // Quick match lookup by id for cross-round feeder search
  const matchById = new Map(matches.map((m) => [m.id, m]))

  // Layout widest round first
  const widestRound = visibleRounds[widestRoundIdx]
  const widestPositions: number[] = widestRound.map(
    (_, i) => PADDING_Y + i * step
  )
  widestRound.forEach((match, i) => {
    const x = PADDING_X + widestRoundIdx * ROUND_GAP
    const y = widestPositions[i]
    matchYMap.set(match.id, y)
    positions.push({ x, y, match })
  })

  // Layout rounds AFTER widest (toward final) — center between winner-path feeders
  //
  // Key rules for double elimination:
  //  • Winner-path feeders (next_match_id): determine vertical position
  //  • Loser-drop feeders (loser_next_match_id): do NOT determine position
  //  • Cross-round search: Grand Final (R7) gets feeders from R3 AND R6, not just R6
  //  • No winner-path feeders → loser bracket entry point → use losersBaseY
  for (let vr = widestRoundIdx + 1; vr < visibleRounds.length; vr++) {
    const roundMatches = visibleRounds[vr]
    const x = PADDING_X + vr * ROUND_GAP
    const newYPositions: number[] = []

    roundMatches.forEach((match, i) => {
      // Search ALL previously positioned matches for winner-path feeders (next_match_id)
      // Cross-round search handles cases like R3→R7 (Grand Final) in double elimination
      const winnerFeederYs: number[] = []
      matchYMap.forEach((y, id) => {
        const m = matchById.get(id)
        if (m?.next_match_id === match.id) winnerFeederYs.push(y)
      })

      let y: number

      if (winnerFeederYs.length >= 2) {
        // Center between feeders (e.g. two semifinal winners, or winners+losers finalist)
        y = (Math.min(...winnerFeederYs) + Math.max(...winnerFeederYs)) / 2
      } else if (winnerFeederYs.length === 1) {
        // Follow single winner-path feeder (e.g. losers bracket progression)
        y = winnerFeederYs[0]
      } else {
        // No winner-path feeders → loser bracket entry point (round accepts loser drops)
        y = losersBaseY + i * step
      }

      // Overlap protection
      if (newYPositions.length > 0) {
        const minY = newYPositions[newYPositions.length - 1] + MATCH_HEIGHT + MIN_GAP
        if (y < minY) y = minY
      }

      newYPositions.push(y)
      matchYMap.set(match.id, y)
      positions.push({ x, y, match })
    })
  }

  // Layout rounds BEFORE widest (toward round 1) — if widestRoundIdx > 0
  // Each earlier round has MORE matches, laid out so feeders align with their targets
  for (let vr = widestRoundIdx - 1; vr >= 0; vr--) {
    const roundMatches = visibleRounds[vr]
    const x = PADDING_X + vr * ROUND_GAP
    const nextRound = visibleRounds[vr + 1]
    const newYPositions: number[] = []

    roundMatches.forEach((match, i) => {
      // Find which next-round match this feeds into
      const target = nextRound?.find((nm) => match.next_match_id === nm.id)
      const targetY = target ? matchYMap.get(target.id) : null

      let y: number
      if (targetY != null) {
        // Position above or below the target based on match index
        // Even index = above target, odd = below target
        const pairIdx = nextRound?.findIndex((nm) => match.next_match_id === nm.id) ?? 0
        const isFirstFeeder = i === pairIdx * 2
        const halfStep = step / 2
        y = isFirstFeeder ? targetY - halfStep : targetY + halfStep
      } else {
        y = PADDING_Y + i * step
      }

      // Clamp to minimum PADDING_Y so no match renders above the top of the canvas
      y = Math.max(PADDING_Y, y)

      // Overlap protection
      if (newYPositions.length > 0) {
        const minY = newYPositions[newYPositions.length - 1] + MATCH_HEIGHT + MIN_GAP
        if (y < minY) y = minY
      }

      newYPositions.push(y)
      matchYMap.set(match.id, y)
      positions.push({ x, y, match })
    })
  }

  return positions
}
