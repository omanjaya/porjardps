'use client'

import { GameController, Image as ImageIcon, Clock, CheckCircle, XCircle, WarningCircle } from '@phosphor-icons/react'
import { cn } from '@/lib/utils'

export type SubmissionStatus = 'pending' | 'approved' | 'rejected' | 'disputed'

export interface SubmissionData {
  id: string
  match_id: string
  match_type: 'bracket' | 'battle_royale'
  team_a_name: string
  team_b_name: string
  game_name: string
  game_slug: string
  claimed_score_a?: number
  claimed_score_b?: number
  claimed_winner?: string
  claimed_placement?: number
  claimed_kills?: number
  screenshots: string[]
  status: SubmissionStatus
  submitted_by: string
  submitted_team: string
  submitted_at: string
  rejection_reason?: string
  is_auto_matched?: boolean
}

const statusConfig: Record<SubmissionStatus, { label: string; className: string; icon: typeof Clock }> = {
  pending: {
    label: 'Menunggu',
    className: 'bg-amber-50 text-amber-700 border-amber-200',
    icon: Clock,
  },
  approved: {
    label: 'Disetujui',
    className: 'bg-green-50 text-green-700 border-green-200',
    icon: CheckCircle,
  },
  rejected: {
    label: 'Ditolak',
    className: 'bg-red-50 text-red-700 border-red-200',
    icon: XCircle,
  },
  disputed: {
    label: 'Sengketa',
    className: 'bg-purple-50 text-purple-700 border-purple-200',
    icon: WarningCircle,
  },
}

interface SubmissionCardProps {
  submission: SubmissionData
  onClick?: (submission: SubmissionData) => void
  className?: string
}

export function SubmissionCard({ submission, onClick, className }: SubmissionCardProps) {
  const config = statusConfig[submission.status]
  const StatusIcon = config.icon

  const timeAgo = formatTimeAgo(submission.submitted_at)

  return (
    <div
      onClick={() => onClick?.(submission)}
      className={cn(
        'group cursor-pointer rounded-xl border border-stone-200 bg-white p-4 shadow-sm transition-all hover:border-porjar-red/30 hover:shadow-md',
        className
      )}
    >
      {/* Header: game + status */}
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-porjar-red/10">
            <GameController size={18} weight="duotone" className="text-porjar-red" />
          </div>
          <span className="text-xs font-semibold uppercase tracking-wider text-porjar-muted">
            {submission.game_name}
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          {submission.is_auto_matched && (
            <span
              className="-skew-x-2 rounded bg-blue-100 px-1.5 py-0.5 text-[10px] font-bold uppercase text-blue-700 cursor-help"
              title="Kedua tim mengirim skor yang sama — dapat di-approve otomatis"
            >
              Auto-match
            </span>
          )}
          <span
            className={cn(
              'inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-medium',
              config.className
            )}
          >
            <StatusIcon size={12} weight="fill" />
            {config.label}
          </span>
        </div>
      </div>

      {/* Match info */}
      {submission.match_type === 'bracket' ? (
        <div className="mb-3">
          <div className="flex items-center justify-center gap-3 text-sm">
            <span className="font-semibold text-porjar-text">{submission.team_a_name}</span>
            <span className="rounded bg-porjar-bg px-2 py-0.5 text-xs font-bold text-porjar-red">
              {submission.claimed_score_a ?? '?'} - {submission.claimed_score_b ?? '?'}
            </span>
            <span className="font-semibold text-porjar-text">{submission.team_b_name}</span>
          </div>
          {submission.claimed_winner && (
            <p className="mt-1 text-center text-xs text-porjar-muted">
              Pemenang: <span className="font-medium text-porjar-red">{submission.claimed_winner}</span>
            </p>
          )}
        </div>
      ) : (
        <div className="mb-3 text-center">
          <p className="text-sm font-semibold text-porjar-text">{submission.team_a_name}</p>
          <div className="mt-1 flex items-center justify-center gap-4 text-xs text-porjar-muted">
            <span>Placement: <span className="font-bold text-porjar-red">#{submission.claimed_placement}</span></span>
            <span>Kills: <span className="font-bold text-porjar-text">{submission.claimed_kills}</span></span>
          </div>
        </div>
      )}

      {/* Screenshots count + info */}
      <div className="flex items-center justify-between border-t border-stone-100 pt-3">
        <div className="flex items-center gap-1.5 text-xs text-porjar-muted">
          <ImageIcon size={14} />
          <span>{(submission.screenshots ?? []).length} screenshot</span>
        </div>
        <div className="text-right">
          <p className="text-xs text-porjar-muted">{submission.submitted_by}</p>
          <p className="text-[10px] text-porjar-muted/70">{timeAgo}</p>
        </div>
      </div>

      {/* Rejection reason */}
      {submission.status === 'rejected' && submission.rejection_reason && (
        <div className="mt-3 rounded-lg border-l-4 border-red-400 bg-red-50 px-3 py-2">
          <p className="text-xs font-medium text-red-700">Alasan: {submission.rejection_reason}</p>
        </div>
      )}
    </div>
  )
}

function formatTimeAgo(dateString: string): string {
  const now = new Date()
  const date = new Date(dateString)
  const diff = Math.floor((now.getTime() - date.getTime()) / 1000)

  if (diff < 60) return 'Baru saja'
  if (diff < 3600) return `${Math.floor(diff / 60)} menit lalu`
  if (diff < 86400) return `${Math.floor(diff / 3600)} jam lalu`
  return `${Math.floor(diff / 86400)} hari lalu`
}
