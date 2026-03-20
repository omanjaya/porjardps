import type { SchoolSummary, GameSummary, UserSummary, TournamentSummary } from './common'

// === Teams ===
export interface Team {
  id: string
  name: string
  school: SchoolSummary | null
  game: GameSummary
  captain: UserSummary | null
  member_count: number
  status: TeamStatus
  seed: number | null
  logo_url: string | null
}

export interface TeamDetail extends Team {
  members: TeamMember[]
  tournaments: TournamentSummary[]
}

export interface TeamMember {
  id: string
  user_id: string
  full_name: string
  in_game_name: string
  in_game_id: string | null
  role: TeamMemberRole
  jersey_number: number | null
}

export type TeamStatus = 'pending' | 'approved' | 'rejected' | 'eliminated' | 'active'
export type TeamMemberRole = 'captain' | 'member' | 'substitute'

export type SchoolLevel = 'SMP' | 'SMA' | 'SMK'
