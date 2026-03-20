// === Auth ===
export interface User {
  id: string
  email: string
  role: UserRole
  full_name: string
  phone: string | null
  avatar_url: string | null
  nisn?: string | null
  tingkat?: string | null
  nomor_pertandingan?: string | null
  needs_password_change?: boolean
}

export type UserRole = 'player' | 'admin' | 'superadmin' | 'coach'

export interface AuthTokens {
  access_token: string
  refresh_token: string
  expires_in: number
  user: User
}
