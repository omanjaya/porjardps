'use client'

import { useEffect, useState } from 'react'
import { Input } from '@/components/ui/input'
import { FormDialog } from '@/components/shared/FormDialog'
import { NEWS_CATEGORIES, type News, type NewsFormData } from '@/types'
import { useUnsavedChanges } from '@/hooks/useUnsavedChanges'

interface NewsFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  mode: 'create' | 'edit'
  news?: News | null
  processing: boolean
  onSubmit: (form: NewsFormData) => Promise<boolean>
}

function slugify(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
}

function toDatetimeLocal(iso: string | undefined): string {
  if (!iso) return ''
  const d = new Date(iso)
  if (isNaN(d.getTime())) return ''
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

const emptyForm: NewsFormData = {
  title: '',
  slug: '',
  excerpt: '',
  content: '',
  category: 'Berita',
  image_url: '',
  published_at: '',
}

export function NewsFormDialog({ open, onOpenChange, mode, news, processing, onSubmit }: NewsFormDialogProps) {
  const [form, setForm] = useState<NewsFormData>(emptyForm)
  const [slugTouched, setSlugTouched] = useState(false)
  const [dirty, setDirty] = useState(false)
  useUnsavedChanges(dirty)

  useEffect(() => {
    if (!open) return
    if (mode === 'edit' && news) {
      setForm({
        title: news.title,
        slug: news.slug,
        excerpt: news.excerpt ?? '',
        content: news.content ?? '',
        category: news.category || 'Berita',
        image_url: news.image_url ?? '',
        published_at: toDatetimeLocal(news.published_at),
      })
      setSlugTouched(true)
    } else {
      setForm(emptyForm)
      setSlugTouched(false)
    }
    setDirty(false)
  }, [open, mode, news])

  function handleTitleChange(value: string) {
    setDirty(true)
    setForm((f) => ({
      ...f,
      title: value,
      slug: slugTouched ? f.slug : slugify(value),
    }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const ok = await onSubmit(form)
    if (ok) {
      setDirty(false)
      onOpenChange(false)
    }
  }

  function handleOpenChange(next: boolean) {
    if (!next && dirty && !confirm('Perubahan belum disimpan. Tutup?')) return
    if (!next) setDirty(false)
    onOpenChange(next)
  }

  return (
    <FormDialog
      open={open}
      onOpenChange={handleOpenChange}
      title={mode === 'create' ? 'Tambah Berita' : 'Edit Berita'}
      description={mode === 'create' ? 'Buat artikel berita baru.' : 'Perbarui artikel berita.'}
      onSubmit={handleSubmit}
      submitting={processing}
      maxWidth="xl"
    >
      <div>
        <label className="mb-1 block text-sm font-medium text-stone-700 dark:text-zinc-300">Judul <span className="text-red-500">*</span></label>
        <Input
          placeholder="Judul berita"
          value={form.title}
          onChange={(e) => handleTitleChange(e.target.value)}
          className="bg-white dark:bg-zinc-900 border-stone-300 dark:border-zinc-600 focus:border-esi-red"
        />
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium text-stone-700 dark:text-zinc-300">Slug <span className="text-red-500">*</span></label>
        <Input
          placeholder="slug-berita"
          value={form.slug}
          onChange={(e) => { setSlugTouched(true); setDirty(true); setForm((f) => ({ ...f, slug: e.target.value })) }}
          className="bg-white dark:bg-zinc-900 border-stone-300 dark:border-zinc-600 focus:border-esi-red font-mono text-sm"
        />
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium text-stone-700 dark:text-zinc-300">Kategori <span className="text-red-500">*</span></label>
        <select
          value={form.category}
          onChange={(e) => { setDirty(true); setForm((f) => ({ ...f, category: e.target.value })) }}
          className="w-full rounded-lg border border-stone-300 dark:border-zinc-600 bg-white dark:bg-zinc-900 px-3 py-2 text-sm text-stone-900 dark:text-zinc-100 focus:border-esi-red focus:outline-none focus:ring-1 focus:ring-esi-red"
        >
          {NEWS_CATEGORIES.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium text-stone-700 dark:text-zinc-300">Ringkasan</label>
        <textarea
          rows={2}
          placeholder="Ringkasan singkat untuk ditampilkan di daftar"
          value={form.excerpt}
          onChange={(e) => { setDirty(true); setForm((f) => ({ ...f, excerpt: e.target.value })) }}
          className="w-full rounded-lg border border-stone-300 dark:border-zinc-600 bg-white dark:bg-zinc-900 px-3 py-2 text-sm text-stone-900 dark:text-zinc-100 focus:border-esi-red focus:outline-none focus:ring-1 focus:ring-esi-red"
        />
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium text-stone-700 dark:text-zinc-300">Konten <span className="text-red-500">*</span></label>
        <textarea
          rows={8}
          placeholder="Konten lengkap artikel (mendukung Markdown)"
          value={form.content}
          onChange={(e) => { setDirty(true); setForm((f) => ({ ...f, content: e.target.value })) }}
          className="w-full rounded-lg border border-stone-300 dark:border-zinc-600 bg-white dark:bg-zinc-900 px-3 py-2 text-sm text-stone-900 dark:text-zinc-100 focus:border-esi-red focus:outline-none focus:ring-1 focus:ring-esi-red"
        />
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium text-stone-700 dark:text-zinc-300">URL Gambar</label>
        <Input
          type="url"
          placeholder="https://... atau /uploads/..."
          value={form.image_url}
          onChange={(e) => { setDirty(true); setForm((f) => ({ ...f, image_url: e.target.value })) }}
          className="bg-white dark:bg-zinc-900 border-stone-300 dark:border-zinc-600 focus:border-esi-red"
        />
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium text-stone-700 dark:text-zinc-300">Tanggal Publikasi</label>
        <Input
          type="datetime-local"
          value={form.published_at}
          onChange={(e) => { setDirty(true); setForm((f) => ({ ...f, published_at: e.target.value })) }}
          className="bg-white dark:bg-zinc-900 border-stone-300 dark:border-zinc-600 focus:border-esi-red"
        />
      </div>
    </FormDialog>
  )
}
