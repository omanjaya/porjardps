import type { GameSummary, TeamSummary } from './common'

// === Tournaments ===
export interface Tournament {
  id: string
  game: GameSummary
  name: string
  format: TournamentFormat
  stage: TournamentStage
  best_of: number
  max_teams: number | null
  status: TournamentStatus
  registration_start: string | null
  registration_end: string | null
  start_date: string | null
  end_date: string | null
  team_count: number
  rules: string | null
  kill_point_value: number
  wwcd_bonus: number
  qualification_threshold: number | null
  max_lobby_teams: number | null
}

export type TournamentFormat =
  | 'single_elimination'
  | 'double_elimination'
  | 'round_robin'
  | 'swiss'
  | 'battle_royale_points'
  | 'group_stage_playoff'

export type TournamentStage = 'qualifier' | 'group_stage' | 'playoff' | 'main' | 'grand_final'
export type TournamentStatus = 'upcoming' | 'registration' | 'ongoing' | 'completed' | 'cancelled'

export type GameSlug = 'hok' | 'ml' | 'ff' | 'pubgm' | 'efootball'

// === Battle Royale ===
export interface BRLobby {
  id: string
  tournament_id: string
  lobby_name: string
  lobby_number: number
  day_number: number
  room_id: string | null
  room_password: string | null
  status: LobbyStatus
  scheduled_at: string | null
  results: BRLobbyResult[]
}

export interface BRLobbyResult {
  team: TeamSummary
  placement: number
  kills: number
  placement_points: number
  kill_points: number
  total_points: number
}

export type LobbyStatus = 'pending' | 'scheduled' | 'live' | 'completed'

// === BR Lobby Teams ===
export interface BRLobbyTeam {
  id: string
  lobby_id: string
  team_id: string
}

// === BR Daily Standings ===
export interface BRDailyStanding {
  id: string
  tournament_id: string
  team_id: string
  day_number: number
  total_points: number
  total_kills: number
  rank_position: number | null
  is_qualified: boolean
  team?: TeamSummary
}

// === Lobby Rotation ===
export interface LobbyAssignment {
  team_id: string
  lobby_number: number
}

export interface RotationResult {
  rounds: LobbyAssignment[][]
  num_lobbies: number
  teams_per_lobby: number
}

export interface QualificationResult {
  qualified: TeamSummary[]
  eliminated: TeamSummary[]
}

// === Standings ===
export interface Standing {
  rank_position: number
  team: TeamSummary
  matches_played: number
  wins: number
  losses: number
  draws: number
  total_points: number
  total_kills: number
  total_placement_points: number
  best_placement: number | null
  avg_placement: number | null
  is_eliminated: boolean
}
