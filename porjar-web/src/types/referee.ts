export interface TournamentPenaltyConfig {
  id: string
  tournament_id: string
  card_type: 'yellow' | 'red'
  point_deduction: number
  is_disqualification: boolean
  description?: string
}

export interface LiveMatch {
  type: 'bracket' | 'br' | 'group'
  match_id: string
  tournament_id: string
  tournament_name: string
  team_a_id?: string
  team_a_name: string
  team_b_id?: string
  team_b_name: string
  status: string
  round?: number
  match_number?: number
  lobby_name?: string
}

export interface RefereeAssignment {
  id: string
  referee_id: string
  tournament_id: string
  bracket_match_id?: string
  br_lobby_id?: string
  group_match_id?: string
  assigned_at: string
  // enriched
  match_info?: {
    type: string
    team_a_id?: string
    team_a_name: string
    team_b_id?: string
    team_b_name: string
    status: string
    round?: number
    match_number?: number
    lobby_name?: string
  }
}

export interface MatchCard {
  id: string
  tournament_id: string
  team_id: string
  issued_by: string
  card_type: 'yellow' | 'red'
  point_deduction: number
  reason: string
  bracket_match_id?: string
  br_lobby_id?: string
  group_match_id?: string
  is_revoked: boolean
  created_at: string
  // enriched
  team_name?: string
  issuer_name?: string
}
