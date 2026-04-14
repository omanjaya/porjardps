'use client'

import { useEffect, useState } from 'react'
import { Input } from '@/components/ui/input'
import { FormDialog } from '@/components/shared/FormDialog'
import type { User } from '@/types'
import { emptyEditForm, tingkatOptions, type EditUserForm } from '../constants'

interface EditUserDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  user: User | null
  processing: boolean
  onSubmit: (user: User, form: EditUserForm) => Promise<boolean>
}

export function EditUserDialog({ open, onOpenChange, user, processing, onSubmit }: EditUserDialogProps) {
  const [form, setForm] = useState<EditUserForm>(emptyEditForm)

  useEffect(() => {
    if (open && user) {
      setForm({
        full_name: user.full_name,
        email: user.email,
        phone: user.phone ?? '',
        tingkat: user.tingkat ?? '',
      })
    } else if (!open) {
      setForm(emptyEditForm)
    }
  }, [open, user])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!user) return
    const ok = await onSubmit(user, form)
    if (ok) onOpenChange(false)
  }

  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Edit Pengguna"
      description={user ? `Perbarui informasi pengguna ${user.full_name}.` : undefined}
      onSubmit={handleSubmit}
      submitting={processing}
      submitLabel="Simpan Perubahan"
    >
      <div>
        <label className="mb-1 block text-sm font-medium text-stone-700 dark:text-zinc-300">Nama Lengkap <span className="text-red-500">*</span></label>
        <Input
          placeholder="Nama lengkap"
          value={form.full_name}
          onChange={(e) => setForm((f) => ({ ...f, full_name: e.target.value }))}
          className="bg-white dark:bg-zinc-900 border-stone-300 dark:border-zinc-600 focus:border-esi-red"
        />
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium text-stone-700 dark:text-zinc-300">Email <span className="text-red-500">*</span></label>
        <Input
          type="email"
          placeholder="email@contoh.com"
          value={form.email}
          onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
          className="bg-white dark:bg-zinc-900 border-stone-300 dark:border-zinc-600 focus:border-esi-red"
        />
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium text-stone-700 dark:text-zinc-300">Telepon</label>
        <Input
          type="tel"
          placeholder="08xxxxxxxxxx"
          value={form.phone}
          onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
          className="bg-white dark:bg-zinc-900 border-stone-300 dark:border-zinc-600 focus:border-esi-red"
        />
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium text-stone-700 dark:text-zinc-300">Tingkat</label>
        <select
          value={form.tingkat}
          onChange={(e) => setForm((f) => ({ ...f, tingkat: e.target.value }))}
          className="w-full rounded-lg border border-stone-300 dark:border-zinc-600 bg-white dark:bg-zinc-900 px-3 py-2 text-sm text-stone-900 dark:text-zinc-100 focus:border-esi-red focus:outline-none focus:ring-1 focus:ring-esi-red"
        >
          <option value="">-- Pilih Tingkat --</option>
          {tingkatOptions.map((t) => (
            <option key={t} value={t}>{t}</option>
          ))}
        </select>
      </div>
    </FormDialog>
  )
}
