'use client'

import { Button } from '@/components/ui/button'
import { Clock, Check, X } from '@phosphor-icons/react'
import type { SchoolRequest } from '@/types'

interface Props {
  requests: SchoolRequest[]
  approvingId: string | null
  onApprove: (id: string) => void
  onReject: (id: string) => void
}

export function SchoolRequestsSection({ requests, approvingId, onApprove, onReject }: Props) {
  if (requests.length === 0) return null
  return (
    <div className="mb-6 rounded-xl border border-amber-200 dark:border-amber-800/50 bg-amber-50/50 dark:bg-amber-950/20 overflow-hidden">
      <div className="flex items-center gap-2 px-4 py-3 border-b border-amber-200/50 dark:border-amber-800/30">
        <Clock size={16} className="text-amber-500" />
        <span className="text-sm font-semibold text-amber-700 dark:text-amber-400">
          {requests.length} permintaan sekolah baru
        </span>
      </div>
      <div className="divide-y divide-amber-100 dark:divide-amber-900/30">
        {requests.map((req) => (
          <div key={req.id} className="flex items-center justify-between px-4 py-3 gap-3">
            <div className="min-w-0">
              <p className="text-sm font-medium text-stone-800 dark:text-zinc-200 truncate">
                {req.name} <span className="text-stone-400 dark:text-zinc-500">({req.level})</span>
              </p>
              <p className="text-xs text-stone-400 dark:text-zinc-500">
                Diajukan oleh {req.requester_name ?? 'Unknown'} · {new Date(req.created_at).toLocaleDateString('id-ID')}
              </p>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <Button
                size="sm"
                disabled={approvingId === req.id}
                onClick={() => onApprove(req.id)}
                className="bg-emerald-500 hover:bg-emerald-600 text-white text-xs px-3"
              >
                <Check size={14} className="mr-1" />
                {approvingId === req.id ? '...' : 'Setujui'}
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => onReject(req.id)}
                className="text-xs px-3 border-stone-300 dark:border-zinc-600 text-stone-500 dark:text-zinc-400"
              >
                <X size={14} className="mr-1" />
                Tolak
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
