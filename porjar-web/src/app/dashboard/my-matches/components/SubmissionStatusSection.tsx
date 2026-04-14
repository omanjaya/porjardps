'use client'

import { CheckCircle, XCircle, Upload, Hourglass } from '@phosphor-icons/react'

export interface SubmissionStatus {
  match_id: string
  status: 'pending' | 'approved' | 'rejected' | 'not_submitted'
  match_label: string
}

export function SubmissionStatusSection({
  submissions,
}: {
  submissions: SubmissionStatus[]
}) {
  const statusIcons: Record<string, React.ReactNode> = {
    approved: <CheckCircle size={16} weight="fill" className="text-green-600" />,
    rejected: <XCircle size={16} weight="fill" className="text-red-600" />,
    pending: <Hourglass size={16} weight="fill" className="text-amber-600" />,
    not_submitted: <Upload size={16} className="text-stone-400 dark:text-zinc-500" />,
  }

  const statusLabels: Record<string, string> = {
    approved: 'Diterima',
    rejected: 'Ditolak',
    pending: 'Menunggu Verifikasi',
    not_submitted: 'Belum Upload',
  }

  return (
    <div className="space-y-3">
      <h2 className="flex items-center gap-2 text-lg font-bold text-esi-text">
        <Upload size={20} weight="bold" />
        Status Pengiriman Bukti
      </h2>
      <div className="rounded-xl border border-esi-border bg-white dark:bg-zinc-900 shadow-sm divide-y divide-esi-border">
        {submissions.map((sub) => (
          <div key={sub.match_id} className="flex items-center gap-2 px-3 sm:px-5 py-3">
            <div className="shrink-0">{statusIcons[sub.status]}</div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-esi-text truncate">{sub.match_label}</p>
              {sub.status === 'not_submitted' && (
                <p className="text-[10px] text-stone-400 dark:text-zinc-500 italic">Menunggu match live</p>
              )}
            </div>
            <span
              className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium ${
                sub.status === 'approved'
                  ? 'bg-green-50 dark:bg-green-950/30 text-green-700 dark:text-green-300'
                  : sub.status === 'rejected'
                  ? 'bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-300'
                  : sub.status === 'pending'
                  ? 'bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-300'
                  : 'bg-stone-100 dark:bg-zinc-800 text-stone-500 dark:text-zinc-400'
              }`}
            >
              {statusLabels[sub.status]}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
