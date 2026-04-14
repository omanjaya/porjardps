'use client'

import { FormDialog } from '@/components/shared/FormDialog'
import { Input } from '@/components/ui/input'

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  reason: string
  onReasonChange: (v: string) => void
  onConfirm: () => void
}

export function RejectSchoolRequestDialog({ open, onOpenChange, reason, onReasonChange, onConfirm }: Props) {
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    onConfirm()
  }

  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Tolak Permintaan"
      onSubmit={handleSubmit}
      submitLabel="Tolak"
      submitVariant="destructive"
      maxWidth="sm"
    >
      <div>
        <label className="mb-1 block text-xs font-medium text-stone-500 dark:text-zinc-400">Alasan penolakan</label>
        <Input
          value={reason}
          onChange={(e) => onReasonChange(e.target.value)}
          placeholder="Contoh: Sekolah sudah terdaftar dengan nama lain"
          className="bg-white dark:bg-zinc-800 border-stone-300 dark:border-zinc-700"
        />
      </div>
    </FormDialog>
  )
}
