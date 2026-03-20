import type { TournamentSummary, GameSummary } from './common'

// === Schedule ===
export interface ScheduleTeam {
  id: string
  name: string
  school_name: string | null
}

export interface Schedule {
  id: string
  title: string
  description: string | null
  tournament: TournamentSummary | null
  game: GameSummary | null
  team_a: ScheduleTeam | null
  team_b: ScheduleTeam | null
  scheduled_at: string
  end_at: string | null
  venue: string | null
  status: ScheduleStatus
  bracket_match_id: string | null
  br_lobby_id: string | null
}

export type ScheduleStatus = 'upcoming' | 'ongoing' | 'completed' | 'postponed' | 'cancelled'
