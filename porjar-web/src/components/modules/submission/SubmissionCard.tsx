'use client'

import { useState } from 'react'
import { GameController, Image as ImageIcon, Clock, CheckCircle, XCircle, WarningCircle, PencilSimple } from '@phosphor-icons/react'
import { cn } from '@/lib/utils'
import { resolveMediaUrl } from '@/lib/api'
import { relativeTime as formatTimeAgo } from '@/lib/relativeTime'

const MAX_THUMBS = 3

export type SubmissionStatus = 'pending' | 'approved' | 'rejected' | 'disputed'

export interface SubmissionData {
  id: string
  match_id: string
  match_type: 'bracket' | 'battle_royale' | 'group'
  team_a_name: string
  team_b_name: string
  game_name: string
  game_slug: string
  claimed_score_a?: number
  claimed_score_b?: number
  claimed_winner?: string
  claimed_placement?: number
  claimed_kills?: number
  kills_p1?: number
  kills_p2?: number
  kills_p3?: number
  kills_p4?: number
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
    className: 'bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-800/50',
    icon: Clock,
  },
  approved: {
    label: 'Disetujui',
    className: 'bg-green-50 dark:bg-green-950/30 text-green-700 dark:text-green-400 border-green-200 dark:border-green-800/50',
    icon: CheckCircle,
  },
  rejected: {
    label: 'Ditolak',
    className: 'bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-400 border-red-200 dark:border-red-800/50',
    icon: XCircle,
  },
  disputed: {
    label: 'Sengketa',
    className: 'bg-purple-50 dark:bg-purple-950/30 text-purple-700 dark:text-purple-400 border-purple-200 dark:border-purple-800/50',
    icon: WarningCircle,
  },
}

interface SubmissionCardProps {
  submission: SubmissionData
  onClick?: (submission: SubmissionData) => void
  onEditSubmission?: (submission: SubmissionData) => void
  className?: string
}

function ScreenshotThumbnail({ src, extra }: { src: string; extra?: number }) {
  const [err, setErr] = useState(false)
  const resolved = resolveMediaUrl(src)

  if (extra !== undefined) {
    return (
      <div className="h-12 w-12 shrink-0 rounded-md bg-stone-100 dark:bg-zinc-800 flex items-center justify-center text-xs font-bold text-stone-500 dark:text-zinc-500 border border-stone-200 dark:border-zinc-700">
        +{extra}
      </div>
    )
  }

  if (err || !resolved) {
    return <div className="h-12 w-12 shrink-0 rounded-md bg-stone-100 dark:bg-zinc-800 border border-stone-200 dark:border-zinc-700" />
  }

  return (
    <a
      href={resolved}
      target="_blank"
      rel="noopener noreferrer"
      onClick={(e) => e.stopPropagation()}
    >
      <img
        src={resolved}
        alt="Screenshot"
        onError={() => setErr(true)}
        className="h-12 w-12 shrink-0 rounded-md object-cover border border-stone-200 dark:border-zinc-700"
      />
    </a>
  )
}

export function SubmissionCard({ submission, onClick, onEditSubmission, className }: SubmissionCardProps) {
  const config = statusConfig[submission.status]
  const StatusIcon = config.icon

  const timeAgo = formatTimeAgo(submission.submitted_at)
  const screenshots = submission.screenshots ?? []
  const overflow = screenshots.length - MAX_THUMBS

  return (
    <div
      onClick={() => onClick?.(submission)}
      className={cn(
        'group cursor-pointer rounded-xl border border-stone-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 p-4 shadow-sm transition-all hover:border-esi-red/30 hover:shadow-md',
        className
      )}
    >
      {/* Header: game + status */}
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-esi-red/10">
            <GameController size={18} weight="duotone" className="text-esi-red" />
          </div>
          <span className="text-xs font-semibold uppercase tracking-wider text-esi-muted">
            {submission.game_name}
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          {submission.is_auto_matched && (
            <span
              className="-skew-x-2 rounded bg-blue-100 dark:bg-blue-950/30 px-1.5 py-0.5 text-[10px] font-bold uppercase text-blue-700 dark:text-blue-400 cursor-help"
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
      {submission.match_type === 'bracket' || submission.match_type === 'group' ? (
        <div className="mb-3">
          <div className="flex items-center justify-center gap-2 text-sm min-w-0">
            <span className="font-semibold text-esi-text truncate min-w-0 flex-1 text-right">{submission.team_a_name}</span>
            <span className="shrink-0 rounded bg-esi-bg px-2 py-0.5 text-xs font-bold text-esi-red tabular-nums">
              {submission.claimed_score_a ?? '?'} - {submission.claimed_score_b ?? '?'}
            </span>
            <span className="font-semibold text-esi-text truncate min-w-0 flex-1 text-left">{submission.team_b_name}</span>
          </div>
          {submission.claimed_winner && (
            <p className="mt-1 text-center text-xs text-esi-muted truncate">
              Menang: <span className="font-medium text-esi-red">{submission.claimed_winner}</span>
            </p>
          )}
        </div>
      ) : (
        <div className="mb-3 text-center">
          <p className="text-sm font-semibold text-esi-text truncate">{submission.team_a_name}</p>
          <div className="mt-1 flex items-center justify-center gap-4 text-xs text-esi-muted">
            <span>Placement: <span className="font-bold text-esi-red">#{submission.claimed_placement}</span></span>
            <span>Kills: <span className="font-bold text-esi-text">{submission.claimed_kills}</span></span>
          </div>
        </div>
      )}

      {/* Screenshot thumbnails */}
      {screenshots.length > 0 && (
        <div className="flex gap-1.5 mb-2 overflow-x-auto">
          {screenshots.slice(0, overflow > 0 ? MAX_THUMBS - 1 : MAX_THUMBS).map((url, i) => (
            <ScreenshotThumbnail key={i} src={url} />
          ))}
          {overflow > 0 && (
            <ScreenshotThumbnail src="" extra={overflow + 1} />
          )}
        </div>
      )}

      {/* Screenshots count + info */}
      <div className="flex items-center justify-between border-t border-stone-100 dark:border-zinc-700 pt-3">
        <div className="flex items-center gap-1.5 text-xs text-esi-muted">
          <ImageIcon size={14} />
          <span>{(submission.screenshots ?? []).length} screenshot</span>
          {submission.status === 'pending' && onEditSubmission && (
            <button
              onClick={(e) => { e.stopPropagation(); onEditSubmission(submission) }}
              className="ml-1 inline-flex items-center gap-0.5 rounded px-1.5 py-0.5 text-[10px] font-medium text-esi-red hover:bg-esi-red/5 transition-colors"
            >
              <PencilSimple size={10} weight="bold" />
              Edit
            </button>
          )}
        </div>
        <div className="text-right">
          <p className="text-xs text-esi-muted">{submission.submitted_by}</p>
          <p className="text-[10px] text-esi-muted/70">{timeAgo}</p>
        </div>
      </div>

      {/* Rejection reason */}
      {submission.status === 'rejected' && submission.rejection_reason && (
        <div className="mt-3 rounded-lg border-l-4 border-red-400 dark:border-red-600 bg-red-50 dark:bg-red-950/30 px-3 py-2">
          <p className="text-xs font-medium text-red-700 dark:text-red-400">Alasan: {submission.rejection_reason}</p>
        </div>
      )}
    </div>
  )
}

