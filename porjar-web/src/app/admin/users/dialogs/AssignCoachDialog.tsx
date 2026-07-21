'use client'

import { useEffect, useState } from 'react'
import { FormDialog } from '@/components/shared/FormDialog'
import type { School, User } from '@/types'

interface AssignCoachDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  user: User | null
  schools: School[]
  schoolsLoading: boolean
  processing: boolean
  onConfirm: (user: User, schoolId: string) => Promise<boolean>
}

export function AssignCoachDialog({
  open,
  onOpenChange,
  user,
  schools,
  schoolsLoading,
  processing,
  onConfirm,
}: AssignCoachDialogProps) {
  const [schoolId, setSchoolId] = useState('')

  useEffect(() => {
    if (open) {
      setSchoolId('')
    }
  }, [open])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!user || !schoolId) return
    const ok = await onConfirm(user, schoolId)
    if (ok) onOpenChange(false)
  }

  return (
    <FormDialog
      open={open}
      onOpenChange={(o) => { if (!o) onOpenChange(false) }}
      title="Tugaskan sebagai Coach"
      description={
        user
          ? `Tugaskan ${user.full_name} sebagai coach untuk sebuah sekolah. Jika role saat ini adalah player, role akan otomatis dinaikkan menjadi coach.`
          : undefined
      }
      onSubmit={handleSubmit}
      submitting={processing}
      submitDisabled={!schoolId || schoolsLoading}
      submitLabel="Tugaskan"
    >
      <div>
        <label className="mb-1 block text-sm font-medium text-stone-700 dark:text-zinc-300">
          Sekolah <span className="text-red-500">*</span>
        </label>
        <select
          value={schoolId}
          onChange={(e) => setSchoolId(e.target.value)}
          disabled={schoolsLoading}
          className="w-full rounded-lg border border-stone-300 dark:border-zinc-600 bg-white dark:bg-zinc-900 px-3 py-2 text-sm text-stone-900 dark:text-zinc-100 focus:border-esi-red focus:outline-none focus:ring-1 focus:ring-esi-red disabled:opacity-50"
        >
          <option value="">
            {schoolsLoading ? 'Memuat sekolah...' : '-- Pilih Sekolah --'}
          </option>
          {schools.map((s) => (
            <option key={s.id} value={s.id}>{s.name}</option>
          ))}
        </select>
      </div>
    </FormDialog>
  )
}
