'use client'

import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { resolveMediaUrl } from '@/lib/api'
import { Input } from '@/components/ui/input'
import { FormDialog } from '@/components/shared/FormDialog'
import { Image as ImageIcon, UploadSimple, X } from '@phosphor-icons/react'
import type { School, SchoolLevel } from '@/types'
import { useLogoUpload } from '../hooks/useLogoUpload'
import { emptyForm, type SchoolFormData } from '../hooks/useSchoolCrud'

const levelOptions: SchoolLevel[] = ['SMP', 'SMA', 'SMK', 'MTs', 'MA']

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  mode: 'create' | 'edit'
  school: School | null
  submitting: boolean
  onSubmit: (form: SchoolFormData) => Promise<boolean>
}

export function SchoolFormDialog({ open, onOpenChange, mode, school, submitting, onSubmit }: Props) {
  const [form, setForm] = useState<SchoolFormData>(emptyForm)

  useEffect(() => {
    if (!open) return
    if (mode === 'edit' && school) {
      setForm({
        name: school.name,
        level: school.level,
        address: school.address ?? '',
        city: school.city,
        logo_url: school.logo_url ?? '',
        coach_phone: school.coach_phone ?? '',
      })
    } else {
      setForm(emptyForm)
    }
  }, [open, mode, school])

  const logo = useLogoUpload((url) => setForm((f) => ({ ...f, logo_url: url })))
  const editingId = mode === 'edit' ? school?.id ?? null : null

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const ok = await onSubmit(form)
    if (ok) onOpenChange(false)
  }

  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      title={editingId ? 'Edit Sekolah' : 'Tambah Sekolah'}
      onSubmit={handleSubmit}
      submitting={submitting}
      submitLabel={editingId ? 'Perbarui' : 'Simpan'}
    >
      <div>
        <label className="mb-1 block text-xs font-medium text-stone-500 dark:text-zinc-400">Nama Sekolah</label>
        <Input
          value={form.name}
          onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
          placeholder="SMAN 1 Denpasar"
          className="bg-white dark:bg-zinc-900 border-stone-300 dark:border-zinc-600 text-stone-900 dark:text-zinc-100 focus:border-esi-red focus:ring-esi-red/20"
        />
      </div>
      <div>
        <label className="mb-1 block text-xs font-medium text-stone-500 dark:text-zinc-400">Jenjang</label>
        <div className="flex gap-2">
          {levelOptions.map((level) => (
            <button
              key={level}
              type="button"
              onClick={() => setForm((f) => ({ ...f, level }))}
              className={`rounded-lg px-4 py-1.5 text-sm font-medium transition-colors ${
                form.level === level
                  ? 'bg-esi-red text-white'
                  : 'bg-stone-100 dark:bg-zinc-800 text-stone-500 dark:text-zinc-400 hover:text-stone-900 dark:hover:text-zinc-100 dark:text-zinc-100'
              }`}
            >
              {level}
            </button>
          ))}
        </div>
      </div>
      <div>
        <label className="mb-1 block text-xs font-medium text-stone-500 dark:text-zinc-400">Alamat</label>
        <Input
          value={form.address}
          onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))}
          placeholder="Jl. Kamboja No. 1"
          className="bg-white dark:bg-zinc-900 border-stone-300 dark:border-zinc-600 text-stone-900 dark:text-zinc-100 focus:border-esi-red focus:ring-esi-red/20"
        />
      </div>
      <div>
        <label className="mb-1 block text-xs font-medium text-stone-500 dark:text-zinc-400">Kota</label>
        <Input
          value={form.city}
          onChange={(e) => setForm((f) => ({ ...f, city: e.target.value }))}
          placeholder="Denpasar"
          className="bg-white dark:bg-zinc-900 border-stone-300 dark:border-zinc-600 text-stone-900 dark:text-zinc-100 focus:border-esi-red focus:ring-esi-red/20"
        />
      </div>
      <div>
        <label className="mb-1 block text-xs font-medium text-stone-500 dark:text-zinc-400">Telepon Pembina (opsional)</label>
        <Input
          type="tel"
          inputMode="tel"
          value={form.coach_phone}
          onChange={(e) => setForm((f) => ({ ...f, coach_phone: e.target.value }))}
          placeholder="08xxxxxxxxxx"
          className="bg-white dark:bg-zinc-900 border-stone-300 dark:border-zinc-600 text-stone-900 dark:text-zinc-100 focus:border-esi-red focus:ring-esi-red/20"
        />
      </div>
      <div>
        <label className="mb-1 block text-xs font-medium text-stone-500 dark:text-zinc-400">Logo Sekolah</label>

        {editingId && (
          <div
            onDragOver={(e) => { e.preventDefault(); logo.setDragOver(true) }}
            onDragLeave={() => logo.setDragOver(false)}
            onDrop={(e) => {
              e.preventDefault()
              logo.setDragOver(false)
              const file = e.dataTransfer.files[0]
              if (file && file.type.startsWith('image/')) logo.upload(file)
              else toast.error('File harus berupa gambar')
            }}
            onClick={() => logo.inputRef.current?.click()}
            className={`mb-2 flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed py-4 transition-colors ${
              logo.dragOver
                ? 'border-esi-red bg-esi-red/5'
                : 'border-stone-300 dark:border-zinc-600 hover:border-esi-red/50 hover:bg-stone-50 dark:hover:bg-zinc-800/50'
            }`}
          >
            {logo.uploading ? (
              <p className="text-xs text-stone-500 dark:text-zinc-400">Mengupload...</p>
            ) : form.logo_url ? (
              <div className="flex flex-col items-center gap-1.5">
                <img
                  src={resolveMediaUrl(form.logo_url) ?? form.logo_url}
                  alt="Preview"
                  className="h-14 w-14 rounded-lg border border-stone-200 dark:border-zinc-700 object-cover"
                />
                <p className="text-[10px] text-stone-400 dark:text-zinc-500">Klik atau drag untuk ganti</p>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-1 text-stone-400 dark:text-zinc-500">
                <UploadSimple size={22} />
                <p className="text-xs font-medium">Drag & drop atau klik untuk upload</p>
                <p className="text-[10px]">JPG, PNG, WebP — otomatis dikonversi ke WebP</p>
              </div>
            )}
            <input
              ref={logo.inputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0]
                if (file) logo.upload(file)
                e.target.value = ''
              }}
            />
          </div>
        )}

        <div className="flex items-center gap-2">
          <Input
            value={form.logo_url}
            onChange={(e) => setForm((f) => ({ ...f, logo_url: e.target.value }))}
            placeholder="/images/schools/sman1-denpasar.webp"
            className="bg-white dark:bg-zinc-900 border-stone-300 dark:border-zinc-600 text-stone-900 dark:text-zinc-100 focus:border-esi-red focus:ring-esi-red/20 text-xs"
          />
          {form.logo_url ? (
            <button
              type="button"
              onClick={() => setForm((f) => ({ ...f, logo_url: '' }))}
              className="shrink-0 rounded-md p-1 text-stone-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30"
            >
              <X size={14} />
            </button>
          ) : (
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-stone-100 dark:bg-zinc-800 border border-stone-200 dark:border-zinc-700">
              <ImageIcon size={14} className="text-stone-400 dark:text-zinc-500" />
            </div>
          )}
        </div>
      </div>
    </FormDialog>
  )
}
