'use client'

import { CheckCircle, XCircle, GameController } from '@phosphor-icons/react'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { resolveMediaUrl } from '@/lib/api'
import { SubmissionStatusBadge, type AdminSubmissionData, type FilterTab } from './SubmissionStatusBadge'
import { SubmissionRejectionForm } from './SubmissionRejectionForm'

export function SubmissionsTable({
  loading,
  filtered,
  filter,
  selectedIds,
  setSelectedIds,
  processing,
  rejectId,
  setRejectId,
  rejectReason,
  setRejectReason,
  onApprove,
  onReject,
  onOpenDetail,
  onOpenLightbox,
}: {
  loading: boolean
  filtered: AdminSubmissionData[]
  filter: FilterTab
  selectedIds: Set<string>
  setSelectedIds: (s: Set<string>) => void
  processing: string | null
  rejectId: string | null
  setRejectId: (id: string | null) => void
  rejectReason: string
  setRejectReason: (v: string) => void
  onApprove: (id: string) => void
  onReject: (id: string) => void
  onOpenDetail: (id: string) => void
  onOpenLightbox: (url: string) => void
}) {
  if (loading) {
    return (
      <div className="space-y-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-48 rounded-xl bg-esi-border" />
        ))}
      </div>
    )
  }

  if (filtered.length === 0) {
    return (
      <div className="rounded-xl border border-stone-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 p-10 text-center shadow-sm">
        <CheckCircle size={40} weight="duotone" className="mx-auto mb-3 text-esi-border" />
        <p className="text-sm text-esi-muted">
          {filter === 'pending' ? 'Tidak ada submission pending' : 'Tidak ada submission ditemukan'}
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {filtered.map(sub => (
        <div
          key={sub.id}
          onClick={() => onOpenDetail(sub.id)}
          className="cursor-pointer rounded-xl border border-stone-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 p-5 shadow-sm transition-all hover:border-esi-red/30 hover:shadow-md"
        >
          {/* Header */}
          <div className="mb-4 flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
            <div className="flex items-center gap-3">
              {sub.status === 'pending' && (
                <input
                  type="checkbox"
                  checked={selectedIds.has(sub.id)}
                  onChange={(e) => {
                    e.stopPropagation()
                    const next = new Set(selectedIds)
                    e.target.checked ? next.add(sub.id) : next.delete(sub.id)
                    setSelectedIds(next)
                  }}
                  onClick={e => e.stopPropagation()}
                  className="shrink-0 h-4 w-4 rounded border-stone-300 text-esi-red focus:ring-esi-red"
                />
              )}
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-esi-red/10">
                <GameController size={22} weight="duotone" className="text-esi-red" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold uppercase tracking-wider text-esi-muted">
                    {sub.game_name}
                  </span>
                </div>
                {sub.match_type === 'bracket' || sub.match_type === 'group' ? (
                  <p className="text-sm font-bold text-esi-text">
                    {sub.match_type === 'group' && <span className="mr-1.5 -skew-x-2 inline-block rounded bg-teal-100 dark:bg-teal-950/30 px-1.5 py-0.5 text-[10px] font-bold uppercase text-teal-700 dark:text-teal-400">Grup</span>}
                    {sub.team_a_name} <span className="text-esi-red">{sub.claimed_score_a ?? '?'} – {sub.claimed_score_b ?? '?'}</span> {sub.team_b_name}
                  </p>
                ) : (
                  <p className="text-sm font-bold text-esi-text">
                    {sub.submitted_team} — Placement #{sub.claimed_placement ?? '?'}, {sub.claimed_kills ?? 0} kills
                  </p>
                )}
              </div>
            </div>

            <div className="text-right text-xs text-esi-muted shrink-0">
              <p>Oleh: <span className="font-medium text-esi-text">{sub.submitted_by}</span></p>
              <p>{sub.submitted_team}</p>
              <p className="mt-0.5 text-[10px]">{new Date(sub.submitted_at).toLocaleString('id-ID')}</p>
              <div className="mt-1">
                <SubmissionStatusBadge status={sub.status} size="sm" />
              </div>
            </div>
          </div>

          {/* Screenshots */}
          {(sub.screenshots ?? []).length > 0 && (
            <div className="mb-4 flex gap-2 overflow-x-auto pb-1">
              {(sub.screenshots ?? []).slice(0, 4).map((url, i) => {
                const resolved = resolveMediaUrl(url)
                return resolved ? (
                  <button
                    key={i}
                    onClick={(e) => { e.stopPropagation(); onOpenLightbox(resolved) }}
                    className="shrink-0 overflow-hidden rounded-lg border border-stone-200 dark:border-zinc-700 transition-transform hover:scale-105"
                  >
                    <img src={resolved} alt={`Screenshot ${i + 1}`} className="h-20 w-28 object-cover" />
                  </button>
                ) : null
              })}
            </div>
          )}

          {/* Actions */}
          <div
            className="flex items-center gap-2 border-t border-stone-100 dark:border-zinc-700 pt-3"
            onClick={e => e.stopPropagation()}
          >
            {sub.status === 'pending' && (
              <div className="flex flex-wrap items-center gap-2 w-full">
                <Button
                  size="sm"
                  onClick={(e) => { e.stopPropagation(); onApprove(sub.id) }}
                  disabled={processing === sub.id}
                  className="bg-green-600 text-white hover:bg-green-700"
                >
                  <CheckCircle size={16} weight="bold" className="mr-1" />
                  Approve
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={(e) => { e.stopPropagation(); setRejectId(rejectId === sub.id ? null : sub.id) }}
                  disabled={processing === sub.id}
                  className="border-red-300 text-red-600 hover:bg-red-50 dark:bg-red-950/30"
                >
                  <XCircle size={16} weight="bold" className="mr-1" />
                  Reject
                </Button>
                <button
                  onClick={(e) => { e.stopPropagation(); onOpenDetail(sub.id) }}
                  className="ml-auto text-xs font-medium text-esi-muted hover:text-esi-red transition-colors"
                >
                  Lihat Detail →
                </button>
              </div>
            )}
            {sub.status !== 'pending' && (
              <>
                {sub.rejection_reason && (
                  <span className="text-xs text-esi-muted">Alasan: {sub.rejection_reason}</span>
                )}
                <button
                  onClick={(e) => { e.stopPropagation(); onOpenDetail(sub.id) }}
                  className="ml-auto text-xs font-medium text-esi-red hover:underline"
                >
                  Detail →
                </button>
              </>
            )}
          </div>

          {/* Reject dialog */}
          {rejectId === sub.id && (
            <SubmissionRejectionForm
              reason={rejectReason}
              onChange={setRejectReason}
              onSubmit={() => onReject(sub.id)}
              onCancel={() => { setRejectId(null); setRejectReason('') }}
              disabled={processing === sub.id}
            />
          )}
        </div>
      ))}
    </div>
  )
}
