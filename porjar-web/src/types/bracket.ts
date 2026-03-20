import type { TeamSummary, TournamentSummary } from './common'

// === Bracket Matches ===
export interface BracketMatch {
  id: string
  tournament_id: string
  round: number
  match_number: number
  bracket_position: string | null
  team_a: TeamSummary | null
  team_b: TeamSummary | null
  winner: TeamSummary | null
  score_a: number
  score_b: number
  status: MatchStatus
  scheduled_at: string | null
  started_at: string | null
  completed_at: string | null
  next_match_id: string | null
  loser_next_match_id: string | null
  best_of: number
  stream_url: string | null
  games?: MatchGame[]
  tournament?: TournamentSummary
}

export interface MatchGame {
  game_number: number
  winner_id: string | null
  score_a: number
  score_b: number
  duration_minutes: number | null
  mvp: string | null
  map_name: string | null
  hero_bans: HeroBans | null
}

export interface HeroBans {
  team_a: string[]
  team_b: string[]
}

export type MatchStatus = 'pending' | 'scheduled' | 'live' | 'completed' | 'bye'
