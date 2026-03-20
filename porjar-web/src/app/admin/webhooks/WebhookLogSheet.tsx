'use client'

import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { CheckCircle, XCircle } from '@phosphor-icons/react'
import { EVENT_LABELS } from './WebhookFormDialog'

interface WebhookLog {
  id: string
  webhook_id: string
  event: string
  payload: unknown
  response_status: number | null
  response_body: string | null
  duration_ms: number | null
  success: boolean
  created_at: string
}

interface WebhookLogSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  webhookName: string
  logs: WebhookLog[]
  loading: boolean
}

function formatDate(dateStr: string | null) {
  if (!dateStr) return '-'
  return new Date(dateStr).toLocaleString('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function WebhookLogSheet({
  open,
  onOpenChange,
  webhookName,
  logs,
  loading,
}: WebhookLogSheetProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[80vh] overflow-y-auto border-stone-200 bg-white text-stone-900 sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>Delivery Logs: {webhookName}</DialogTitle>
          <DialogDescription className="text-stone-500">
            Riwayat pengiriman webhook (50 terbaru)
          </DialogDescription>
        </DialogHeader>
        {loading ? (
          <div className="space-y-2">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-12 w-full bg-stone-200" />
            ))}
          </div>
        ) : logs.length === 0 ? (
          <p className="py-8 text-center text-stone-400">Belum ada log delivery</p>
        ) : (
          <div className="space-y-2">
            {logs.map((log) => (
              <div
                key={log.id}
                className="rounded-lg border border-stone-200 p-3"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {log.success ? (
                      <CheckCircle className="h-4 w-4 text-green-500" weight="fill" />
                    ) : (
                      <XCircle className="h-4 w-4 text-red-500" weight="fill" />
                    )}
                    <Badge
                      variant="outline"
                      className="border-stone-300 text-xs text-stone-500"
                    >
                      {EVENT_LABELS[log.event] || log.event}
                    </Badge>
                    {log.response_status && (
                      <span
                        className={`text-xs font-mono ${
                          log.response_status >= 200 && log.response_status < 300
                            ? 'text-green-600'
                            : 'text-red-500'
                        }`}
                      >
                        {log.response_status}
                      </span>
                    )}
                    {log.duration_ms != null && (
                      <span className="text-xs text-stone-400">{log.duration_ms}ms</span>
                    )}
                  </div>
                  <span className="text-xs text-stone-400">{formatDate(log.created_at)}</span>
                </div>
                {log.response_body && (
                  <pre className="mt-2 max-h-24 overflow-auto rounded bg-stone-50 border border-stone-200 p-2 text-xs text-stone-600">
                    {log.response_body}
                  </pre>
                )}
              </div>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
