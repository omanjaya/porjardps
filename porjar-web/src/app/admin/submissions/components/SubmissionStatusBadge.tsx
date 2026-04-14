'use client'

import { CheckCircle, XCircle, Clock, WarningCircle } from '@phosphor-icons/react'
import { cn } from '@/lib/utils'

// Matches the adminSubmissionView struct from the backend
export interface AdminSubmissionData {
  id: string
  match_id: string
  match_type: 'bracket' | 'battle_royale' | 'group'
  team_a_name: string
  team_b_name: string
  submitted_team: string
  game_name: string
  claimed_score_a?: number
  claimed_score_b?: number
  claimed_winner?: string
  claimed_placement?: number
  claimed_kills?: number
  screenshots: string[]
  status: 'pending' | 'approved' | 'rejected' | 'disputed'
  submitted_by: string
  submitted_at: string
  rejection_reason?: string
  admin_notes?: string
  opponent_submission?: AdminSubmissionData | null
  history?: AdminSubmissionData[]
}

export type FilterTab = AdminSubmissionData['status'] | 'all'

export const statusConfig = {
  pending:  { label: 'Menunggu',      cls: 'bg-amber-50 dark:bg-amber-950/30 text-amber-700 border-amber-200',   icon: Clock },
  approved: { label: 'Disetujui',     cls: 'bg-green-50 dark:bg-green-950/30 text-green-700 border-green-200',   icon: CheckCircle },
  rejected: { label: 'Ditolak',       cls: 'bg-red-50 dark:bg-red-950/30 text-red-700 border-red-200',           icon: XCircle },
  disputed: { label: 'Disengketakan', cls: 'bg-purple-50 dark:bg-purple-950/30 text-purple-700 border-purple-200', icon: WarningCircle },
} as const

export function SubmissionStatusBadge({
  status,
  size = 'md',
}: {
  status: AdminSubmissionData['status']
  size?: 'sm' | 'md'
}) {
  const cfg = statusConfig[status]
  const Icon = cfg.icon
  if (size === 'sm') {
    return (
      <span className={cn('inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-medium', cfg.cls)}>
        <Icon size={10} weight="fill" />{cfg.label}
      </span>
    )
  }
  return (
    <span className={cn('inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-medium', cfg.cls)}>
      <Icon size={12} weight="fill" />{cfg.label}
    </span>
  )
}
