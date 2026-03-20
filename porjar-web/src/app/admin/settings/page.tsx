'use client'

import { useEffect, useState, useCallback } from 'react'
import { toast } from 'sonner'
import { api } from '@/lib/api'
import { AdminLayout } from '@/components/layouts/AdminLayout'
import { PageHeader } from '@/components/shared/PageHeader'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { FloppyDisk, Spinner } from '@phosphor-icons/react'

interface EventSettings {
  id: string
  event_name: string
  event_description: string
  event_logo_url: string | null
  event_banner_url: string | null
  venue: string
  city: string
  start_date: string | null
  end_date: string | null
  organizer: string
  contact_phone: string | null
  contact_email: string | null
  instagram_url: string | null
  announcement: string | null
  announcement_active: boolean
  registration_open: boolean
  rules_published: boolean
  updated_at: string
}

export default function AdminSettingsPage() {
  const [settings, setSettings] = useState<EventSettings | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  // Form state
  const [form, setForm] = useState({
    event_name: '',
    event_description: '',
    event_logo_url: '',
    event_banner_url: '',
    venue: '',
    city: '',
    start_date: '',
    end_date: '',
    organizer: '',
    contact_phone: '',
    contact_email: '',
    instagram_url: '',
    announcement: '',
    announcement_active: false,
    registration_open: true,
    rules_published: true,
  })

  const fetchSettings = useCallback(async () => {
    try {
      setLoading(true)
      const data = await api.get<EventSettings>('/event-settings')
      setSettings(data)
      setForm({
        event_name: data.event_name || '',
        event_description: data.event_description || '',
        event_logo_url: data.event_logo_url || '',
        event_banner_url: data.event_banner_url || '',
        venue: data.venue || '',
        city: data.city || '',
        start_date: data.start_date || '',
        end_date: data.end_date || '',
        organizer: data.organizer || '',
        contact_phone: data.contact_phone || '',
        contact_email: data.contact_email || '',
        instagram_url: data.instagram_url || '',
        announcement: data.announcement || '',
        announcement_active: data.announcement_active,
        registration_open: data.registration_open,
        rules_published: data.rules_published,
      })
    } catch {
      toast.error('Gagal memuat pengaturan event')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchSettings()
  }, [fetchSettings])

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) {
    const { name, value } = e.target
    setForm((prev) => ({ ...prev, [name]: value }))
  }

  function handleToggle(field: 'announcement_active' | 'registration_open' | 'rules_published') {
    setForm((prev) => ({ ...prev, [field]: !prev[field] }))
  }

  async function handleSave() {
    if (!form.event_name.trim()) {
      toast.error('Nama event wajib diisi')
      return
    }

    try {
      setSaving(true)
      const payload = {
        ...form,
        event_logo_url: form.event_logo_url || null,
        event_banner_url: form.event_banner_url || null,
        start_date: form.start_date || null,
        end_date: form.end_date || null,
        contact_phone: form.contact_phone || null,
        contact_email: form.contact_email || null,
        instagram_url: form.instagram_url || null,
        announcement: form.announcement || null,
      }
      const data = await api.put<EventSettings>('/admin/event-settings', payload)
      setSettings(data)
      toast.success('Pengaturan event berhasil disimpan')
    } catch {
      toast.error('Gagal menyimpan pengaturan')
    } finally {
      setSaving(false)
    }
  }

  return (
    <AdminLayout>
      <PageHeader
        title="Pengaturan Event"
        description="Kelola informasi event, kontak, dan fitur toggle"
      />

      {loading ? (
        <div className="space-y-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-32 animate-pulse rounded-xl bg-stone-100" />
          ))}
        </div>
      ) : (
        <div className="space-y-6">
          {/* Event Info */}
          <section className="rounded-xl border border-porjar-border bg-white p-6">
            <h2 className="mb-4 text-base font-semibold text-porjar-text">Informasi Event</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label className="mb-1 block text-sm font-medium text-porjar-muted">Nama Event</label>
                <Input name="event_name" value={form.event_name} onChange={handleChange} placeholder="PORJAR Denpasar Esport 2026" />
              </div>
              <div className="sm:col-span-2">
                <label className="mb-1 block text-sm font-medium text-porjar-muted">Deskripsi</label>
                <Textarea name="event_description" value={form.event_description} onChange={handleChange} placeholder="Pekan Olahraga Pelajar..." rows={3} />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-porjar-muted">Venue</label>
                <Input name="venue" value={form.venue} onChange={handleChange} placeholder="Graha Yowana Suci" />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-porjar-muted">Kota</label>
                <Input name="city" value={form.city} onChange={handleChange} placeholder="Denpasar, Bali" />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-porjar-muted">Tanggal Mulai</label>
                <Input name="start_date" type="date" value={form.start_date} onChange={handleChange} />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-porjar-muted">Tanggal Selesai</label>
                <Input name="end_date" type="date" value={form.end_date} onChange={handleChange} />
              </div>
            </div>
          </section>

          {/* Organizer & Contact */}
          <section className="rounded-xl border border-porjar-border bg-white p-6">
            <h2 className="mb-4 text-base font-semibold text-porjar-text">Penyelenggara & Kontak</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm font-medium text-porjar-muted">Penyelenggara</label>
                <Input name="organizer" value={form.organizer} onChange={handleChange} placeholder="ESI Kota Denpasar" />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-porjar-muted">Telepon</label>
                <Input name="contact_phone" value={form.contact_phone} onChange={handleChange} placeholder="+62..." />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-porjar-muted">Email</label>
                <Input name="contact_email" type="email" value={form.contact_email} onChange={handleChange} placeholder="info@example.com" />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-porjar-muted">Instagram URL</label>
                <Input name="instagram_url" value={form.instagram_url} onChange={handleChange} placeholder="https://instagram.com/..." />
              </div>
            </div>
          </section>

          {/* Branding */}
          <section className="rounded-xl border border-porjar-border bg-white p-6">
            <h2 className="mb-4 text-base font-semibold text-porjar-text">Logo & Banner</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm font-medium text-porjar-muted">Logo URL</label>
                <Input name="event_logo_url" value={form.event_logo_url} onChange={handleChange} placeholder="https://..." />
                {form.event_logo_url && (
                  <img src={form.event_logo_url} alt="Logo preview" className="mt-2 h-16 w-16 rounded-lg border border-porjar-border object-contain" />
                )}
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-porjar-muted">Banner URL</label>
                <Input name="event_banner_url" value={form.event_banner_url} onChange={handleChange} placeholder="https://..." />
                {form.event_banner_url && (
                  <img src={form.event_banner_url} alt="Banner preview" className="mt-2 h-16 w-full max-w-xs rounded-lg border border-porjar-border object-cover" />
                )}
              </div>
            </div>
          </section>

          {/* Announcement */}
          <section className="rounded-xl border border-porjar-border bg-white p-6">
            <h2 className="mb-4 text-base font-semibold text-porjar-text">Pengumuman</h2>
            <div className="space-y-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-porjar-muted">Teks Pengumuman</label>
                <Textarea name="announcement" value={form.announcement} onChange={handleChange} placeholder="Tulis pengumuman untuk ditampilkan di halaman utama..." rows={3} />
              </div>
              <ToggleRow
                label="Pengumuman Aktif"
                description="Tampilkan pengumuman di halaman utama"
                checked={form.announcement_active}
                onToggle={() => handleToggle('announcement_active')}
              />
            </div>
          </section>

          {/* Feature Toggles */}
          <section className="rounded-xl border border-porjar-border bg-white p-6">
            <h2 className="mb-4 text-base font-semibold text-porjar-text">Fitur</h2>
            <div className="space-y-4">
              <ToggleRow
                label="Pendaftaran Dibuka"
                description="Izinkan tim baru mendaftar ke turnamen"
                checked={form.registration_open}
                onToggle={() => handleToggle('registration_open')}
              />
              <ToggleRow
                label="Aturan Dipublikasikan"
                description="Tampilkan halaman aturan di situs publik"
                checked={form.rules_published}
                onToggle={() => handleToggle('rules_published')}
              />
            </div>
          </section>

          {/* Save */}
          <div className="flex justify-end">
            <Button
              onClick={handleSave}
              disabled={saving}
              className="bg-porjar-red text-white hover:bg-porjar-red/90"
            >
              {saving ? (
                <Spinner size={18} className="mr-2 animate-spin" />
              ) : (
                <FloppyDisk size={18} className="mr-2" />
              )}
              {saving ? 'Menyimpan...' : 'Simpan Pengaturan'}
            </Button>
          </div>

          {settings?.updated_at && (
            <p className="text-right text-xs text-porjar-muted">
              Terakhir diperbarui: {new Date(settings.updated_at).toLocaleString('id-ID')}
            </p>
          )}
        </div>
      )}
    </AdminLayout>
  )
}

/* ── Toggle row component ── */
function ToggleRow({
  label,
  description,
  checked,
  onToggle,
}: {
  label: string
  description: string
  checked: boolean
  onToggle: () => void
}) {
  return (
    <div className="flex items-center justify-between rounded-lg border border-porjar-border px-4 py-3">
      <div>
        <p className="text-sm font-medium text-porjar-text">{label}</p>
        <p className="text-xs text-porjar-muted">{description}</p>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={onToggle}
        className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-porjar-red focus-visible:ring-offset-2 ${
          checked ? 'bg-porjar-red' : 'bg-stone-200'
        }`}
      >
        <span
          className={`pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow-lg ring-0 transition-transform duration-200 ease-in-out ${
            checked ? 'translate-x-5' : 'translate-x-0'
          }`}
        />
      </button>
    </div>
  )
}
