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
import { Trophy, Plus, PencilSimple, Spinner, Medal, GraduationCap } from '@phosphor-icons/react'
import type { Event } from '@/types'

type EventStatus = Event['status']

interface EventFormData {
  name: string
  slug: string
  short_name: string
  primary_color: string
  status: EventStatus
  venue: string
  city: string
  organizer: string
  start_date: string
  end_date: string
  requires_school: boolean
}

const emptyForm: EventFormData = {
  name: '',
  slug: '',
  short_name: '',
  primary_color: '#dc2626',
  status: 'draft',
  venue: '',
  city: 'Denpasar, Bali',
  organizer: 'ESI Kota Denpasar',
  start_date: '',
  end_date: '',
  requires_school: false,
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

export default function AdminEventsPage() {
  const { isAuthenticated, isLoading: authLoading } = useAuthStore()
  const [events, setEvents] = useState<Event[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState<EventFormData>(emptyForm)
  const [submitting, setSubmitting] = useState(false)
  const [slugManual, setSlugManual] = useState(false)

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
    setDialogOpen(true)
  }

  function openEditDialog(event: Event) {
    setEditingId(event.id)
    setForm({
      name: event.name,
      slug: event.slug,
      short_name: event.short_name || '',
      primary_color: event.primary_color || '#dc2626',
      status: event.status,
      venue: event.venue || '',
      city: event.city || '',
      organizer: event.organizer || '',
      start_date: event.start_date || '',
      end_date: event.end_date || '',
      requires_school: event.requires_school ?? false,
    })
    setSlugManual(true)
    setDialogOpen(true)
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const { name, value } = e.target
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
      const payload = {
        ...form,
        venue: form.venue || null,
        city: form.city || null,
        organizer: form.organizer || null,
        start_date: form.start_date || null,
        end_date: form.end_date || null,
        short_name: form.short_name || null,
      }

      if (editingId) {
        await api.put(`/admin/events/${editingId}`, payload)
        toast.success('Event berhasil diperbarui')
      } else {
        await api.post('/admin/events', payload)
        toast.success('Event berhasil dibuat')
      }

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
        <div className="rounded-xl border border-esi-border bg-white dark:bg-zinc-900 overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
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
              {events.map(event => (
                <TableRow key={event.id}>
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
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Create / Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingId ? 'Edit Event' : 'Buat Event Baru'}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div>
              <Label htmlFor="name">Nama Event *</Label>
              <Input id="name" name="name" value={form.name} onChange={handleChange} placeholder="ESI Kota Denpasar 2026" />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="slug">Slug *</Label>
                <Input id="slug" name="slug" value={form.slug} onChange={handleChange} placeholder="esi-denpasar-2026" />
              </div>
              <div>
                <Label htmlFor="short_name">Nama Singkat</Label>
                <Input id="short_name" name="short_name" value={form.short_name} onChange={handleChange} placeholder="ESI 2026" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="status">Status</Label>
                <Select value={form.status} onValueChange={(val) => setForm(prev => ({ ...prev, status: val as EventStatus }))}>
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
                  <Input id="primary_color_text" name="primary_color" value={form.primary_color} onChange={handleChange} className="font-mono text-sm" aria-label="Kode warna utama" />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
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

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="start_date">Tanggal Mulai</Label>
                <Input id="start_date" name="start_date" type="date" value={form.start_date} onChange={handleChange} />
              </div>
              <div>
                <Label htmlFor="end_date">Tanggal Selesai</Label>
                <Input id="end_date" name="end_date" type="date" value={form.end_date} onChange={handleChange} />
              </div>
            </div>

            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                id="requires_school"
                checked={form.requires_school}
                onChange={(e) => setForm(prev => ({ ...prev, requires_school: e.target.checked }))}
                className="h-4 w-4 rounded border-stone-300 text-esi-red focus:ring-esi-red"
              />
              <Label htmlFor="requires_school">Wajib sekolah (tim harus terdaftar di sekolah, tidak boleh duplikat)</Label>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Batal</Button>
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
