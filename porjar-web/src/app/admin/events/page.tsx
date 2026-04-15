'use client'

import { useEffect, useState, useCallback } from 'react'
import { toast } from 'sonner'
import { api } from '@/lib/api'
import { useAuthStore } from '@/store/auth-store'
import { AdminLayout } from '@/components/layouts/AdminLayout'
import { PageHeader } from '@/components/shared/PageHeader'
import { EmptyState } from '@/components/shared/EmptyState'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
// Label component inline (no shadcn label installed)
function Label({ children, htmlFor, className = '' }: { children: React.ReactNode; htmlFor?: string; className?: string }) {
  return <label htmlFor={htmlFor} className={`text-sm font-medium text-stone-700 dark:text-zinc-300 ${className}`}>{children}</label>
}
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import Link from 'next/link'
import { Trophy, Plus, PencilSimple, Spinner, Medal, GraduationCap, Trash, Archive } from '@phosphor-icons/react'
import type { Event } from '@/types'
import { useUnsavedChanges } from '@/hooks/useUnsavedChanges'

type EventStatus = Event['status']

interface EventFormData {
  // Informasi Dasar
  name: string
  slug: string
  short_name: string
  description: string
  // Tampilan
  primary_color: string
  secondary_color: string
  logo_url: string
  banner_url: string
  // Jadwal
  start_date: string
  end_date: string
  registration_start: string
  registration_end: string
  // Lokasi
  venue: string
  city: string
  organizer: string
  // Kontak & Sosmed
  contact_phone: string
  contact_email: string
  instagram_url: string
  website_url: string
  // Pengumuman
  announcement: string
  announcement_active: boolean
  // Status & Flag
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

const STATUS_VARIANT: Record<EventStatus, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  draft: 'secondary',
  published: 'default',
  ongoing: 'default',
  completed: 'outline',
  archived: 'outline',
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim()
}

// Convert an ISO string (or empty) to the value <input type="datetime-local"> expects: YYYY-MM-DDTHH:mm
function toDateTimeLocal(iso: string | null | undefined): string {
  if (!iso) return ''
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

// Convert a datetime-local string (YYYY-MM-DDTHH:mm) to an ISO string for the API, or null if empty.
function fromDateTimeLocal(value: string): string | null {
  if (!value) return null
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return null
  return d.toISOString()
}

// Section wrapper for grouping form fields.
function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <fieldset className="rounded-lg border border-esi-border bg-stone-50/50 dark:bg-zinc-900/40 p-4">
      <legend className="px-2 text-sm font-semibold text-esi-text">{title}</legend>
      <div className="space-y-4">{children}</div>
    </fieldset>
  )
}

export default function AdminEventsPage() {
  const { isAuthenticated, isLoading: authLoading } = useAuthStore()
  const [events, setEvents] = useState<Event[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState<EventFormData>(emptyForm)
  const [submitting, setSubmitting] = useState(false)
  const [slugManual, setSlugManual] = useState(false)
  const [dirty, setDirty] = useState(false)
  useUnsavedChanges(dirty)

  // Bulk selection state
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [bulkConfirmOpen, setBulkConfirmOpen] = useState(false)
  const [bulkProcessing, setBulkProcessing] = useState(false)

  // Archive state
  const [archivingId, setArchivingId] = useState<string | null>(null)

  const loadEvents = useCallback(async () => {
    if (!isAuthenticated || authLoading) return
    try {
      setLoading(true)
      const data = await api.get<Event[]>('/admin/events')
      setEvents(Array.isArray(data) ? data : [])
    } catch {
      toast.error('Gagal memuat data event')
    } finally {
      setLoading(false)
    }
  }, [isAuthenticated, authLoading])

  useEffect(() => {
    loadEvents()
  }, [loadEvents])

  if (authLoading) {
    return (
      <AdminLayout>
        <div className="space-y-4">
          {[1, 2, 3].map(i => (
            <Skeleton key={i} className="h-16 w-full rounded-xl" />
          ))}
        </div>
      </AdminLayout>
    )
  }

  if (!isAuthenticated) {
    return null
  }

  function openCreateDialog() {
    setEditingId(null)
    setForm(emptyForm)
    setSlugManual(false)
    setDirty(false)
    setDialogOpen(true)
  }

  function openEditDialog(event: Event) {
    setEditingId(event.id)
    setForm({
      name: event.name,
      slug: event.slug,
      short_name: event.short_name || '',
      description: event.description || '',
      primary_color: event.primary_color || '#dc2626',
      secondary_color: event.secondary_color || '#1f2937',
      logo_url: event.logo_url || '',
      banner_url: event.banner_url || '',
      start_date: toDateTimeLocal(event.start_date),
      end_date: toDateTimeLocal(event.end_date),
      registration_start: toDateTimeLocal(event.registration_start),
      registration_end: toDateTimeLocal(event.registration_end),
      venue: event.venue || '',
      city: event.city || '',
      organizer: event.organizer || '',
      contact_phone: event.contact_phone || '',
      contact_email: event.contact_email || '',
      instagram_url: event.instagram_url || '',
      website_url: event.website_url || '',
      announcement: event.announcement || '',
      announcement_active: event.announcement_active ?? false,
      status: event.status,
      registration_open: event.registration_open ?? false,
      rules_published: event.rules_published ?? false,
      requires_school: event.requires_school ?? false,
      sort_order: event.sort_order ?? 0,
    })
    setSlugManual(true)
    setDirty(false)
    setDialogOpen(true)
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) {
    const { name, value } = e.target
    setDirty(true)
    setForm(prev => {
      const next = { ...prev, [name]: value }
      // Auto-generate slug from name if not manually edited
      if (name === 'name' && !slugManual) {
        next.slug = slugify(value)
      }
      if (name === 'slug') {
        setSlugManual(true)
      }
      return next
    })
  }

  function handleCheck(name: keyof EventFormData) {
    return (e: React.ChangeEvent<HTMLInputElement>) => {
      setDirty(true)
      setForm(prev => ({ ...prev, [name]: e.target.checked }))
    }
  }

  function handleCloseDialog(open: boolean) {
    if (!open && dirty && !confirm('Perubahan belum disimpan. Tutup?')) return
    if (!open) setDirty(false)
    setDialogOpen(open)
  }

  async function handleSubmit() {
    if (!form.name.trim()) {
      toast.error('Nama event wajib diisi')
      return
    }
    if (!form.slug.trim()) {
      toast.error('Slug wajib diisi')
      return
    }

    try {
      setSubmitting(true)
      // Emptry string -> null for nullable fields; dates go through ISO conversion.
      const payload = {
        name: form.name,
        slug: form.slug,
        short_name: form.short_name || null,
        description: form.description || null,
        primary_color: form.primary_color,
        secondary_color: form.secondary_color || null,
        logo_url: form.logo_url || null,
        banner_url: form.banner_url || null,
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

      if (editingId) {
        await api.put(`/admin/events/${editingId}`, payload)
        toast.success('Event berhasil diperbarui')
      } else {
        await api.post('/admin/events', payload)
        toast.success('Event berhasil dibuat')
      }

      setDirty(false)
      setDialogOpen(false)
      loadEvents()
    } catch {
      toast.error(editingId ? 'Gagal memperbarui event' : 'Gagal membuat event')
    } finally {
      setSubmitting(false)
    }
  }

  function formatDate(dateStr: string | null): string {
    if (!dateStr) return '-'
    return new Date(dateStr).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })
  }

  function toggleOne(id: string) {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])
  }

  function toggleAll() {
    const pageIds = events.map(e => e.id)
    const allSelected = pageIds.length > 0 && pageIds.every(id => selectedIds.includes(id))
    if (allSelected) {
      setSelectedIds(prev => prev.filter(id => !pageIds.includes(id)))
    } else {
      setSelectedIds(prev => Array.from(new Set([...prev, ...pageIds])))
    }
  }

  function clearSelection() {
    setSelectedIds([])
  }

  async function handleBulkDelete() {
    if (selectedIds.length === 0 || bulkProcessing) return
    const ids = [...selectedIds]
    setBulkProcessing(true)
    try {
      const results = await Promise.allSettled(
        ids.map(id => api.delete(`/admin/events/${id}`))
      )
      const ok = results.filter(r => r.status === 'fulfilled').length
      const fail = results.length - ok
      if (ok > 0) toast.success(`${ok} event berhasil dihapus`)
      if (fail > 0) toast.error(`${fail} event gagal dihapus`)
      clearSelection()
      setBulkConfirmOpen(false)
      await loadEvents()
    } finally {
      setBulkProcessing(false)
    }
  }

  async function handleArchive(event: Event) {
    if (archivingId) return
    if (!confirm('Arsipkan event ini? Event akan tersembunyi dari halaman publik tapi data tetap ada.')) return
    try {
      setArchivingId(event.id)
      await api.put(`/admin/events/${event.id}`, {
        name: event.name,
        slug: event.slug,
        short_name: event.short_name || null,
        description: event.description || null,
        primary_color: event.primary_color,
        secondary_color: event.secondary_color || null,
        logo_url: event.logo_url || null,
        banner_url: event.banner_url || null,
        start_date: event.start_date,
        end_date: event.end_date,
        registration_start: event.registration_start,
        registration_end: event.registration_end,
        venue: event.venue || null,
        city: event.city || null,
        organizer: event.organizer || null,
        contact_phone: event.contact_phone || null,
        contact_email: event.contact_email || null,
        instagram_url: event.instagram_url || null,
        website_url: event.website_url || null,
        announcement: event.announcement || null,
        announcement_active: event.announcement_active ?? false,
        status: 'archived',
        registration_open: event.registration_open ?? false,
        rules_published: event.rules_published ?? false,
        requires_school: event.requires_school ?? false,
        sort_order: event.sort_order ?? 0,
      })
      toast.success('Event berhasil diarsipkan')
      await loadEvents()
    } catch {
      toast.error('Gagal mengarsipkan event')
    } finally {
      setArchivingId(null)
    }
  }

  const pageIds = events.map(e => e.id)
  const allSelected = pageIds.length > 0 && pageIds.every(id => selectedIds.includes(id))
  const someSelected = pageIds.some(id => selectedIds.includes(id)) && !allSelected

  return (
    <AdminLayout>
      <PageHeader
        title="Kelola Event"
        description="Buat dan kelola event turnamen esport"
        actions={
          <Button onClick={openCreateDialog} className="bg-esi-red text-white hover:bg-esi-red/90">
            <Plus size={16} className="mr-1.5" />
            Buat Event
          </Button>
        }
      />

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <Skeleton key={i} className="h-16 w-full rounded-xl" />
          ))}
        </div>
      ) : events.length === 0 ? (
        <EmptyState
          icon={Trophy}
          title="Belum ada event"
          description="Buat event pertama untuk memulai"
        />
      ) : (
        <div className={`rounded-xl border border-esi-border bg-white dark:bg-zinc-900 overflow-hidden ${selectedIds.length > 0 ? 'mb-32 sm:mb-24' : ''}`}>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-10">
                  <input
                    type="checkbox"
                    className="h-4 w-4 accent-esi-red"
                    checked={allSelected}
                    ref={(el) => {
                      if (el) el.indeterminate = someSelected
                    }}
                    onChange={toggleAll}
                    aria-label="Pilih semua event"
                  />
                </TableHead>
                <TableHead>Event</TableHead>
                <TableHead>Slug</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Tanggal Mulai</TableHead>
                <TableHead>Tanggal Selesai</TableHead>
                <TableHead className="text-center">Sekolah</TableHead>
                <TableHead className="text-right">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {events.map(event => {
                const checked = selectedIds.includes(event.id)
                return (
                <TableRow
                  key={event.id}
                  className={checked ? 'bg-red-50/40 dark:bg-red-950/20' : undefined}
                >
                  <TableCell>
                    <input
                      type="checkbox"
                      className="h-4 w-4 accent-esi-red"
                      checked={checked}
                      onChange={() => toggleOne(event.id)}
                      aria-label={`Pilih ${event.name}`}
                    />
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg" style={{ background: event.primary_color + '20' }}>
                        <Trophy size={16} weight="fill" style={{ color: event.primary_color }} />
                      </div>
                      <div>
                        <p className="font-semibold text-esi-text">{event.name}</p>
                        {event.short_name && <p className="text-xs text-esi-muted">{event.short_name}</p>}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <code className="rounded bg-stone-100 dark:bg-zinc-800 px-1.5 py-0.5 text-xs">{event.slug}</code>
                  </TableCell>
                  <TableCell>
                    <Badge variant={STATUS_VARIANT[event.status]}>
                      {STATUS_OPTIONS.find(o => o.value === event.status)?.label || event.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm">{formatDate(event.start_date)}</TableCell>
                  <TableCell className="text-sm">{formatDate(event.end_date)}</TableCell>
                  <TableCell className="text-center">
                    {event.requires_school && <GraduationCap size={16} weight="fill" className="inline text-esi-red" />}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Link href={`/admin/events/${event.id}/point-rules`}>
                        <Button variant="ghost" size="sm" title="Point Rules">
                          <Medal size={16} />
                        </Button>
                      </Link>
                      <Button variant="ghost" size="sm" onClick={() => openEditDialog(event)}>
                        <PencilSimple size={16} />
                      </Button>
                      {event.status === 'completed' && (
                        <Button
                          variant="ghost"
                          size="sm"
                          title="Arsipkan event"
                          disabled={archivingId === event.id}
                          onClick={() => handleArchive(event)}
                        >
                          {archivingId === event.id ? (
                            <Spinner size={16} className="animate-spin" />
                          ) : (
                            <Archive size={16} />
                          )}
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Bulk delete confirmation dialog */}
      <Dialog open={bulkConfirmOpen} onOpenChange={(o) => { if (!o && !bulkProcessing) setBulkConfirmOpen(false) }}>
        <DialogContent className="bg-white dark:bg-zinc-900 border-stone-200 dark:border-zinc-700 text-stone-900 dark:text-zinc-100 sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-red-600">Hapus {selectedIds.length} Event</DialogTitle>
            <DialogDescription className="text-stone-500 dark:text-zinc-400">
              Apakah kamu yakin menghapus <strong className="text-stone-900 dark:text-zinc-100">{selectedIds.length} event</strong>? Semua turnamen, tim terdaftar, dan data match di event ini akan terhapus permanen.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setBulkConfirmOpen(false)}
              disabled={bulkProcessing}
              className="border-stone-300 dark:border-zinc-600 text-stone-600 dark:text-zinc-400"
            >
              Batal
            </Button>
            <Button
              onClick={handleBulkDelete}
              disabled={bulkProcessing}
              className="bg-red-600 hover:bg-red-700 text-white disabled:opacity-40"
            >
              {bulkProcessing ? 'Menghapus...' : 'Hapus Semua'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Sticky bulk action bar */}
      {selectedIds.length > 0 && (
        <div className="fixed bottom-0 left-0 right-0 border-t border-stone-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 shadow-lg p-4 z-50">
          <div className="mx-auto flex max-w-7xl flex-col items-stretch justify-between gap-3 sm:flex-row sm:items-center">
            <p className="text-sm text-stone-700 dark:text-zinc-200">
              <b>{selectedIds.length}</b> event dipilih
            </p>
            <div className="flex flex-col gap-2 sm:flex-row">
              <Button
                variant="outline"
                onClick={clearSelection}
                disabled={bulkProcessing}
              >
                Batal
              </Button>
              <Button
                variant="destructive"
                onClick={() => setBulkConfirmOpen(true)}
                disabled={bulkProcessing}
              >
                <Trash size={14} className="mr-1" /> Hapus Semua
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Create / Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={handleCloseDialog}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingId ? 'Edit Event' : 'Buat Event Baru'}</DialogTitle>
          </DialogHeader>

          <div className="space-y-5 py-2">
            {/* Informasi Dasar */}
            <Section title="Informasi Dasar">
              <div>
                <Label htmlFor="name">Nama Event *</Label>
                <Input id="name" name="name" value={form.name} onChange={handleChange} placeholder="ESI Kota Denpasar 2026" />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="slug">Slug *</Label>
                  <Input id="slug" name="slug" value={form.slug} onChange={handleChange} placeholder="esi-denpasar-2026" />
                </div>
                <div>
                  <Label htmlFor="short_name">Nama Singkat</Label>
                  <Input id="short_name" name="short_name" value={form.short_name} onChange={handleChange} placeholder="ESI 2026" />
                </div>
              </div>

              <div>
                <Label htmlFor="description">Deskripsi</Label>
                <textarea
                  id="description"
                  name="description"
                  value={form.description}
                  onChange={handleChange}
                  rows={3}
                  placeholder="Deskripsi singkat event"
                  className="flex min-h-[80px] w-full rounded-md border border-esi-border bg-white dark:bg-zinc-950 px-3 py-2 text-sm text-esi-text placeholder:text-esi-muted focus:outline-none focus:ring-2 focus:ring-esi-red/40 disabled:cursor-not-allowed disabled:opacity-50"
                />
              </div>
            </Section>

            {/* Tampilan */}
            <Section title="Tampilan">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="primary_color">Warna Utama</Label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      id="primary_color"
                      name="primary_color"
                      value={form.primary_color}
                      onChange={handleChange}
                      className="h-9 w-9 shrink-0 cursor-pointer rounded border border-esi-border"
                    />
                    <Input
                      name="primary_color"
                      value={form.primary_color}
                      onChange={handleChange}
                      className="font-mono text-sm"
                      aria-label="Kode warna utama"
                    />
                  </div>
                </div>
                <div>
                  <Label htmlFor="secondary_color">Warna Sekunder</Label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      id="secondary_color"
                      name="secondary_color"
                      value={form.secondary_color}
                      onChange={handleChange}
                      className="h-9 w-9 shrink-0 cursor-pointer rounded border border-esi-border"
                    />
                    <Input
                      name="secondary_color"
                      value={form.secondary_color}
                      onChange={handleChange}
                      className="font-mono text-sm"
                      aria-label="Kode warna sekunder"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="logo_url">URL Logo</Label>
                  <Input id="logo_url" name="logo_url" type="url" value={form.logo_url} onChange={handleChange} placeholder="https://..." />
                </div>
                <div>
                  <Label htmlFor="banner_url">URL Banner</Label>
                  <Input id="banner_url" name="banner_url" type="url" value={form.banner_url} onChange={handleChange} placeholder="https://..." />
                </div>
              </div>
            </Section>

            {/* Jadwal */}
            <Section title="Jadwal">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="start_date">Tanggal Mulai</Label>
                  <Input id="start_date" name="start_date" type="datetime-local" value={form.start_date} onChange={handleChange} />
                </div>
                <div>
                  <Label htmlFor="end_date">Tanggal Selesai</Label>
                  <Input id="end_date" name="end_date" type="datetime-local" value={form.end_date} onChange={handleChange} />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
            <Section title="Kontak & Sosmed">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="contact_phone">Nomor Telepon</Label>
                  <Input id="contact_phone" name="contact_phone" type="tel" value={form.contact_phone} onChange={handleChange} placeholder="+62 812-3456-7890" />
                </div>
                <div>
                  <Label htmlFor="contact_email">Email</Label>
                  <Input id="contact_email" name="contact_email" type="email" value={form.contact_email} onChange={handleChange} placeholder="info@porjar.id" />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                <Label htmlFor="announcement">Pengumuman</Label>
                <textarea
                  id="announcement"
                  name="announcement"
                  value={form.announcement}
                  onChange={handleChange}
                  rows={4}
                  placeholder="Tulis pengumuman yang akan ditampilkan di halaman event"
                  className="flex min-h-[96px] w-full rounded-md border border-esi-border bg-white dark:bg-zinc-950 px-3 py-2 text-sm text-esi-text placeholder:text-esi-muted focus:outline-none focus:ring-2 focus:ring-esi-red/40 disabled:cursor-not-allowed disabled:opacity-50"
                />
              </div>
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="announcement_active"
                  checked={form.announcement_active}
                  onChange={handleCheck('announcement_active')}
                  className="h-4 w-4 rounded border-stone-300 text-esi-red focus:ring-esi-red"
                />
                <Label htmlFor="announcement_active">Tampilkan pengumuman (aktif)</Label>
              </div>
            </Section>

            {/* Status & Flag */}
            <Section title="Status & Flag">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="status">Status</Label>
                  <Select value={form.status} onValueChange={(val) => { setDirty(true); setForm(prev => ({ ...prev, status: val as EventStatus })) }}>
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
                  <Label htmlFor="sort_order">Urutan (Sort Order)</Label>
                  <Input
                    id="sort_order"
                    name="sort_order"
                    type="number"
                    value={form.sort_order}
                    onChange={(e) => { setDirty(true); setForm(prev => ({ ...prev, sort_order: Number(e.target.value) || 0 })) }}
                    placeholder="0"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    id="registration_open"
                    checked={form.registration_open}
                    onChange={handleCheck('registration_open')}
                    className="h-4 w-4 rounded border-stone-300 text-esi-red focus:ring-esi-red"
                  />
                  <Label htmlFor="registration_open">Pendaftaran dibuka</Label>
                </div>
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    id="rules_published"
                    checked={form.rules_published}
                    onChange={handleCheck('rules_published')}
                    className="h-4 w-4 rounded border-stone-300 text-esi-red focus:ring-esi-red"
                  />
                  <Label htmlFor="rules_published">Peraturan dipublikasikan</Label>
                </div>
                <div className="flex items-center gap-3 md:col-span-2">
                  <input
                    type="checkbox"
                    id="requires_school"
                    checked={form.requires_school}
                    onChange={handleCheck('requires_school')}
                    className="h-4 w-4 rounded border-stone-300 text-esi-red focus:ring-esi-red"
                  />
                  <Label htmlFor="requires_school">Wajib sekolah (tim harus terdaftar di sekolah, tidak boleh duplikat)</Label>
                </div>
              </div>
            </Section>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => handleCloseDialog(false)}>Batal</Button>
            <Button onClick={handleSubmit} disabled={submitting} className="bg-esi-red text-white hover:bg-esi-red/90">
              {submitting && <Spinner size={16} className="mr-1.5 animate-spin" />}
              {editingId ? 'Simpan' : 'Buat Event'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  )
}
