'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { useParams } from 'next/navigation'
import { toast } from 'sonner'
import { api, resolveMediaUrl } from '@/lib/api'
import { useAuthStore } from '@/store/auth-store'
import { PageHeader } from '@/components/shared/PageHeader'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Skeleton } from '@/components/ui/skeleton'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Image,
  Info,
  Calendar,
  GameController,
  Medal,
  Handshake,
  Images,
  Books,
  MonitorPlay,
  ClipboardText,
  Plus,
  Trash,
  DotsSixVertical,
  FloppyDisk,
  Spinner,
  UploadSimple,
  X,
} from '@phosphor-icons/react'
import type { Event } from '@/types'

// ── Types ────────────────────────────────────────────────────────────────────

type SectionType =
  | 'hero'
  | 'about'
  | 'schedule'
  | 'games'
  | 'prizes'
  | 'sponsors'
  | 'gallery'
  | 'rules'
  | 'stream'
  | 'registration'

interface PrizeRow {
  rank: string
  amount: string
  description?: string
}

interface SponsorRow {
  name: string
  logo_url: string
  website_url?: string
  tier?: string
}

interface SectionConfig {
  // hero
  headline?: string
  subheadline?: string
  bg_image_url?: string
  bg_color?: string
  cta_text?: string
  cta_url?: string
  // about
  title?: string
  description?: string
  image_url?: string
  // schedule
  show_registration_dates?: boolean
  // stream
  stream_url?: string
  // prizes
  prizes?: PrizeRow[]
  // sponsors
  sponsors?: SponsorRow[]
}

interface EventSection {
  id: string
  event_id: string
  section_type: SectionType
  label: string
  enabled: boolean
  sort_order: number
  config: SectionConfig
}

// ── Constants ─────────────────────────────────────────────────────────────────

const SECTION_META: Record<SectionType, { label: string; Icon: React.ElementType }> = {
  hero:         { label: 'Hero / Banner',     Icon: Image },
  about:        { label: 'Tentang Event',     Icon: Info },
  schedule:     { label: 'Jadwal',            Icon: Calendar },
  games:        { label: 'Cabang Olahraga',   Icon: GameController },
  prizes:       { label: 'Hadiah',            Icon: Medal },
  sponsors:     { label: 'Sponsor',           Icon: Handshake },
  gallery:      { label: 'Galeri',            Icon: Images },
  rules:        { label: 'Peraturan',         Icon: Books },
  stream:       { label: 'Live Stream',       Icon: MonitorPlay },
  registration: { label: 'Pendaftaran',       Icon: ClipboardText },
}

const ALL_TYPES = Object.keys(SECTION_META) as SectionType[]

// ── Inline Toggle ─────────────────────────────────────────────────────────────

function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 ${
        checked
          ? 'bg-esi-red focus-visible:ring-esi-red'
          : 'bg-stone-300 dark:bg-zinc-600'
      }`}
    >
      <span
        className={`pointer-events-none block h-4 w-4 rounded-full bg-white shadow-lg ring-0 transition-transform ${
          checked ? 'translate-x-4' : 'translate-x-0'
        }`}
      />
    </button>
  )
}

// ── Image Upload Field ────────────────────────────────────────────────────────

function ImageField({
  label,
  value,
  onChange,
}: {
  label: string
  value: string
  onChange: (url: string) => void
}) {
  const [uploading, setUploading] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  async function handleFile(file: File) {
    if (!file.type.startsWith('image/')) {
      toast.error('File harus berupa gambar')
      return
    }
    setUploading(true)
    try {
      const res = await api.upload<{ url: string }>('/upload', file)
      if (res?.url) {
        onChange(res.url)
        toast.success('Gambar berhasil diupload')
      }
    } catch {
      toast.error('Gagal mengupload gambar')
    } finally {
      setUploading(false)
    }
  }

  const resolved = resolveMediaUrl(value)

  return (
    <div>
      <label className="text-xs font-medium text-stone-600 dark:text-zinc-400 mb-1 block">
        {label}
      </label>
      <div className="flex gap-2 items-start">
        <Input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="https://..."
          className="flex-1 text-sm"
        />
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={uploading}
          onClick={() => inputRef.current?.click()}
          className="shrink-0"
        >
          {uploading ? (
            <Spinner size={14} className="animate-spin" />
          ) : (
            <UploadSimple size={14} />
          )}
        </Button>
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0]
            if (file) handleFile(file)
            e.target.value = ''
          }}
        />
      </div>
      {resolved && (
        <div className="mt-2 relative inline-block">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={resolved}
            alt="preview"
            className="h-16 w-auto rounded border border-stone-200 dark:border-zinc-700 object-cover"
          />
          <button
            type="button"
            onClick={() => onChange('')}
            className="absolute -top-1.5 -right-1.5 rounded-full bg-red-500 text-white p-0.5 hover:bg-red-600"
          >
            <X size={10} />
          </button>
        </div>
      )}
    </div>
  )
}

// ── Config Forms ──────────────────────────────────────────────────────────────

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <label className="text-xs font-medium text-stone-600 dark:text-zinc-400 mb-1 block">
      {children}
    </label>
  )
}

function ConfigField({
  label,
  children,
}: {
  label: string
  children: React.ReactNode
}) {
  return (
    <div>
      <FieldLabel>{label}</FieldLabel>
      {children}
    </div>
  )
}

function HeroForm({
  config,
  onChange,
}: {
  config: SectionConfig
  onChange: (c: SectionConfig) => void
}) {
  const set = (key: keyof SectionConfig, value: unknown) =>
    onChange({ ...config, [key]: value })

  return (
    <div className="space-y-4">
      <ConfigField label="Headline">
        <Input
          value={config.headline ?? ''}
          onChange={(e) => set('headline', e.target.value)}
          placeholder="Judul besar hero section"
        />
      </ConfigField>
      <ConfigField label="Sub-headline">
        <Input
          value={config.subheadline ?? ''}
          onChange={(e) => set('subheadline', e.target.value)}
          placeholder="Teks sub-judul"
        />
      </ConfigField>
      <ImageField
        label="Background Image URL"
        value={config.bg_image_url ?? ''}
        onChange={(url) => set('bg_image_url', url)}
      />
      <ConfigField label="Background Color">
        <div className="flex gap-2 items-center">
          <input
            type="color"
            value={config.bg_color ?? '#000000'}
            onChange={(e) => set('bg_color', e.target.value)}
            className="h-9 w-14 rounded border border-stone-300 dark:border-zinc-600 cursor-pointer"
          />
          <Input
            value={config.bg_color ?? ''}
            onChange={(e) => set('bg_color', e.target.value)}
            placeholder="#000000"
            className="flex-1"
          />
        </div>
      </ConfigField>
      <ConfigField label="CTA Button Text">
        <Input
          value={config.cta_text ?? ''}
          onChange={(e) => set('cta_text', e.target.value)}
          placeholder="Daftar Sekarang"
        />
      </ConfigField>
      <ConfigField label="CTA Button URL">
        <Input
          value={config.cta_url ?? ''}
          onChange={(e) => set('cta_url', e.target.value)}
          placeholder="https://..."
        />
      </ConfigField>
    </div>
  )
}

function AboutForm({
  config,
  onChange,
}: {
  config: SectionConfig
  onChange: (c: SectionConfig) => void
}) {
  const set = (key: keyof SectionConfig, value: unknown) =>
    onChange({ ...config, [key]: value })

  return (
    <div className="space-y-4">
      <ConfigField label="Judul Section">
        <Input
          value={config.title ?? ''}
          onChange={(e) => set('title', e.target.value)}
          placeholder="Tentang Event"
        />
      </ConfigField>
      <ConfigField label="Deskripsi">
        <Textarea
          value={config.description ?? ''}
          onChange={(e) => set('description', e.target.value)}
          placeholder="Deskripsi lengkap event..."
          rows={5}
        />
      </ConfigField>
      <ImageField
        label="Gambar Ilustrasi URL"
        value={config.image_url ?? ''}
        onChange={(url) => set('image_url', url)}
      />
    </div>
  )
}

function ScheduleForm({
  config,
  onChange,
}: {
  config: SectionConfig
  onChange: (c: SectionConfig) => void
}) {
  const set = (key: keyof SectionConfig, value: unknown) =>
    onChange({ ...config, [key]: value })

  return (
    <div className="space-y-4">
      <ConfigField label="Judul Section">
        <Input
          value={config.title ?? ''}
          onChange={(e) => set('title', e.target.value)}
          placeholder="Jadwal Kegiatan"
        />
      </ConfigField>
      <div className="flex items-center justify-between rounded-lg border border-stone-200 dark:border-zinc-700 p-3">
        <div>
          <p className="text-sm font-medium text-stone-700 dark:text-zinc-300">
            Tampilkan Tanggal Registrasi
          </p>
          <p className="text-xs text-stone-500 dark:text-zinc-400">
            Tampilkan periode buka/tutup pendaftaran
          </p>
        </div>
        <Toggle
          checked={config.show_registration_dates ?? true}
          onChange={(v) => set('show_registration_dates', v)}
        />
      </div>
    </div>
  )
}

function TitleOnlyForm({
  config,
  onChange,
  placeholder,
}: {
  config: SectionConfig
  onChange: (c: SectionConfig) => void
  placeholder: string
}) {
  return (
    <div>
      <FieldLabel>Judul Section</FieldLabel>
      <Input
        value={config.title ?? ''}
        onChange={(e) => onChange({ ...config, title: e.target.value })}
        placeholder={placeholder}
      />
    </div>
  )
}

function PrizesForm({
  config,
  onChange,
}: {
  config: SectionConfig
  onChange: (c: SectionConfig) => void
}) {
  const prizes = config.prizes ?? []

  function addRow() {
    onChange({ ...config, prizes: [...prizes, { rank: '', amount: '', description: '' }] })
  }

  function removeRow(idx: number) {
    onChange({ ...config, prizes: prizes.filter((_, i) => i !== idx) })
  }

  function updateRow(idx: number, field: keyof PrizeRow, value: string) {
    onChange({
      ...config,
      prizes: prizes.map((p, i) => (i === idx ? { ...p, [field]: value } : p)),
    })
  }

  return (
    <div className="space-y-4">
      <ConfigField label="Judul Section">
        <Input
          value={config.title ?? ''}
          onChange={(e) => onChange({ ...config, title: e.target.value })}
          placeholder="Total Hadiah"
        />
      </ConfigField>

      <div>
        <div className="flex items-center justify-between mb-2">
          <FieldLabel>Daftar Hadiah</FieldLabel>
          <Button type="button" variant="outline" size="sm" onClick={addRow}>
            <Plus size={12} className="mr-1" /> Tambah
          </Button>
        </div>
        <div className="space-y-2">
          {prizes.length === 0 && (
            <p className="text-xs text-stone-400 dark:text-zinc-500 italic">
              Belum ada hadiah. Klik Tambah.
            </p>
          )}
          {prizes.map((prize, idx) => (
            <div
              key={idx}
              className="grid grid-cols-[1fr_1fr_2fr_auto] gap-2 items-start rounded-lg border border-stone-200 dark:border-zinc-700 p-2"
            >
              <div>
                <FieldLabel>Juara</FieldLabel>
                <Input
                  value={prize.rank}
                  onChange={(e) => updateRow(idx, 'rank', e.target.value)}
                  placeholder="1st"
                  className="text-sm"
                />
              </div>
              <div>
                <FieldLabel>Hadiah</FieldLabel>
                <Input
                  value={prize.amount}
                  onChange={(e) => updateRow(idx, 'amount', e.target.value)}
                  placeholder="Rp 5.000.000"
                  className="text-sm"
                />
              </div>
              <div>
                <FieldLabel>Keterangan</FieldLabel>
                <Input
                  value={prize.description ?? ''}
                  onChange={(e) => updateRow(idx, 'description', e.target.value)}
                  placeholder="+ Trophy & Sertifikat"
                  className="text-sm"
                />
              </div>
              <div className="pt-5">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => removeRow(idx)}
                  className="text-red-500 hover:text-red-700 h-8 w-8 p-0"
                >
                  <Trash size={14} />
                </Button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function SponsorsForm({
  config,
  onChange,
}: {
  config: SectionConfig
  onChange: (c: SectionConfig) => void
}) {
  const sponsors = config.sponsors ?? []

  function addRow() {
    onChange({
      ...config,
      sponsors: [...sponsors, { name: '', logo_url: '', website_url: '', tier: '' }],
    })
  }

  function removeRow(idx: number) {
    onChange({ ...config, sponsors: sponsors.filter((_, i) => i !== idx) })
  }

  function updateRow(idx: number, field: keyof SponsorRow, value: string) {
    onChange({
      ...config,
      sponsors: sponsors.map((s, i) => (i === idx ? { ...s, [field]: value } : s)),
    })
  }

  return (
    <div className="space-y-4">
      <ConfigField label="Judul Section">
        <Input
          value={config.title ?? ''}
          onChange={(e) => onChange({ ...config, title: e.target.value })}
          placeholder="Sponsor & Partner"
        />
      </ConfigField>

      <div>
        <div className="flex items-center justify-between mb-2">
          <FieldLabel>Daftar Sponsor</FieldLabel>
          <Button type="button" variant="outline" size="sm" onClick={addRow}>
            <Plus size={12} className="mr-1" /> Tambah
          </Button>
        </div>
        <div className="space-y-3">
          {sponsors.length === 0 && (
            <p className="text-xs text-stone-400 dark:text-zinc-500 italic">
              Belum ada sponsor. Klik Tambah.
            </p>
          )}
          {sponsors.map((sponsor, idx) => (
            <div
              key={idx}
              className="rounded-lg border border-stone-200 dark:border-zinc-700 p-3 space-y-2"
            >
              <div className="flex justify-between items-center">
                <span className="text-xs font-semibold text-stone-500 dark:text-zinc-400">
                  Sponsor #{idx + 1}
                </span>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => removeRow(idx)}
                  className="text-red-500 hover:text-red-700 h-7 w-7 p-0"
                >
                  <Trash size={12} />
                </Button>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <FieldLabel>Nama</FieldLabel>
                  <Input
                    value={sponsor.name}
                    onChange={(e) => updateRow(idx, 'name', e.target.value)}
                    placeholder="Nama Sponsor"
                    className="text-sm"
                  />
                </div>
                <div>
                  <FieldLabel>Tier</FieldLabel>
                  <Input
                    value={sponsor.tier ?? ''}
                    onChange={(e) => updateRow(idx, 'tier', e.target.value)}
                    placeholder="Gold / Silver / Bronze"
                    className="text-sm"
                  />
                </div>
              </div>
              <ImageField
                label="Logo URL"
                value={sponsor.logo_url}
                onChange={(url) => updateRow(idx, 'logo_url', url)}
              />
              <div>
                <FieldLabel>Website URL</FieldLabel>
                <Input
                  value={sponsor.website_url ?? ''}
                  onChange={(e) => updateRow(idx, 'website_url', e.target.value)}
                  placeholder="https://..."
                  className="text-sm"
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function StreamForm({
  config,
  onChange,
}: {
  config: SectionConfig
  onChange: (c: SectionConfig) => void
}) {
  const set = (key: keyof SectionConfig, value: unknown) =>
    onChange({ ...config, [key]: value })

  return (
    <div className="space-y-4">
      <ConfigField label="Judul Section">
        <Input
          value={config.title ?? ''}
          onChange={(e) => set('title', e.target.value)}
          placeholder="Live Stream"
        />
      </ConfigField>
      <ConfigField label="Stream URL (YouTube / Twitch embed)">
        <Input
          value={config.stream_url ?? ''}
          onChange={(e) => set('stream_url', e.target.value)}
          placeholder="https://www.youtube.com/embed/..."
        />
      </ConfigField>
    </div>
  )
}

function RegistrationForm({
  config,
  onChange,
}: {
  config: SectionConfig
  onChange: (c: SectionConfig) => void
}) {
  const set = (key: keyof SectionConfig, value: unknown) =>
    onChange({ ...config, [key]: value })

  return (
    <div className="space-y-4">
      <ConfigField label="Judul Section">
        <Input
          value={config.title ?? ''}
          onChange={(e) => set('title', e.target.value)}
          placeholder="Cara Mendaftar"
        />
      </ConfigField>
      <ConfigField label="Deskripsi">
        <Textarea
          value={config.description ?? ''}
          onChange={(e) => set('description', e.target.value)}
          placeholder="Instruksi pendaftaran..."
          rows={4}
        />
      </ConfigField>
    </div>
  )
}

function SectionConfigForm({
  section,
  onChange,
}: {
  section: EventSection
  onChange: (config: SectionConfig) => void
}) {
  const { section_type, config } = section

  switch (section_type) {
    case 'hero':
      return <HeroForm config={config} onChange={onChange} />
    case 'about':
      return <AboutForm config={config} onChange={onChange} />
    case 'schedule':
      return <ScheduleForm config={config} onChange={onChange} />
    case 'games':
      return (
        <TitleOnlyForm
          config={config}
          onChange={onChange}
          placeholder="Cabang Olahraga yang Dipertandingkan"
        />
      )
    case 'prizes':
      return <PrizesForm config={config} onChange={onChange} />
    case 'sponsors':
      return <SponsorsForm config={config} onChange={onChange} />
    case 'gallery':
      return (
        <TitleOnlyForm config={config} onChange={onChange} placeholder="Galeri Foto & Video" />
      )
    case 'rules':
      return (
        <TitleOnlyForm config={config} onChange={onChange} placeholder="Peraturan Pertandingan" />
      )
    case 'stream':
      return <StreamForm config={config} onChange={onChange} />
    case 'registration':
      return <RegistrationForm config={config} onChange={onChange} />
    default:
      return (
        <p className="text-sm text-stone-400 dark:text-zinc-500 italic">
          Tidak ada konfigurasi untuk section ini.
        </p>
      )
  }
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function EventSectionsPage() {
  const params = useParams<{ id: string }>()
  const { isAuthenticated, isLoading: authLoading } = useAuthStore()

  const [event, setEvent] = useState<Event | null>(null)
  const [sections, setSections] = useState<EventSection[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [savingId, setSavingId] = useState<string | null>(null)
  const [savingAll, setSavingAll] = useState(false)
  const [deleting, setDeleting] = useState<string | null>(null)

  // Drag state
  const dragIndexRef = useRef<number | null>(null)
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null)

  const loadData = useCallback(async () => {
    if (!isAuthenticated || authLoading) return
    try {
      const [eventData, sectionsData] = await Promise.all([
        api.get<Event>(`/admin/events/${params.id}`),
        api.get<EventSection[]>(`/admin/events/${params.id}/sections`),
      ])
      setEvent(eventData ?? null)
      const sorted = (sectionsData ?? []).sort((a, b) => a.sort_order - b.sort_order)
      setSections(sorted)
      if (sorted.length > 0 && !selectedId) {
        setSelectedId(sorted[0].id)
      }
    } catch {
      toast.error('Gagal memuat sections')
    } finally {
      setLoading(false)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.id, isAuthenticated, authLoading])

  useEffect(() => {
    loadData()
  }, [loadData])

  const selectedSection = sections.find((s) => s.id === selectedId) ?? null

  // ── Toggle enabled (auto-save) ────────────────────────────────────────────

  async function handleToggleEnabled(sectionId: string, enabled: boolean) {
    // capture section BEFORE optimistic update (setState is async)
    const section = sections.find((s) => s.id === sectionId)
    if (!section) return
    setSections((prev) =>
      prev.map((s) => (s.id === sectionId ? { ...s, enabled } : s))
    )
    try {
      await api.put(`/admin/events/${params.id}/sections/${sectionId}`, {
        section_type: section.section_type,
        sort_order: section.sort_order,
        enabled,
        config: section.config,
      })
      toast.success(enabled ? 'Section diaktifkan' : 'Section dinonaktifkan')
    } catch {
      // revert
      setSections((prev) =>
        prev.map((s) => (s.id === sectionId ? { ...s, enabled: !enabled } : s))
      )
      toast.error('Gagal mengubah status section')
    }
  }

  // ── Config change (local only) ────────────────────────────────────────────

  function handleConfigChange(sectionId: string, config: SectionConfig) {
    setSections((prev) =>
      prev.map((s) => (s.id === sectionId ? { ...s, config } : s))
    )
  }

  // ── Save single section config ────────────────────────────────────────────

  async function handleSaveSection(sectionId: string) {
    const section = sections.find((s) => s.id === sectionId)
    if (!section) return
    setSavingId(sectionId)
    try {
      await api.put(`/admin/events/${params.id}/sections/${sectionId}`, {
        section_type: section.section_type,
        sort_order: section.sort_order,
        enabled: section.enabled,
        config: section.config,
      })
      toast.success(`${SECTION_META[section.section_type]?.label ?? 'Section'} berhasil disimpan`)
    } catch {
      toast.error('Gagal menyimpan section')
    } finally {
      setSavingId(null)
    }
  }

  // ── Save all sections ─────────────────────────────────────────────────────

  async function handleSaveAll() {
    setSavingAll(true)
    try {
      await Promise.all(
        sections.map((s) =>
          api.put(`/admin/events/${params.id}/sections/${s.id}`, {
            config: s.config,
            label: s.label,
            enabled: s.enabled,
          })
        )
      )
      toast.success('Semua section berhasil disimpan')
    } catch {
      toast.error('Gagal menyimpan beberapa section')
    } finally {
      setSavingAll(false)
    }
  }

  // ── Add section ───────────────────────────────────────────────────────────

  async function handleAddSection(type: SectionType) {
    try {
      const maxOrder = sections.reduce((m, s) => Math.max(m, s.sort_order), 0)
      const newSection = await api.post<EventSection>(
        `/admin/events/${params.id}/sections`,
        {
          section_type: type,
          label: SECTION_META[type].label,
          enabled: true,
          sort_order: maxOrder + 1,
          config: {},
        }
      )
      setSections((prev) => [...prev, newSection])
      setSelectedId(newSection.id)
      toast.success(`Section "${SECTION_META[type].label}" ditambahkan`)
    } catch {
      toast.error('Gagal menambahkan section')
    }
  }

  // ── Delete section ────────────────────────────────────────────────────────

  async function handleDelete(sectionId: string) {
    setDeleting(sectionId)
    try {
      await api.delete(`/admin/events/${params.id}/sections/${sectionId}`)
      setSections((prev) => prev.filter((s) => s.id !== sectionId))
      if (selectedId === sectionId) {
        const remaining = sections.filter((s) => s.id !== sectionId)
        setSelectedId(remaining[0]?.id ?? null)
      }
      toast.success('Section dihapus')
    } catch {
      toast.error('Gagal menghapus section')
    } finally {
      setDeleting(null)
    }
  }

  // ── Drag to reorder ───────────────────────────────────────────────────────

  function handleDragStart(e: React.DragEvent, index: number) {
    dragIndexRef.current = index
    e.dataTransfer.effectAllowed = 'move'
  }

  function handleDragOver(e: React.DragEvent, index: number) {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    setDragOverIndex(index)
  }

  function handleDragLeave() {
    setDragOverIndex(null)
  }

  async function handleDrop(e: React.DragEvent, dropIndex: number) {
    e.preventDefault()
    setDragOverIndex(null)
    const dragIndex = dragIndexRef.current
    if (dragIndex === null || dragIndex === dropIndex) return
    dragIndexRef.current = null

    const reordered = [...sections]
    const [moved] = reordered.splice(dragIndex, 1)
    reordered.splice(dropIndex, 0, moved)
    const updated = reordered.map((s, i) => ({ ...s, sort_order: i + 1 }))
    setSections(updated)

    try {
      await api.put(`/admin/events/${params.id}/sections/reorder`, {
        ordered_ids: updated.map((s) => s.id),
      })
    } catch {
      toast.error('Gagal menyimpan urutan section')
      loadData()
    }
  }

  function handleDragEnd() {
    dragIndexRef.current = null
    setDragOverIndex(null)
  }

  // ── Used types (to prevent duplicates) ───────────────────────────────────

  const usedTypes = new Set(sections.map((s) => s.section_type))
  const availableTypes = ALL_TYPES.filter((t) => !usedTypes.has(t))

  // ── Render ────────────────────────────────────────────────────────────────

  if (authLoading || loading) {
    return (
      <>
        <div className="space-y-4">
          <Skeleton className="h-10 w-64 bg-stone-100 dark:bg-zinc-800" />
          <Skeleton className="h-96 w-full bg-stone-100 dark:bg-zinc-800" />
        </div>
      </>
    )
  }

  return (
    <>
      <PageHeader
        title="Landing Page Sections"
        description={event ? `Konfigurasi halaman publik untuk ${event.name}` : 'Konfigurasi sections halaman publik event'}
        breadcrumbs={[
          { label: 'Events', href: '/admin/events' },
          { label: event?.name ?? '...', href: `/admin/events/${params.id}` },
          { label: 'Sections' },
        ]}
        actions={
          <div className="flex gap-2">
            {/* Add Section */}
            <DropdownMenu>
              <DropdownMenuTrigger
                render={
                  <Button variant="outline" disabled={availableTypes.length === 0}>
                    <Plus size={14} className="mr-1.5" /> Tambah Section
                  </Button>
                }
              />
              <DropdownMenuContent align="end" className="w-52">
                {availableTypes.map((type) => {
                  const { label, Icon } = SECTION_META[type]
                  return (
                    <DropdownMenuItem
                      key={type}
                      onClick={() => handleAddSection(type)}
                      className="gap-2"
                    >
                      <Icon size={15} className="text-stone-500" />
                      {label}
                    </DropdownMenuItem>
                  )
                })}
                {availableTypes.length === 0 && (
                  <DropdownMenuItem disabled>Semua section sudah ditambahkan</DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Save All */}
            <Button onClick={handleSaveAll} disabled={savingAll || sections.length === 0}>
              {savingAll ? (
                <Spinner size={14} className="mr-1.5 animate-spin" />
              ) : (
                <FloppyDisk size={14} className="mr-1.5" />
              )}
              Simpan Semua
            </Button>
          </div>
        }
      />

      {sections.length === 0 ? (
        <div className="rounded-xl border border-dashed border-stone-300 dark:border-zinc-700 p-12 text-center">
          <p className="text-stone-400 dark:text-zinc-500 mb-4">
            Belum ada section. Tambahkan section untuk mengkonfigurasi halaman publik event.
          </p>
          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <Button>
                  <Plus size={14} className="mr-1.5" /> Tambah Section Pertama
                </Button>
              }
            />
            <DropdownMenuContent className="w-52">
              {ALL_TYPES.map((type) => {
                const { label, Icon } = SECTION_META[type]
                return (
                  <DropdownMenuItem
                    key={type}
                    onClick={() => handleAddSection(type)}
                    className="gap-2"
                  >
                    <Icon size={15} className="text-stone-500" />
                    {label}
                  </DropdownMenuItem>
                )
              })}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      ) : (
        <div className="flex flex-col sm:flex-row gap-4 items-start">
          {/* ── Left Panel: Section List ── */}
          <div className="w-full sm:w-1/3 sm:shrink-0 rounded-xl border border-stone-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 shadow-sm overflow-hidden">
            <div className="px-4 py-3 border-b border-stone-100 dark:border-zinc-800 bg-stone-50 dark:bg-zinc-800/50">
              <p className="text-xs font-semibold text-stone-500 dark:text-zinc-400 uppercase tracking-wide">
                Sections ({sections.length})
              </p>
            </div>
            <ul className="divide-y divide-stone-100 dark:divide-zinc-800">
              {sections.map((section, index) => {
                const meta = SECTION_META[section.section_type]
                const Icon = meta?.Icon ?? Info
                const isSelected = section.id === selectedId
                const isDragOver = dragOverIndex === index

                return (
                  <li
                    key={section.id}
                    draggable
                    onDragStart={(e) => handleDragStart(e, index)}
                    onDragOver={(e) => handleDragOver(e, index)}
                    onDragLeave={handleDragLeave}
                    onDrop={(e) => handleDrop(e, index)}
                    onDragEnd={handleDragEnd}
                    className={`flex items-center gap-2 px-3 py-2.5 cursor-pointer transition-colors ${
                      isSelected
                        ? 'bg-esi-red/5 border-l-2 border-esi-red'
                        : 'hover:bg-stone-50 dark:hover:bg-zinc-800/50'
                    } ${isDragOver ? 'border-t-2 border-esi-red' : ''}`}
                    onClick={() => setSelectedId(section.id)}
                  >
                    {/* Drag handle */}
                    <span
                      className="text-stone-300 dark:text-zinc-600 cursor-grab active:cursor-grabbing shrink-0"
                      onMouseDown={(e) => e.stopPropagation()}
                    >
                      <DotsSixVertical size={16} />
                    </span>

                    {/* Icon */}
                    <span
                      className={`shrink-0 ${
                        isSelected ? 'text-esi-red' : 'text-stone-400 dark:text-zinc-500'
                      }`}
                    >
                      <Icon size={16} />
                    </span>

                    {/* Label */}
                    <span
                      className={`flex-1 text-sm font-medium truncate ${
                        isSelected
                          ? 'text-stone-800 dark:text-zinc-100'
                          : 'text-stone-600 dark:text-zinc-400'
                      } ${!section.enabled ? 'opacity-50 line-through' : ''}`}
                    >
                      {section.label || meta?.label}
                    </span>

                    {/* Toggle */}
                    <span
                      onClick={(e) => e.stopPropagation()}
                      className="shrink-0"
                    >
                      <Toggle
                        checked={section.enabled}
                        onChange={(v) => handleToggleEnabled(section.id, v)}
                      />
                    </span>

                    {/* Delete */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation()
                        handleDelete(section.id)
                      }}
                      disabled={deleting === section.id}
                      className="shrink-0 text-stone-300 dark:text-zinc-600 hover:text-red-500 transition-colors disabled:opacity-50"
                    >
                      {deleting === section.id ? (
                        <Spinner size={14} className="animate-spin" />
                      ) : (
                        <Trash size={14} />
                      )}
                    </button>
                  </li>
                )
              })}
            </ul>
          </div>

          {/* ── Right Panel: Config Form ── */}
          <div className="flex-1 min-w-0 rounded-xl border border-stone-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 shadow-sm">
            {selectedSection ? (
              <>
                {/* Form header */}
                <div className="flex items-center justify-between px-5 py-4 border-b border-stone-100 dark:border-zinc-800 bg-stone-50 dark:bg-zinc-800/50">
                  <div className="flex items-center gap-2">
                    {(() => {
                      const meta = SECTION_META[selectedSection.section_type]
                      const Icon = meta?.Icon ?? Info
                      return <Icon size={18} className="text-esi-red" />
                    })()}
                    <div>
                      <p className="text-sm font-semibold text-stone-800 dark:text-zinc-100">
                        {SECTION_META[selectedSection.section_type]?.label}
                      </p>
                      <p className="text-xs text-stone-400 dark:text-zinc-500">
                        {selectedSection.enabled ? 'Aktif' : 'Tidak aktif'}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {/* Section label editor */}
                    <Input
                      value={selectedSection.label}
                      onChange={(e) =>
                        setSections((prev) =>
                          prev.map((s) =>
                            s.id === selectedSection.id ? { ...s, label: e.target.value } : s
                          )
                        )
                      }
                      placeholder="Label section"
                      className="w-40 h-8 text-sm"
                    />
                    <Button
                      size="sm"
                      onClick={() => handleSaveSection(selectedSection.id)}
                      disabled={savingId === selectedSection.id}
                    >
                      {savingId === selectedSection.id ? (
                        <Spinner size={13} className="mr-1.5 animate-spin" />
                      ) : (
                        <FloppyDisk size={13} className="mr-1.5" />
                      )}
                      Simpan
                    </Button>
                  </div>
                </div>

                {/* Form body */}
                <div className="p-5">
                  <SectionConfigForm
                    section={selectedSection}
                    onChange={(config) => handleConfigChange(selectedSection.id, config)}
                  />
                </div>
              </>
            ) : (
              <div className="flex items-center justify-center h-64 text-stone-400 dark:text-zinc-500 text-sm">
                Pilih section untuk dikonfigurasi
              </div>
            )}
          </div>
        </div>
      )}
    </>
  )
}
