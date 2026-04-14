'use client'

import { FormDialog } from '@/components/shared/FormDialog'
import type { User, UserRole } from '@/types'
import { roleLabels } from '../constants'

interface ChangeRoleDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  target: { user: User; newRole: UserRole } | null
  processing: boolean
  onConfirm: (user: User, newRole: UserRole) => Promise<boolean>
}

export function ChangeRoleDialog({ open, onOpenChange, target, processing, onConfirm }: ChangeRoleDialogProps) {
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!target) return
    const ok = await onConfirm(target.user, target.newRole)
    if (ok) onOpenChange(false)
  }

  return (
    <FormDialog
      open={open}
      onOpenChange={(o) => { if (!o) onOpenChange(false) }}
      title="Ubah Role Pengguna"
      description={
        target
          ? `Ubah role ${target.user.full_name} dari ${roleLabels[target.user.role]} menjadi ${roleLabels[target.newRole]}?`
          : undefined
      }
      onSubmit={handleSubmit}
      submitting={processing}
      submitLabel="Ya, Ubah Role"
    >
      <div />
    </FormDialog>
  )
}
