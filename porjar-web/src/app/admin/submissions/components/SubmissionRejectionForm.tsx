'use client'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

export function SubmissionRejectionForm({
  reason,
  onChange,
  onSubmit,
  onCancel,
  disabled,
}: {
  reason: string
  onChange: (value: string) => void
  onSubmit: () => void
  onCancel: () => void
  disabled?: boolean
}) {
  return (
    <div
      className="mt-3 rounded-lg border border-red-200 bg-red-50 dark:bg-red-950/30 p-3"
      onClick={e => e.stopPropagation()}
    >
      <label className="mb-1 block text-xs font-medium text-red-700">Alasan Penolakan</label>
      <Input
        placeholder="Masukkan alasan penolakan..."
        value={reason}
        onChange={e => onChange(e.target.value)}
        className="mb-2 border-red-200 bg-white dark:bg-zinc-900 text-sm focus:border-red-400 focus:ring-red-400/20"
      />
      <div className="flex gap-2">
        <Button
          size="sm"
          onClick={onSubmit}
          disabled={disabled}
          className="bg-red-600 text-white hover:bg-red-700"
        >
          {disabled ? 'Memproses...' : 'Kirim Penolakan'}
        </Button>
        <Button
          size="sm"
          variant="ghost"
          onClick={onCancel}
        >
          Batal
        </Button>
      </div>
    </div>
  )
}
