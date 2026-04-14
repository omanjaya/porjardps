'use client'

import { useEffect, useState } from 'react'
import { Input } from '@/components/ui/input'
import { FormDialog } from '@/components/shared/FormDialog'
import type { AnnouncementFormData, AnnouncementPriority } from '../hooks/useAnnouncements'

interface AnnouncementFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  processing: boolean
  onSubmit: (form: AnnouncementFormData) => Promise<boolean>
}

const emptyForm: AnnouncementFormData = {
  title: '',
  message: '',
  priority: 'normal',
  expires_at: '',
}

const PRIORITY_OPTIONS: { value: AnnouncementPriority; label: string }[] = [
  { value: 'low', label: 'Rendah' },
  { value: 'normal', label: 'Normal' },
  { value: 'high', label: 'Tinggi' },
  { value: 'urgent', label: 'Mendesak' },
]

export function AnnouncementFormDialog({
  open,
  onOpenChange,
  processing,
  onSubmit,
}: AnnouncementFormDialogProps) {
  const [form, setForm] = useState<AnnouncementFormData>(emptyForm)

  useEffect(() => {
    if (open) setForm(emptyForm)
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
      title="Buat Pengumuman"
      description="Kirim pengumuman ke peserta event."
      onSubmit={handleSubmit}
      submitting={processing}
      submitLabel="Kirim"
      maxWidth="lg"
    >
      <div>
        <label className="mb-1 block text-sm font-medium text-stone-700 dark:text-zinc-300">
          Judul <span className="text-red-500">*</span>
        </label>
        <Input
          placeholder="Judul pengumuman"
          maxLength={255}
          value={form.title}
          onChange={(e) => setForm((f) => ({ ...f, title: e.target.value.slice(0, 255) }))}
          className="bg-white dark:bg-zinc-900 border-stone-300 dark:border-zinc-600 focus:border-esi-red"
        />
        <p className="mt-1 text-xs text-stone-500 dark:text-zinc-500">
          {form.title.length}/255
        </p>
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-stone-700 dark:text-zinc-300">
          Pesan <span className="text-red-500">*</span>
        </label>
        <textarea
          rows={6}
          placeholder="Isi pengumuman..."
          value={form.message}
          onChange={(e) => setForm((f) => ({ ...f, message: e.target.value }))}
          className="w-full rounded-lg border border-stone-300 dark:border-zinc-600 bg-white dark:bg-zinc-900 px-3 py-2 text-sm text-stone-900 dark:text-zinc-100 focus:border-esi-red focus:outline-none focus:ring-1 focus:ring-esi-red"
        />
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-stone-700 dark:text-zinc-300">
          Prioritas
        </label>
        <select
          value={form.priority}
          onChange={(e) =>
            setForm((f) => ({ ...f, priority: e.target.value as AnnouncementPriority }))
          }
          className="w-full rounded-lg border border-stone-300 dark:border-zinc-600 bg-white dark:bg-zinc-900 px-3 py-2 text-sm text-stone-900 dark:text-zinc-100 focus:border-esi-red focus:outline-none focus:ring-1 focus:ring-esi-red"
        >
          {PRIORITY_OPTIONS.map((p) => (
            <option key={p.value} value={p.value}>
              {p.label}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-stone-700 dark:text-zinc-300">
          Kadaluarsa (opsional)
        </label>
        <Input
          type="datetime-local"
          value={form.expires_at}
          onChange={(e) => setForm((f) => ({ ...f, expires_at: e.target.value }))}
          className="bg-white dark:bg-zinc-900 border-stone-300 dark:border-zinc-600 focus:border-esi-red"
        />
      </div>
    </FormDialog>
  )
}
