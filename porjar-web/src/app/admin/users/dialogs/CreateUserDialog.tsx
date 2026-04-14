'use client'

import { useState, useEffect } from 'react'
import { Input } from '@/components/ui/input'
import { FormDialog } from '@/components/shared/FormDialog'
import type { UserRole } from '@/types'
import { createRoles, emptyCreateForm, roleLabels, tingkatOptions, type CreateUserForm } from '../constants'

interface CreateUserDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  processing: boolean
  onSubmit: (form: CreateUserForm) => Promise<boolean>
}

export function CreateUserDialog({ open, onOpenChange, processing, onSubmit }: CreateUserDialogProps) {
  const [form, setForm] = useState<CreateUserForm>(emptyCreateForm)

  useEffect(() => {
    if (open) setForm(emptyCreateForm)
  }, [open])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const ok = await onSubmit(form)
    if (ok) onOpenChange(false)
  }

  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Tambah Pengguna"
      description="Buat akun pengguna baru untuk platform turnamen."
      onSubmit={handleSubmit}
      submitting={processing}
      submitLabel="Simpan"
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
        <label className="mb-1 block text-sm font-medium text-stone-700 dark:text-zinc-300">Password <span className="text-red-500">*</span></label>
        <Input
          type="password"
          placeholder="Minimal 8 karakter"
          value={form.password}
          onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
          className="bg-white dark:bg-zinc-900 border-stone-300 dark:border-zinc-600 focus:border-esi-red"
        />
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium text-stone-700 dark:text-zinc-300">Role <span className="text-red-500">*</span></label>
        <select
          value={form.role}
          onChange={(e) => setForm((f) => ({ ...f, role: e.target.value as UserRole }))}
          className="w-full rounded-lg border border-stone-300 dark:border-zinc-600 bg-white dark:bg-zinc-900 px-3 py-2 text-sm text-stone-900 dark:text-zinc-100 focus:border-esi-red focus:outline-none focus:ring-1 focus:ring-esi-red"
        >
          {createRoles.map((r) => (
            <option key={r} value={r}>{roleLabels[r]}</option>
          ))}
        </select>
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
      <div>
        <label className="mb-1 block text-sm font-medium text-stone-700 dark:text-zinc-300">Nomor Pertandingan</label>
        <Input
          placeholder="Mis. ML-01, FF-15"
          value={form.nomor_pertandingan}
          onChange={(e) => setForm((f) => ({ ...f, nomor_pertandingan: e.target.value }))}
          className="bg-white dark:bg-zinc-900 border-stone-300 dark:border-zinc-600 focus:border-esi-red font-mono"
        />
        <p className="mt-1 text-xs text-stone-500 dark:text-zinc-500">Nomor kit turnamen (opsional)</p>
      </div>
    </FormDialog>
  )
}
