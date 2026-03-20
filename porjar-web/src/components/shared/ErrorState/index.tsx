'use client'

import { WarningCircle } from '@phosphor-icons/react'
import { Button } from '@/components/ui/button'

interface ErrorStateProps {
  title?: string
  message?: string
  onRetry?: () => void
}

export function ErrorState({
  title = 'Terjadi Kesalahan',
  message,
  onRetry,
}: ErrorStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <WarningCircle size={48} weight="thin" className="text-red-400" />
      <h3 className="mt-4 text-lg font-semibold text-slate-200">{title}</h3>
      {message && (
        <p className="mt-1 max-w-sm text-sm text-slate-400">{message}</p>
      )}
      {onRetry && (
        <Button variant="outline" size="sm" className="mt-4" onClick={onRetry}>
          Coba Lagi
        </Button>
      )}
    </div>
  )
}
