'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { api, resolveMediaUrl } from '@/lib/api'
import { useAuthStore } from '@/store/auth-store'
import { PageHeader } from '@/components/shared/PageHeader'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Spinner, FloppyDisk, UploadSimple, X, Image as ImageIcon } from '@phosphor-icons/react'
import { useLogoUpload } from '@/app/admin/schools/hooks/useLogoUpload'
import { useUnsavedChanges } from '@/hooks/useUnsavedChanges'
import type { Event } from '@/types'

type EventStatus = Event['status']

interface EventFormData {
  name: string
  slug: string
  short_name: string
  description: string
  primary_color: string
  secondary_color: string
  logo_url: string
  banner_url: string
  poster_url: string
  start_date: string
  end_date: string
  registration_start: string
  registration_end: string
  venue: string
  city: string
  organizer: string
  contact_phone: string
  contact_email: string
  instagram_url: string
  website_url: string
  announcement: string
  announcement_active: boolean
  status: EventStatus
  registration_open: boolean
  rules_published: boolean
  requires_school: boolean
  sort_order: number
}

const emptyForm: EventFormData = {
  name: '',
  slug: '',
  short_name: '',
  description: '',
  primary_color: '#dc2626',
  secondary_color: '#1f2937',
  logo_url: '',
  banner_url: '',
  poster_url: '',
  start_date: '',
  end_date: '',
  registration_start: '',
  registration_end: '',
  venue: '',
  city: 'Denpasar, Bali',
  organizer: 'ESI Kota Denpasar',
  contact_phone: '',
  contact_email: '',
  instagram_url: '',
  website_url: '',
  announcement: '',
  announcement_active: false,
  status: 'draft',
  registration_open: false,
  rules_published: false,
  requires_school: false,
  sort_order: 0,
}

const STATUS_OPTIONS: { value: EventStatus; label: string }[] = [
  { value: 'draft', label: 'Draft' },
  { value: 'published', label: 'Published' },
  { value: 'ongoing', label: 'Ongoing' },
  { value: 'completed', label: 'Completed' },
  { value: 'archived', label: 'Archived' },
]

function slugify(text: string) {
  return text.toLowerCase().replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, '-').replace(/-+/g, '-').trim()
}

function toDateTimeLocal(iso: string | null | undefined): string {
  if (!iso) return ''
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`
}

function fromDateTimeLocal(value: string): string | null {
  if (!value) return null
  const d = new Date(value)
  return Number.isNaN(d.getTime()) ? null : d.toISOString()
}

function Label({ children, htmlFor, className = '' }: { children: React.ReactNode; htmlFor?: string; className?: string }) {
  return <label htmlFor={htmlFor} className={`mb-1.5 block text-sm font-medium text-stone-700 dark:text-zinc-300 ${className}`}>{children}</label>
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-stone-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 shadow-sm overflow-hidden">
      <div className="border-b border-stone-100 dark:border-zinc-800 bg-stone-50 dark:bg-zinc-800/50 px-5 py-3">
        <h3 className="text-sm font-semibold text-stone-700 dark:text-zinc-300">{title}</h3>
      </div>
      <div className="p-5 space-y-4">{children}</div>
    </div>
  )
}

function UploadField({
  id, name, label, hint, previewClass, value, onUpload, onChange, onClear,
}: {
  id: string; name: string; label: string; hint?: string; previewClass: string
  value: string; onUpload: (url: string) => void; onChange: (e: React.ChangeEvent<HTMLInputElement>) => void; onClear: () => void
}) {
  const upload = useLogoUpload(onUpload)
  return (
    <div>
      <Label htmlFor={id}>{label}</Label>
      {hint && <p className="text-xs text-stone-500 dark:text-zinc-400 mb-2">{hint}</p>}
      <div
        onDragOver={(e) => { e.preventDefault(); upload.setDragOver(true) }}
        onDragLeave={() => upload.setDragOver(false)}
        onDrop={(e) => { e.preventDefault(); upload.setDragOver(false); const f = e.dataTransfer.files[0]; if (f?.type.startsWith('image/')) upload.upload(f) }}
        onClick={() => upload.inputRef.current?.click()}
        className={`mb-2 flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed py-5 transition-colors ${upload.dragOver ? 'border-esi-red bg-esi-red/5' : 'border-stone-200 dark:border-zinc-700 hover:border-esi-red/50 hover:bg-stone-50 dark:hover:bg-zinc-800/50'}`}
      >
        {upload.uploading ? (
          <p className="text-xs text-stone-500 dark:text-zinc-400">Mengupload...</p>
        ) : value ? (
          <div className="flex flex-col items-center gap-1.5">
            <img src={resolveMediaUrl(value) ?? value} alt="Preview" className={`${previewClass} rounded-lg border border-stone-200 dark:border-zinc-700 object-cover`} />
            <p className="text-[10px] text-stone-400 dark:text-zinc-500">Klik atau drag untuk ganti</p>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-1 text-stone-400 dark:text-zinc-500">
            <UploadSimple size={22} />
            <p className="text-xs font-medium">Drag & drop atau klik untuk upload</p>
          </div>
        )}
        <input ref={upload.inputRef} type="file" accept="image/*" className="hidden"
          onChange={(e) => { const f = e.target.files?.[0]; if (f) upload.upload(f); e.target.value = '' }} />
      </div>
      <div className="flex items-center gap-2">
        <Input id={id} name={name} type="url" value={value} onChange={onChange} placeholder="https://..." className="text-xs" />
        {value ? (
          <button type="button" onClick={onClear} className="shrink-0 rounded-md p-1 text-stone-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30"><X size={14} /></button>
        ) : (
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-stone-100 dark:bg-zinc-800 border border-stone-200 dark:border-zinc-700"><ImageIcon size={14} className="text-stone-400 dark:text-zinc-500" /></div>
        )}
      </div>
    </div>
  )
}

interface Props {
  eventId?: string
}

export function EventFormContent({ eventId }: Props) {
  const router = useRouter()
  const { isAuthenticated, isLoading: authLoading } = useAuthStore()
  const [form, setForm] = useState<EventFormData>(emptyForm)
  const [loadingEvent, setLoadingEvent] = useState(!!eventId)
  const [submitting, setSubmitting] = useState(false)
  const [slugManual, setSlugManual] = useState(false)
  const [dirty, setDirty] = useState(false)
  useUnsavedChanges(dirty)

  const isEdit = !!eventId

  const loadEvent = useCallback(async () => {
    if (!eventId || !isAuthenticated || authLoading) return
    try {
      const data = await api.get<Event>(`/admin/events/${eventId}`)
      if (!data) return
      setForm({
        name: data.name,
        slug: data.slug,
        short_name: data.short_name || '',
        description: data.description || '',
        primary_color: data.primary_color || '#dc2626',
        secondary_color: data.secondary_color || '#1f2937',
        logo_url: data.logo_url || '',
        banner_url: data.banner_url || '',
        poster_url: data.poster_url || '',
        start_date: toDateTimeLocal(data.start_date),
        end_date: toDateTimeLocal(data.end_date),
        registration_start: toDateTimeLocal(data.registration_start),
        registration_end: toDateTimeLocal(data.registration_end),
        venue: data.venue || '',
        city: data.city || '',
        organizer: data.organizer || '',
        contact_phone: data.contact_phone || '',
        contact_email: data.contact_email || '',
        instagram_url: data.instagram_url || '',
        website_url: data.website_url || '',
        announcement: data.announcement || '',
        announcement_active: data.announcement_active ?? false,
        status: data.status,
        registration_open: data.registration_open ?? false,
        rules_published: data.rules_published ?? false,
        requires_school: data.requires_school ?? false,
        sort_order: data.sort_order ?? 0,
      })
      setSlugManual(true)
    } catch {
      toast.error('Gagal memuat data event')
    } finally {
      setLoadingEvent(false)
    }
  }, [eventId, isAuthenticated, authLoading])

  useEffect(() => {
    loadEvent()
  }, [loadEvent])

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) {
    const { name, value } = e.target
    setDirty(true)
    setForm(prev => {
      const next = { ...prev, [name]: value }
      if (name === 'name' && !slugManual) next.slug = slugify(value)
      if (name === 'slug') setSlugManual(true)
      return next
    })
  }

  function handleCheck(name: keyof EventFormData) {
    return (e: React.ChangeEvent<HTMLInputElement>) => {
      setDirty(true)
      setForm(prev => ({ ...prev, [name]: e.target.checked }))
    }
  }

  function setField<K extends keyof EventFormData>(name: K, value: EventFormData[K]) {
    setDirty(true)
    setForm(prev => ({ ...prev, [name]: value }))
  }

  async function handleSubmit() {
    if (!form.name.trim()) { toast.error('Nama event wajib diisi'); return }
    if (!form.slug.trim()) { toast.error('Slug wajib diisi'); return }

    const payload = {
      name: form.name,
      slug: form.slug,
      short_name: form.short_name || null,
      description: form.description || null,
      primary_color: form.primary_color,
      secondary_color: form.secondary_color || null,
      logo_url: form.logo_url || null,
      banner_url: form.banner_url || null,
      poster_url: form.poster_url || null,
      start_date: fromDateTimeLocal(form.start_date),
      end_date: fromDateTimeLocal(form.end_date),
      registration_start: fromDateTimeLocal(form.registration_start),
      registration_end: fromDateTimeLocal(form.registration_end),
      venue: form.venue || null,
      city: form.city || null,
      organizer: form.organizer || null,
      contact_phone: form.contact_phone || null,
      contact_email: form.contact_email || null,
      instagram_url: form.instagram_url || null,
      website_url: form.website_url || null,
      announcement: form.announcement || null,
      announcement_active: form.announcement_active,
      status: form.status,
      registration_open: form.registration_open,
      rules_published: form.rules_published,
      requires_school: form.requires_school,
      sort_order: Number(form.sort_order) || 0,
    }

    try {
      setSubmitting(true)
      if (isEdit) {
        await api.put(`/admin/events/${eventId}`, payload)
        toast.success('Event berhasil diperbarui')
      } else {
        await api.post('/admin/events', payload)
        toast.success('Event berhasil dibuat')
      }
      setDirty(false)
      router.push('/admin/events')
    } catch {
      toast.error(isEdit ? 'Gagal memperbarui event' : 'Gagal membuat event')
    } finally {
      setSubmitting(false)
    }
  }

  if (authLoading || loadingEvent) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-64 bg-stone-100 dark:bg-zinc-800" />
        <Skeleton className="h-64 w-full bg-stone-100 dark:bg-zinc-800" />
        <Skeleton className="h-48 w-full bg-stone-100 dark:bg-zinc-800" />
      </div>
    )
  }

  return (
    <>
      <PageHeader
        title={isEdit ? `Edit: ${form.name || '...'}` : 'Buat Event Baru'}
        description={isEdit ? 'Perbarui informasi event' : 'Isi detail event baru'}
        breadcrumbs={[
          { label: 'Events', href: '/admin/events' },
          { label: isEdit ? (form.name || '...') : 'Buat Event Baru' },
        ]}
        actions={
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => router.push('/admin/events')} disabled={submitting}>
              Batal
            </Button>
            <Button onClick={handleSubmit} disabled={submitting} className="bg-esi-red text-white hover:bg-esi-red/90">
              {submitting ? <Spinner size={16} className="mr-1.5 animate-spin" /> : <FloppyDisk size={16} className="mr-1.5" />}
              {submitting ? 'Menyimpan...' : isEdit ? 'Simpan Perubahan' : 'Buat Event'}
            </Button>
          </div>
        }
      />

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Main column */}
        <div className="xl:col-span-2 space-y-5">

          {/* Informasi Dasar */}
          <Section title="Informasi Dasar">
            <div>
              <Label htmlFor="name">Nama Event *</Label>
              <Input id="name" name="name" value={form.name} onChange={handleChange} placeholder="ESI Kota Denpasar 2026" />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="slug">Slug *</Label>
                <Input id="slug" name="slug" value={form.slug} onChange={handleChange} placeholder="esi-denpasar-2026" className="font-mono text-sm" />
              </div>
              <div>
                <Label htmlFor="short_name">Nama Singkat</Label>
                <Input id="short_name" name="short_name" value={form.short_name} onChange={handleChange} placeholder="ESI 2026" />
              </div>
            </div>
            <div>
              <Label htmlFor="description">Deskripsi</Label>
              <textarea
                id="description" name="description" value={form.description} onChange={handleChange} rows={3}
                placeholder="Deskripsi singkat event"
                className="flex min-h-[80px] w-full rounded-md border border-stone-300 dark:border-zinc-600 bg-white dark:bg-zinc-950 px-3 py-2 text-sm text-esi-text placeholder:text-esi-muted focus:outline-none focus:ring-2 focus:ring-esi-red/40"
              />
            </div>
          </Section>

          {/* Jadwal */}
          <Section title="Jadwal">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="start_date">Tanggal Mulai</Label>
                <Input id="start_date" name="start_date" type="datetime-local" value={form.start_date} onChange={handleChange} />
              </div>
              <div>
                <Label htmlFor="end_date">Tanggal Selesai</Label>
                <Input id="end_date" name="end_date" type="datetime-local" value={form.end_date} onChange={handleChange} />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="registration_start">Pendaftaran Dibuka</Label>
                <Input id="registration_start" name="registration_start" type="datetime-local" value={form.registration_start} onChange={handleChange} />
              </div>
              <div>
                <Label htmlFor="registration_end">Pendaftaran Ditutup</Label>
                <Input id="registration_end" name="registration_end" type="datetime-local" value={form.registration_end} onChange={handleChange} />
              </div>
            </div>
          </Section>

          {/* Lokasi */}
          <Section title="Lokasi">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="venue">Venue</Label>
                <Input id="venue" name="venue" value={form.venue} onChange={handleChange} placeholder="Graha Yowana Suci" />
              </div>
              <div>
                <Label htmlFor="city">Kota</Label>
                <Input id="city" name="city" value={form.city} onChange={handleChange} placeholder="Denpasar, Bali" />
              </div>
            </div>
            <div>
              <Label htmlFor="organizer">Penyelenggara</Label>
              <Input id="organizer" name="organizer" value={form.organizer} onChange={handleChange} placeholder="ESI Kota Denpasar" />
            </div>
          </Section>

          {/* Kontak & Sosmed */}
          <Section title="Kontak & Media Sosial">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="contact_phone">Nomor Telepon</Label>
                <Input id="contact_phone" name="contact_phone" type="tel" value={form.contact_phone} onChange={handleChange} placeholder="+62 812-3456-7890" />
              </div>
              <div>
                <Label htmlFor="contact_email">Email</Label>
                <Input id="contact_email" name="contact_email" type="email" value={form.contact_email} onChange={handleChange} placeholder="info@porjar.id" />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="instagram_url">Instagram URL</Label>
                <Input id="instagram_url" name="instagram_url" type="url" value={form.instagram_url} onChange={handleChange} placeholder="https://instagram.com/..." />
              </div>
              <div>
                <Label htmlFor="website_url">Website URL</Label>
                <Input id="website_url" name="website_url" type="url" value={form.website_url} onChange={handleChange} placeholder="https://..." />
              </div>
            </div>
          </Section>

          {/* Pengumuman */}
          <Section title="Pengumuman">
            <div>
              <Label htmlFor="announcement">Teks Pengumuman</Label>
              <textarea
                id="announcement" name="announcement" value={form.announcement} onChange={handleChange} rows={4}
                placeholder="Tulis pengumuman yang akan ditampilkan di halaman event"
                className="flex min-h-[96px] w-full rounded-md border border-stone-300 dark:border-zinc-600 bg-white dark:bg-zinc-950 px-3 py-2 text-sm text-esi-text placeholder:text-esi-muted focus:outline-none focus:ring-2 focus:ring-esi-red/40"
              />
            </div>
            <div className="flex items-center gap-3">
              <input type="checkbox" id="announcement_active" checked={form.announcement_active} onChange={handleCheck('announcement_active')} className="h-4 w-4 rounded border-stone-300 text-esi-red focus:ring-esi-red" />
              <Label htmlFor="announcement_active" className="mb-0">Tampilkan pengumuman (aktif)</Label>
            </div>
          </Section>
        </div>

        {/* Right sidebar */}
        <div className="space-y-5">

          {/* Status & Flag */}
          <Section title="Status & Pengaturan">
            <div>
              <Label>Status Event</Label>
              <Select value={form.status} onValueChange={(val) => setField('status', val as EventStatus)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STATUS_OPTIONS.map(opt => (
                    <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="sort_order">Urutan Tampil</Label>
              <Input
                id="sort_order" name="sort_order" type="number" value={form.sort_order}
                onChange={(e) => setField('sort_order', Number(e.target.value) || 0)} placeholder="0"
              />
            </div>
            <div className="space-y-3 pt-1">
              {[
                { id: 'registration_open', label: 'Pendaftaran dibuka' },
                { id: 'rules_published', label: 'Peraturan dipublikasikan' },
                { id: 'requires_school', label: 'Wajib terdaftar di sekolah' },
              ].map(({ id, label }) => (
                <label key={id} className="flex items-center gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    id={id}
                    checked={form[id as keyof EventFormData] as boolean}
                    onChange={handleCheck(id as keyof EventFormData)}
                    className="h-4 w-4 rounded border-stone-300 text-esi-red focus:ring-esi-red"
                  />
                  <span className="text-sm text-stone-700 dark:text-zinc-300">{label}</span>
                </label>
              ))}
            </div>
          </Section>

          {/* Tampilan */}
          <Section title="Tampilan & Branding">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="primary_color">Warna Utama</Label>
                <div className="flex items-center gap-2">
                  <input type="color" id="primary_color" name="primary_color" value={form.primary_color} onChange={handleChange}
                    className="h-9 w-9 shrink-0 cursor-pointer rounded border border-stone-300 dark:border-zinc-600" />
                  <Input name="primary_color" value={form.primary_color} onChange={handleChange} className="font-mono text-xs" aria-label="Kode warna utama" />
                </div>
              </div>
              <div>
                <Label htmlFor="secondary_color">Warna Sekunder</Label>
                <div className="flex items-center gap-2">
                  <input type="color" id="secondary_color" name="secondary_color" value={form.secondary_color} onChange={handleChange}
                    className="h-9 w-9 shrink-0 cursor-pointer rounded border border-stone-300 dark:border-zinc-600" />
                  <Input name="secondary_color" value={form.secondary_color} onChange={handleChange} className="font-mono text-xs" aria-label="Kode warna sekunder" />
                </div>
              </div>
            </div>

            {/* Color preview */}
            <div className="rounded-lg overflow-hidden border border-stone-200 dark:border-zinc-700">
              <div className="h-10 w-full" style={{ background: form.primary_color }} />
              <div className="h-4 w-full" style={{ background: form.secondary_color }} />
            </div>

            <UploadField
              id="logo_url" name="logo_url" label="Logo Event" previewClass="h-14 w-14"
              value={form.logo_url}
              onUpload={(url) => setField('logo_url', url)}
              onChange={handleChange}
              onClear={() => setField('logo_url', '')}
            />
            <UploadField
              id="banner_url" name="banner_url" label="Banner Event" hint="Rasio 16:9 disarankan" previewClass="h-12 w-32"
              value={form.banner_url}
              onUpload={(url) => setField('banner_url', url)}
              onChange={handleChange}
              onClear={() => setField('banner_url', '')}
            />
            <UploadField
              id="poster_url" name="poster_url" label="Poster Event" hint="Rasio 2:3 atau 9:16 (vertikal)" previewClass="h-24 w-16"
              value={form.poster_url}
              onUpload={(url) => setField('poster_url', url)}
              onChange={handleChange}
              onClear={() => setField('poster_url', '')}
            />
          </Section>
        </div>
      </div>

      {/* Bottom save bar */}
      <div className="mt-8 flex justify-end gap-3 border-t border-stone-200 dark:border-zinc-700 pt-6">
        <Button variant="outline" onClick={() => router.push('/admin/events')} disabled={submitting}>Batal</Button>
        <Button onClick={handleSubmit} disabled={submitting} className="bg-esi-red text-white hover:bg-esi-red/90">
          {submitting ? <Spinner size={16} className="mr-1.5 animate-spin" /> : <FloppyDisk size={16} className="mr-1.5" />}
          {submitting ? 'Menyimpan...' : isEdit ? 'Simpan Perubahan' : 'Buat Event'}
        </Button>
      </div>
    </>
  )
}
