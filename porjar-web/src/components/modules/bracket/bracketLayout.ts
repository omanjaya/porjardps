import type { BracketMatch } from '@/types'

// Layout constants
export const MATCH_WIDTH = 240
export const MATCH_HEIGHT = 68
export const ROUND_GAP = 300
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

  // Hide all BYE matches from the bracket view — they clutter the display.
  // This includes: WR round 1 BYEs, LB BYEs (0 or 1 team), and pending LB matches with 0 teams.
  const shouldHide = (m: BracketMatch) =>
    m.status === 'bye' || (!m.team_a && !m.team_b && m.bracket_position === 'losers')
  const visibleRounds: BracketMatch[][] = []
  for (let r = 0; r < roundColumns.length; r++) {
    const realMatches = roundColumns[r].filter((m) => !shouldHide(m))
    if (realMatches.length > 0) visibleRounds.push(realMatches)
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

  // Sort the widest round in bracket-tree order using DFS from the final match.
  // Without this, Challonge's chronological play-order groups BYE-adjacent
  // matches together, causing feeders from earlier rounds to cluster unevenly.
  const widestRound = (() => {
    const round = visibleRounds[widestRoundIdx]
    if (round.length <= 2) return round

    // Build a set of all visible match IDs for quick lookup
    const allVisible = new Map<string, BracketMatch>()
    for (const vr of visibleRounds) {
      for (const m of vr) allVisible.set(m.id, m)
    }

    // Build reverse feeder map: match_id → list of visible matches that feed into it
    const feedersOf = new Map<string, BracketMatch[]>()
    for (const [, m] of allVisible) {
      if (m.next_match_id && allVisible.has(m.next_match_id)) {
        const arr = feedersOf.get(m.next_match_id) ?? []
        arr.push(m)
        feedersOf.set(m.next_match_id, arr)
      }
    }

    // DFS from any root to collect leaf order for the widest round
    const widestIds = new Set(round.map((m) => m.id))
    const ordered: BracketMatch[] = []

    function dfs(matchId: string) {
      if (widestIds.has(matchId)) {
        const m = allVisible.get(matchId)
        if (m) ordered.push(m)
        return
      }
      const feeders = feedersOf.get(matchId) ?? []
      for (const f of feeders) {
        dfs(f.id)
      }
    }

    // Find root matches: visible matches whose next_match_id is null or not visible
    // (these are finals, third-place matches, etc.)
    const roots: BracketMatch[] = []
    for (const [, m] of allVisible) {
      if (!m.next_match_id || !allVisible.has(m.next_match_id)) {
        roots.push(m)
      }
    }

    for (const root of roots) {
      dfs(root.id)
    }

    // Any widest-round matches not reached by DFS (disconnected) — append at end
    const seen = new Set(ordered.map((m) => m.id))
    for (const m of round) {
      if (!seen.has(m.id)) ordered.push(m)
    }

    return ordered.length === round.length ? ordered : round
  })()

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
  // Earlier rounds may have FEWER visible matches than later rounds when BYE
  // matches are hidden (e.g. 41 teams → 9 visible R1 matches, 16 R2 matches).
  // For each match, count how many visible feeders its target has to determine
  // whether to center on the target or offset above/below.
  for (let vr = widestRoundIdx - 1; vr >= 0; vr--) {
    const roundMatches = visibleRounds[vr]
    const x = PADDING_X + vr * ROUND_GAP
    const nextRound = visibleRounds[vr + 1]
    const newYPositions: number[] = []

    // Pre-compute: for each target in the next round, which visible feeders does it have?
    const targetFeeders = new Map<string, string[]>()
    roundMatches.forEach((match) => {
      if (match.next_match_id) {
        const existing = targetFeeders.get(match.next_match_id) ?? []
        existing.push(match.id)
        targetFeeders.set(match.next_match_id, existing)
      }
    })

    roundMatches.forEach((match) => {
      // Find which next-round match this feeds into
      const target = nextRound?.find((nm) => match.next_match_id === nm.id)
      const targetY = target ? matchYMap.get(target.id) : null

      let y: number
      if (targetY != null && target) {
        const feeders = targetFeeders.get(target.id) ?? []
        const halfStep = step / 2
        if (feeders.length >= 2) {
          // Two visible feeders — position above/below target
          const isFirst = feeders[0] === match.id
          y = isFirst ? targetY - halfStep : targetY + halfStep
        } else {
          // Single visible feeder (other was a hidden BYE) — center on target
          y = targetY
        }
      } else {
        y = PADDING_Y + newYPositions.length * step
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
