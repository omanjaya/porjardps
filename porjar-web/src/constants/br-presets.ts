export interface BRPointPreset {
  name: string
  description: string
  maxTeams: number
  killPointValue: number
  wwcdBonus: number
  placements: Record<number, number>
}

export const BR_POINT_PRESETS: Record<string, BRPointPreset> = {
  pmpl: {
    name: 'PMPL Format',
    description: '16 tim, 1pt/kill',
    maxTeams: 16,
    killPointValue: 1,
    wwcdBonus: 0,
    placements: {
      1: 15,
      2: 12,
      3: 10,
      4: 8,
      5: 6,
      6: 5,
      7: 4,
      8: 3,
      9: 2,
      10: 2,
      11: 1,
      12: 1,
      13: 1,
      14: 1,
      15: 1,
      16: 0,
    },
  },
  ffws: {
    name: 'FFWS Format',
    description: '12 tim, 1pt/kill, WWCD +5',
    maxTeams: 12,
    killPointValue: 1,
    wwcdBonus: 5,
    placements: {
      1: 12,
      2: 9,
      3: 7,
      4: 5,
      5: 4,
      6: 3,
      7: 2,
      8: 2,
      9: 1,
      10: 1,
      11: 0,
      12: 0,
    },
  },
  porjar_default: {
    name: 'PORJAR Default',
    description: '12-16 tim, 1pt/kill',
    maxTeams: 16,
    killPointValue: 1,
    wwcdBonus: 0,
    placements: {
      1: 15,
      2: 12,
      3: 10,
      4: 8,
      5: 6,
      6: 4,
      7: 2,
      8: 1,
    },
  },
}

export function getPresetKeys(): string[] {
  return Object.keys(BR_POINT_PRESETS)
}

export function calculatePoints(
  placement: number,
  kills: number,
  placements: Record<number, number>,
  killPointValue: number,
  wwcdBonus: number
): { placementPts: number; killPts: number; wwcd: number; total: number } {
  const placementPts = placements[placement] ?? 0
  const killPts = kills * killPointValue
  const wwcd = placement === 1 ? wwcdBonus : 0
  return {
    placementPts,
    killPts,
    wwcd,
    total: placementPts + killPts + wwcd,
  }
}
