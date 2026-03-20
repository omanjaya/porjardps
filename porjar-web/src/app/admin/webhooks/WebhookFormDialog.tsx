'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { api } from '@/lib/api'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'

const EVENT_LABELS: Record<string, string> = {
  'match.completed': 'Match Selesai',
  'match.live': 'Match Live',
  'bracket.generated': 'Bracket Dibuat',
  'team.registered': 'Tim Terdaftar',
  'lobby.results': 'Hasil Lobby',
  'tournament.completed': 'Turnamen Selesai',
}

export { EVENT_LABELS }

interface Webhook {
  id: string
  name: string
  url: string
  secret?: string
  events: string[]
  is_active: boolean
  created_by: string | null
  last_triggered_at: string | null
  failure_count: number
  created_at: string
}

interface WebhookFormDialogProps {
  mode: 'create' | 'edit'
  open: boolean
  onOpenChange: (open: boolean) => void
  events: string[]
  webhook?: Webhook | null
  onSaved: () => void
}

export function WebhookFormDialog({
  mode,
  open,
  onOpenChange,
  events,
  webhook,
  onSaved,
}: WebhookFormDialogProps) {
  const [formName, setFormName] = useState('')
  const [formURL, setFormURL] = useState('')
  const [formSecret, setFormSecret] = useState('')
  const [formEvents, setFormEvents] = useState<string[]>([])
  const [formActive, setFormActive] = useState(true)
  const [processing, setProcessing] = useState(false)

  function handleOpenChange(val: boolean) {
    if (val && mode === 'edit' && webhook) {
      setFormName(webhook.name)
      setFormURL(webhook.url)
      setFormSecret(webhook.secret || '')
      setFormEvents(webhook.events ?? [])
      setFormActive(webhook.is_active)
    } else if (val && mode === 'create') {
      setFormName('')
      setFormURL('')
      setFormSecret('')
      setFormEvents([])
      setFormActive(true)
    }
    onOpenChange(val)
  }

  function generateSecret() {
    const arr = new Uint8Array(32)
    crypto.getRandomValues(arr)
    const hex = Array.from(arr)
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('')
    setFormSecret(hex)
  }

  function toggleEvent(event: string) {
    setFormEvents((prev) =>
      prev.includes(event) ? prev.filter((e) => e !== event) : [...prev, event]
    )
  }

  async function handleSubmit() {
    if (!formName || !formURL || formEvents.length === 0) {
      toast.error('Lengkapi semua field yang wajib diisi')
      return
    }
    setProcessing(true)
    try {
      if (mode === 'create') {
        await api.post('/admin/webhooks', {
          name: formName,
          url: formURL,
          secret: formSecret || undefined,
          events: formEvents,
        })
        toast.success('Webhook berhasil dibuat')
      } else if (webhook) {
        await api.put(`/admin/webhooks/${webhook.id}`, {
          name: formName,
          url: formURL,
          secret: formSecret || undefined,
          events: formEvents,
          is_active: formActive,
        })
        toast.success('Webhook berhasil diperbarui')
      }
      onOpenChange(false)
      onSaved()
    } catch {
      toast.error(mode === 'create' ? 'Gagal membuat webhook' : 'Gagal memperbarui webhook')
    } finally {
      setProcessing(false)
    }
  }

  const isEdit = mode === 'edit'

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="border-stone-200 bg-white text-stone-900 sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit Webhook' : 'Tambah Webhook'}</DialogTitle>
          <DialogDescription className="text-stone-500">
            {isEdit
              ? 'Perbarui konfigurasi webhook'
              : 'Buat webhook baru untuk menerima notifikasi event'}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-stone-700">
              Nama Webhook *
            </label>
            <Input
              value={formName}
              onChange={(e) => setFormName(e.target.value)}
              placeholder="Contoh: Discord Notifier"
              className="border-stone-300 bg-white text-stone-900 focus:border-porjar-red focus:ring-porjar-red/20"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-stone-700">
              URL Endpoint *
            </label>
            <Input
              value={formURL}
              onChange={(e) => setFormURL(e.target.value)}
              placeholder="https://example.com/webhook"
              className="border-stone-300 bg-white text-stone-900 focus:border-porjar-red focus:ring-porjar-red/20"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-stone-700">
              Secret (HMAC Signature)
            </label>
            <div className="flex gap-2">
              <Input
                value={formSecret}
                onChange={(e) => setFormSecret(e.target.value)}
                placeholder="Kosongkan untuk auto-generate"
                className="border-stone-300 bg-white text-stone-900 focus:border-porjar-red focus:ring-porjar-red/20"
              />
              <Button
                variant="outline"
                size="sm"
                onClick={generateSecret}
                className="shrink-0 border-stone-300 text-stone-600 hover:bg-stone-50"
              >
                Generate
              </Button>
            </div>
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium text-stone-700">
              Events *
            </label>
            <div className="grid grid-cols-2 gap-2">
              {events.map((event) => (
                <label
                  key={event}
                  className="flex cursor-pointer items-center gap-2 rounded border border-stone-200 p-2 transition hover:border-stone-400"
                >
                  <input
                    type="checkbox"
                    checked={formEvents.includes(event)}
                    onChange={() => toggleEvent(event)}
                    className="rounded border-stone-300 bg-white"
                  />
                  <span className="text-sm text-stone-700">
                    {EVENT_LABELS[event] || event}
                  </span>
                </label>
              ))}
            </div>
          </div>
          {isEdit && (
            <div>
              <label className="flex cursor-pointer items-center gap-2">
                <input
                  type="checkbox"
                  checked={formActive}
                  onChange={(e) => setFormActive(e.target.checked)}
                  className="rounded border-stone-300 bg-white"
                />
                <span className="text-sm text-stone-700">Aktif</span>
              </label>
            </div>
          )}
        </div>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="border-stone-300 text-stone-600"
          >
            Batal
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={processing}
            className="bg-porjar-red hover:bg-porjar-red-dark text-white"
          >
            {processing ? 'Menyimpan...' : 'Simpan'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
