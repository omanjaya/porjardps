import type { TeamSummary } from './common'

// === Group Stage ===

export interface TournamentGroup {
  id: string
  tournament_id: string
  name: string
  group_order: number
  advance_count: number
  legs: number
  pairing_mode: string
  swiss_config?: { max_rounds: number; win_threshold: number; loss_threshold: number; current_round: number } | null
  stage_id?: string | null
  created_at: string
  teams?: TeamSummary[]
  matches?: GroupMatch[]
  standings?: GroupStanding[]
}

export interface GroupMatch {
  id: string
  group_id: string
  round: number
  match_number: number
  team_a_id: string | null
  team_b_id: string | null
  score_a: number
  score_b: number
  status: GroupMatchStatus
  scheduled_at: string | null
  completed_at: string | null
  created_at: string
  team_a?: TeamSummary
  team_b?: TeamSummary
}

export type GroupMatchStatus = 'pending' | 'scheduled' | 'live' | 'completed'

export interface GroupStanding {
  id: string
  group_id: string
  team_id: string
  matches_played: number
  wins: number
  draws: number
  losses: number
  goals_for: number
  goals_against: number
  goal_difference: number
  points: number
  penalty_points: number
  rank_position: number
  team?: TeamSummary
}
