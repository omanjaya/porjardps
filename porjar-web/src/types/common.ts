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
  school_name?: string | null
  status?: string | null
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

// === School Standings (Juara Umum) ===
export interface SchoolStanding {
  id: string
  name: string
  level: SchoolLevel
  logo_url: string | null
  city: string
  gold: number
  silver: number
  bronze: number
  total_tournaments: number
  rank: number
}

// === School Requests ===
export interface SchoolRequest {
  id: string
  name: string
  level: SchoolLevel
  requested_by: string
  requester_name?: string
  status: 'pending' | 'approved' | 'rejected'
  reject_reason: string | null
  school_id: string | null
  created_at: string
  reviewed_at: string | null
}

// === Medal Standings (Per Tournament) ===
export interface MedalEntry {
  rank: number
  team_name: string
  school_id: string
  school_name: string
  school_logo_url: string | null
}

export interface TournamentMedals {
  tournament_id: string
  tournament_name: string
  game_name: string
  game_slug: string
  school_level: string
  medals: MedalEntry[]
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
  | 'bracket_update'
  | 'br_result_update'
  | 'standings_update'
  | 'notification'
  | 'spectator_count'
  | 'prediction_update'
  | 'new_submission'
  | 'tournament_update'
  | 'team_update'
  | 'team_approved'
  | 'team_rejected'
  | 'submission_approved'
  | 'submission_rejected'
  | 'lobby_update'
  | 'game_score'
  | 'ping'

// === Events ===
export interface Event {
  id: string
  slug: string
  name: string
  short_name: string
  description: string | null
  logo_url: string | null
  banner_url: string | null
  poster_url: string | null
  primary_color: string
  secondary_color: string | null
  venue: string | null
  city: string | null
  organizer: string | null
  start_date: string | null
  end_date: string | null
  registration_start: string | null
  registration_end: string | null
  status: 'draft' | 'published' | 'ongoing' | 'completed' | 'archived'
  contact_phone: string | null
  contact_email: string | null
  instagram_url: string | null
  website_url: string | null
  announcement: string | null
  announcement_active: boolean
  registration_open: boolean
  rules_published: boolean
  requires_school: boolean
  sort_order: number
  champion_team_id?: string | null
  champion_team_name?: string | null
  champion_team_logo?: string | null
}

// === Event Points System ===
export interface EventPointRule {
  id: string
  event_id: string
  rank_position: number
  points: number
}

export interface EventRegistration {
  id: string
  event_id: string
  team: TeamSummary
  registered_at: string
}

export interface EventTeamPoints {
  id: string
  event_id: string
  tournament_id: string
  team_id: string
  rank_position: number
  points: number
  awarded_at: string
}

export interface EventUserPoints {
  id: string
  event_id: string
  tournament_id: string
  user_id: string
  team_id: string
  rank_position: number
  points: number
  awarded_at: string
}

export interface TeamLeaderboardEntry {
  team_id: string
  team_name: string
  team_logo_url: string | null
  school_name: string | null
  total_points: number
  rank: number
}

export interface UserLeaderboardEntry {
  user_id: string
  full_name: string
  avatar_url: string | null
  total_points: number
  rank: number
}

export interface SchoolLeaderboardEntry {
  school_id: string
  school_name: string
  school_logo: string | null
  total_points: number
  team_count: number
  rank: number
}

export interface MyEventRegistration {
  id: string
  event_id: string
  event_name: string
  event_slug: string
  event_status: string
  event_start_date: string | null
  team_id: string
  team_name: string
  registered_at: string
}

export interface EnrichedUserPoints {
  id: string
  event_id: string
  event_name: string
  tournament_id: string
  tournament_name: string
  team_id: string
  team_name: string
  rank_position: number
  points: number
  awarded_at: string
}
