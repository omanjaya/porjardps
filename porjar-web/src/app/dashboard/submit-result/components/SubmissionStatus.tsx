'use client'

import { ArrowCounterClockwise, WarningCircle, ListBullets } from '@phosphor-icons/react'
import { Skeleton } from '@/components/ui/skeleton'
import { EmptyState } from '@/components/shared/EmptyState'
import { SubmissionCard } from '@/components/modules/submission/SubmissionCard'
import type { SubmissionData } from '@/components/modules/submission/SubmissionCard'

interface Props {
  submissions: SubmissionData[]
  loading: boolean
  onEditSubmission: (sub: SubmissionData) => void
  onResubmit: (sub: SubmissionData) => void
}

export function SubmissionStatus({ submissions, loading, onEditSubmission, onResubmit }: Props) {
  const hasRejected = submissions.some(s => s.status === 'rejected')

  return (
    <>
      {hasRejected && (
        <div className="mb-4 rounded-lg border border-amber-200 dark:border-amber-800/50 bg-amber-50 dark:bg-amber-950/30 px-4 py-2.5 flex items-center gap-2">
          <WarningCircle size={16} className="text-amber-600 shrink-0" />
          <p className="text-sm text-amber-700 dark:text-amber-400">Kamu punya hasil yang ditolak. Klik untuk melihat alasan dan kirim ulang.</p>
        </div>
      )}

      <div>
        <h2 className="mb-3 flex items-center gap-2 text-base font-bold uppercase tracking-wide text-esi-text">
          <ArrowCounterClockwise size={18} weight="fill" className="text-esi-red" />
          Riwayat Pengiriman
        </h2>

        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-32 rounded-xl bg-esi-border" />
            ))}
          </div>
        ) : submissions.length > 0 ? (
          <div className="space-y-3">
            {submissions.map(sub => (
              <div key={sub.id}>
                <SubmissionCard
                  submission={sub}
                  onEditSubmission={onEditSubmission}
                />
                {(sub.status === 'rejected' || sub.status === 'disputed') && (
                  <button
                    onClick={() => onResubmit(sub)}
                    className="mt-2 ml-4 flex items-center gap-1 text-xs font-medium text-esi-red hover:underline"
                  >
                    <ArrowCounterClockwise size={12} />
                    Kirim ulang
                  </button>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="rounded-xl border border-stone-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 shadow-sm">
            <EmptyState
              size="sm"
              icon={ListBullets}
              title="Belum ada riwayat pengiriman"
              description="Hasil pertandingan yang kamu kirim akan muncul di sini."
            />
          </div>
        )}
      </div>
    </>
  )
}
