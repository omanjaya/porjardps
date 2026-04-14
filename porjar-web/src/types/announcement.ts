export interface Announcement {
  id: number
  event_id: string
  title: string
  message: string
  priority: 'low' | 'normal' | 'high' | 'urgent'
  created_by?: string
  created_at: string
  expires_at?: string | null
}
