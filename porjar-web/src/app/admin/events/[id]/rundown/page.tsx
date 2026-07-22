'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams } from 'next/navigation'
import { toast } from 'sonner'
import { api } from '@/lib/api'
import { useAuthStore } from '@/store/auth-store'
import { PageHeader } from '@/components/shared/PageHeader'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Skeleton } from '@/components/ui/skeleton'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import {
  Plus,
  Trash,
  FloppyDisk,
  Spinner,
  ListBullets,
  ArrowUp,
  ArrowDown,
} from '@phosphor-icons/react'
import type { Event } from '@/types'

interface RundownItem {
  time: string
  title: string
  description: string
}

// The event API returns fields beyond the `Event` type (rundown, rules_content,
// created_at/updated_at, etc). We fetch the full raw object so a save can echo
// back every field untouched — the PUT endpoint replaces the whole event.
type RawEvent = Event & Record<string, unknown>

export default function EventRundownAdminPage() {
  const params = useParams<{ id: string }>()
  const { isAuthenticated, isLoading: authLoading } = useAuthStore()

  const [event, setEvent] = useState<RawEvent | null>(null)
  const [items, setItems] = useState<RundownItem[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [deleteIdx, setDeleteIdx] = useState<number | null>(null)

  const loadData = useCallback(async () => {
    if (!isAuthenticated || authLoading) return
    try {
      const data = await api.get<RawEvent>(`/admin/events/${params.id}`)
      setEvent(data ?? null)
      const rundown = (data?.rundown as RundownItem[] | undefined) ?? []
      setItems(
        rundown.map((r) => ({
          time: r.time ?? '',
          title: r.title ?? '',
          description: r.description ?? '',
        }))
      )
    } catch {
      toast.error('Gagal memuat rundown')
    } finally {
      setLoading(false)
    }
  }, [params.id, isAuthenticated, authLoading])

  useEffect(() => {
    loadData()
  }, [loadData])

  function addRow() {
    setItems((prev) => [...prev, { time: '', title: '', description: '' }])
  }

  function updateRow(idx: number, field: keyof RundownItem, value: string) {
    setItems((prev) => prev.map((it, i) => (i === idx ? { ...it, [field]: value } : it)))
  }

  function confirmRemove(idx: number) {
    setDeleteIdx(idx)
  }

  function removeRow() {
    if (deleteIdx === null) return
    setItems((prev) => prev.filter((_, i) => i !== deleteIdx))
    setDeleteIdx(null)
  }

  function moveRow(idx: number, dir: -1 | 1) {
    setItems((prev) => {
      const target = idx + dir
      if (target < 0 || target >= prev.length) return prev
      const next = [...prev]
      ;[next[idx], next[target]] = [next[target], next[idx]]
      return next
    })
  }

  async function handleSave() {
    if (!event) return
    setSaving(true)
    try {
      // Send the whole event object back (the PUT endpoint replaces every
      // field), only the rundown array changes.
      await api.put(`/admin/events/${params.id}`, {
        ...event,
        rundown: items,
      })
      toast.success('Rundown berhasil disimpan')
    } catch {
      toast.error('Gagal menyimpan rundown')
    } finally {
      setSaving(false)
    }
  }

  if (authLoading || loading) {
    return (
      <>
        <div className="space-y-4">
          <Skeleton className="h-10 w-64 bg-stone-100 dark:bg-zinc-800" />
          <Skeleton className="h-64 w-full bg-stone-100 dark:bg-zinc-800" />
        </div>
      </>
    )
  }

  return (
    <>
      <PageHeader
        title="Rundown Acara"
        description={event ? `Susunan acara untuk ${event.name}` : 'Susunan acara event'}
        breadcrumbs={[
          { label: 'Events', href: '/admin/events' },
          { label: event?.name ?? '...', href: `/admin/events/${params.id}` },
          { label: 'Rundown' },
        ]}
        actions={
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={addRow}
              className="border-stone-300 dark:border-zinc-600 text-stone-700 dark:text-zinc-300"
            >
              <Plus size={14} className="mr-1.5" /> Tambah
            </Button>
            <Button
              onClick={handleSave}
              disabled={saving}
              className="bg-esi-red text-white hover:bg-esi-red/90"
            >
              {saving ? (
                <Spinner size={14} className="mr-1.5 animate-spin" />
              ) : (
                <FloppyDisk size={14} className="mr-1.5" />
              )}
              {saving ? 'Menyimpan...' : 'Simpan'}
            </Button>
          </div>
        }
      />

      <div className="rounded-xl border border-stone-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 shadow-sm overflow-hidden">
        {items.length === 0 ? (
          <div className="p-12 text-center">
            <ListBullets size={32} className="mx-auto mb-3 text-stone-300 dark:text-zinc-600" />
            <p className="text-stone-400 dark:text-zinc-500 mb-4">
              Belum ada rundown. Klik &quot;Tambah&quot; untuk menambahkan susunan acara.
            </p>
            <Button variant="outline" size="sm" onClick={addRow}>
              <Plus size={14} className="mr-1.5" /> Tambah Rundown Pertama
            </Button>
          </div>
        ) : (
          <ul className="divide-y divide-stone-100 dark:divide-zinc-800">
            {items.map((item, idx) => (
              <li key={idx} className="p-4 sm:p-5">
                <div className="flex items-start gap-3">
                  <div className="flex flex-col items-center gap-1 pt-1 shrink-0">
                    <button
                      type="button"
                      onClick={() => moveRow(idx, -1)}
                      disabled={idx === 0}
                      className="text-stone-300 dark:text-zinc-600 hover:text-stone-600 dark:hover:text-zinc-300 disabled:opacity-30"
                    >
                      <ArrowUp size={14} />
                    </button>
                    <span className="text-xs font-semibold text-stone-400 dark:text-zinc-500 tabular-nums">
                      {idx + 1}
                    </span>
                    <button
                      type="button"
                      onClick={() => moveRow(idx, 1)}
                      disabled={idx === items.length - 1}
                      className="text-stone-300 dark:text-zinc-600 hover:text-stone-600 dark:hover:text-zinc-300 disabled:opacity-30"
                    >
                      <ArrowDown size={14} />
                    </button>
                  </div>

                  <div className="flex-1 min-w-0 grid grid-cols-1 sm:grid-cols-[8rem_1fr] gap-3">
                    <div>
                      <label className="text-xs font-medium text-stone-600 dark:text-zinc-400 mb-1 block">
                        Waktu
                      </label>
                      <Input
                        value={item.time}
                        onChange={(e) => updateRow(idx, 'time', e.target.value)}
                        placeholder="08:00"
                        className="text-sm"
                      />
                    </div>
                    <div className="space-y-3">
                      <div>
                        <label className="text-xs font-medium text-stone-600 dark:text-zinc-400 mb-1 block">
                          Judul
                        </label>
                        <Input
                          value={item.title}
                          onChange={(e) => updateRow(idx, 'title', e.target.value)}
                          placeholder="Registrasi Peserta"
                          className="text-sm"
                        />
                      </div>
                      <div>
                        <label className="text-xs font-medium text-stone-600 dark:text-zinc-400 mb-1 block">
                          Deskripsi (opsional)
                        </label>
                        <Textarea
                          value={item.description}
                          onChange={(e) => updateRow(idx, 'description', e.target.value)}
                          placeholder="Detail tambahan..."
                          rows={2}
                          className="text-sm"
                        />
                      </div>
                    </div>
                  </div>

                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => confirmRemove(idx)}
                    className="text-red-500 hover:text-red-700 shrink-0"
                  >
                    <Trash size={14} />
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      <ConfirmDialog
        open={deleteIdx !== null}
        title="Hapus Item Rundown"
        description="Yakin ingin menghapus item rundown ini?"
        confirmLabel="Hapus"
        onConfirm={removeRow}
        onCancel={() => setDeleteIdx(null)}
        variant="destructive"
      />
    </>
  )
}
