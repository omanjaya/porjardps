import type { Event } from '@/types'

export type EventHealthStatus = Event['status']

export interface CitywideHealth {
  pending_approvals: number
  disputed_submissions: number
  live_matches: number
  events_ongoing: number
}

export interface EventHealthEntry {
  id: string
  slug: string
  name: string
  status: EventHealthStatus
  start_date: string | null
  end_date: string | null
  logo_url: string | null
  primary_color: string
  tournaments: {
    total: number
    ongoing: number
    completed: number
    upcoming: number
  }
  teams_total: number
  live_matches: number
  attention: {
    disputed_submissions: number
    overdue_matches: number
    total: number
  }
}

export interface EventHealth {
  citywide: CitywideHealth
  events: EventHealthEntry[]
}
