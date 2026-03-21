import type { GameSlug } from './tournament'
import type { SchoolLevel } from './team'
import type { TournamentStatus } from './tournament'

// === Games ===
export interface Game {
  id: string
  name: string
  slug: GameSlug
  game_type: GameType
  min_team_members: number
  max_team_members: number
  max_substitutes: number
  icon_url: string | null
  rules_url: string | null
  is_active: boolean
  active_tournaments?: number
}

export type GameType = 'bracket' | 'battle_royale'

// === Schools ===
export interface School {
  id: string
  name: string
  level: SchoolLevel
  address: string | null
  city: string
  logo_url: string | null
  coach_phone: string | null
}

// === Summaries (for nested references) ===
export interface TeamSummary {
  id: string
  name: string
  seed?: number | null
  logo_url?: string | null
  school_logo_url?: string | null
}

export interface GameSummary {
  id: string
  slug: GameSlug
  name: string
}

export interface SchoolSummary {
  id: string
  name: string
  level: SchoolLevel
  logo_url: string | null
}

export interface UserSummary {
  id: string
  full_name: string
}

export interface TournamentSummary {
  id: string
  name: string
  status: TournamentStatus
}

// === API Response ===
export interface ApiResponse<T> {
  success: boolean
  data: T
  error: ApiErrorBody | null
  meta: PaginationMeta | null
}

export interface ApiErrorBody {
  code: string
  message: string
  details?: Record<string, string>
}

export interface PaginationMeta {
  page: number
  per_page: number
  total: number
  total_pages: number
}

// === Media ===
export interface Media {
  id: string
  uploaded_by: string | null
  entity_type: MediaEntityType
  entity_id: string | null
  file_url: string
  thumbnail_url: string | null
  file_type: MediaFileType
  title: string | null
  description: string | null
  is_highlight: boolean
  sort_order: number
  created_at: string
}

export type MediaEntityType = 'match' | 'tournament' | 'team' | 'lobby' | 'general'
export type MediaFileType = 'image' | 'video_link'

// === Player Stats ===
export interface PlayerProfile {
  user: import('./auth').User
  total_matches: number
  total_wins: number
  total_losses: number
  win_rate: number
  total_mvp: number
  games_played: number
  achievements: UserAchievement[]
  game_stats: GameStatsItem[]
}

export interface GameStatsItem {
  game: Game
  matches_played: number
  wins: number
  losses: number
  win_rate: number
  mvp_count: number
  total_kills: number
  total_deaths: number
  total_assists: number
  avg_score: number
}

export interface Achievement {
  id: string
  slug: string
  name: string
  description: string | null
  icon: string
  category: AchievementCategory
  criteria: Record<string, unknown> | null
  created_at: string
}

export interface UserAchievement {
  id: string
  user_id: string
  achievement_id: string
  earned_at: string
  tournament_id: string | null
  achievement: Achievement
}

export type AchievementCategory = 'tournament' | 'match' | 'social' | 'special'

// === Predictions ===
export interface MatchPredictions {
  team_a_votes: number
  team_b_votes: number
  total_votes: number
  team_a_percent: number
  team_b_percent: number
  user_prediction: string | null
}

export interface UserPredictionAccuracy {
  correct: number
  total: number
  accuracy: number
}

// === Event Settings ===
export interface EventSettings {
  id: string
  event_name: string
  event_description: string
  event_logo_url: string | null
  event_banner_url: string | null
  venue: string
  city: string
  start_date: string | null
  end_date: string | null
  organizer: string
  contact_phone: string | null
  contact_email: string | null
  instagram_url: string | null
  announcement: string | null
  announcement_active: boolean
  registration_open: boolean
  rules_published: boolean
  updated_at: string
}

// === WebSocket ===
export interface WSMessage<T = unknown> {
  type: WSMessageType
  data: T
}

export type WSMessageType =
  | 'score_update'
  | 'match_status'
  | 'match_complete'
  | 'bracket_advance'
  | 'br_result_update'
  | 'standings_update'
  | 'notification'
  | 'spectator_count'
  | 'prediction_update'
