'use client'

import { useEffect, useState, useCallback } from 'react'
import { toast } from 'sonner'
import { api } from '@/lib/api'
import { useAuthStore } from '@/store/auth-store'
import { AdminLayout } from '@/components/layouts/AdminLayout'
import { PageHeader } from '@/components/shared/PageHeader'
import { Button } from '@/components/ui/button'
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
  Plugs,
  Plus,
  PencilSimple,
  Trash,
  Lightning,
  Eye,
} from '@phosphor-icons/react'
import { WebhookFormDialog, EVENT_LABELS } from './WebhookFormDialog'
import { WebhookLogSheet } from './WebhookLogSheet'

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

interface WebhookLog {
  id: string
  webhook_id: string
  event: string
  payload: unknown
  response_status: number | null
  response_body: string | null
  duration_ms: number | null
  success: boolean
  created_at: string
}

export default function AdminWebhooksPage() {
  const { isAuthenticated, isLoading: authLoading } = useAuthStore()
  const [webhooks, setWebhooks] = useState<Webhook[]>([])
  const [events, setEvents] = useState<string[]>([])
  const [loading, setLoading] = useState(true)

  // Dialog states
  const [showCreate, setShowCreate] = useState(false)
  const [showEdit, setShowEdit] = useState(false)
  const [editWebhook, setEditWebhook] = useState<Webhook | null>(null)
  const [showLogs, setShowLogs] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [processing, setProcessing] = useState(false)

  // Logs state
  const [logs, setLogs] = useState<WebhookLog[]>([])
  const [logsWebhookName, setLogsWebhookName] = useState('')
  const [logsLoading, setLogsLoading] = useState(false)

  const loadData = useCallback(async () => {
    if (!isAuthenticated || authLoading) return
    try {
      const [w, e] = await Promise.all([
        api.get<Webhook[]>('/admin/webhooks'),
        api.get<string[]>('/admin/webhooks/events'),
      ])
      setWebhooks(w ?? [])
      setEvents(e ?? [])
    } catch {
      toast.error('Gagal memuat data webhooks')
    } finally {
      setLoading(false)
    }
  }, [isAuthenticated, authLoading])

  useEffect(() => {
    loadData()
  }, [loadData])

  async function handleDelete() {
    if (!deletingId) return
    setProcessing(true)
    try {
      await api.delete(`/admin/webhooks/${deletingId}`)
      toast.success('Webhook berhasil dihapus')
      setShowDeleteConfirm(false)
      setDeletingId(null)
      loadData()
    } catch {
      toast.error('Gagal menghapus webhook')
    } finally {
      setProcessing(false)
    }
  }

  async function handleTest(id: string) {
    try {
      await api.post(`/admin/webhooks/${id}/test`)
      toast.success('Test webhook terkirim')
    } catch {
      toast.error('Gagal mengirim test webhook')
    }
  }

  async function openLogs(wh: Webhook) {
    setLogsWebhookName(wh.name)
    setShowLogs(true)
    setLogsLoading(true)
    try {
      const l = await api.get<WebhookLog[]>(`/admin/webhooks/${wh.id}/logs?limit=50`)
      setLogs(l ?? [])
    } catch {
      toast.error('Gagal memuat logs')
    } finally {
      setLogsLoading(false)
    }
  }

  function formatDate(dateStr: string | null) {
    if (!dateStr) return '-'
    return new Date(dateStr).toLocaleString('id-ID', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  if (loading) {
    return (
      <AdminLayout>
        <Skeleton className="h-10 w-64 bg-stone-200" />
        <div className="mt-4 space-y-2">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-16 w-full bg-stone-200" />
          ))}
        </div>
      </AdminLayout>
    )
  }

  return (
    <AdminLayout>
      <PageHeader
        title="Webhooks"
        description="Kelola webhook untuk integrasi dengan layanan eksternal"
        breadcrumbs={[{ label: 'Webhooks' }]}
        actions={
          <Button
            onClick={() => setShowCreate(true)}
            className="bg-porjar-red hover:bg-porjar-red-dark text-white"
          >
            <Plus className="mr-2 h-4 w-4" />
            Tambah Webhook
          </Button>
        }
      />

      {webhooks.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-stone-300 bg-white py-16">
          <Plugs className="mb-4 h-12 w-12 text-stone-300" />
          <p className="text-stone-500">Belum ada webhook</p>
          <p className="mt-1 text-sm text-stone-400">
            Buat webhook untuk menerima notifikasi event secara real-time
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-stone-200 bg-white shadow-sm">
          <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="border-stone-200 hover:bg-transparent bg-stone-50">
                <TableHead className="text-stone-600 uppercase text-xs tracking-wider whitespace-nowrap">Nama</TableHead>
                <TableHead className="text-stone-600 uppercase text-xs tracking-wider">URL</TableHead>
                <TableHead className="text-stone-600 uppercase text-xs tracking-wider">Events</TableHead>
                <TableHead className="text-stone-600 uppercase text-xs tracking-wider">Status</TableHead>
                <TableHead className="text-stone-600 uppercase text-xs tracking-wider">Terakhir Trigger</TableHead>
                <TableHead className="text-stone-600 uppercase text-xs tracking-wider">Gagal</TableHead>
                <TableHead className="text-right text-stone-600 uppercase text-xs tracking-wider">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {webhooks.map((wh) => (
                <TableRow key={wh.id} className="border-stone-100 hover:bg-red-50/50">
                  <TableCell className="font-medium text-stone-900">{wh.name}</TableCell>
                  <TableCell className="max-w-[200px] truncate text-sm text-stone-500">
                    {wh.url}
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {wh.events.slice(0, 2).map((e) => (
                        <Badge
                          key={e}
                          variant="outline"
                          className="border-stone-300 text-xs text-stone-500"
                        >
                          {EVENT_LABELS[e] || e}
                        </Badge>
                      ))}
                      {wh.events.length > 2 && (
                        <Badge
                          variant="outline"
                          className="border-stone-300 text-xs text-stone-400"
                        >
                          +{wh.events.length - 2}
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    {wh.is_active ? (
                      <Badge className="bg-green-50 text-green-700 border border-green-200">Aktif</Badge>
                    ) : (
                      <Badge className="bg-stone-100 text-stone-500 border border-stone-200">Nonaktif</Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-sm text-stone-500">
                    {formatDate(wh.last_triggered_at)}
                  </TableCell>
                  <TableCell>
                    {wh.failure_count > 0 ? (
                      <span className="text-red-500">{wh.failure_count}</span>
                    ) : (
                      <span className="text-stone-400">0</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openLogs(wh)}
                        title="Lihat Logs"
                        className="text-stone-500 hover:text-stone-900"
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleTest(wh.id)}
                        title="Kirim Test"
                        className="text-stone-500 hover:text-blue-600"
                      >
                        <Lightning className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setEditWebhook(wh)
                          setShowEdit(true)
                        }}
                        title="Edit"
                        className="text-stone-500 hover:text-amber-600"
                      >
                        <PencilSimple className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setDeletingId(wh.id)
                          setShowDeleteConfirm(true)
                        }}
                        title="Hapus"
                        className="text-stone-500 hover:text-red-600"
                      >
                        <Trash className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          </div>
        </div>
      )}

      {/* Create Dialog */}
      <WebhookFormDialog
        mode="create"
        open={showCreate}
        onOpenChange={setShowCreate}
        events={events}
        onSaved={loadData}
      />

      {/* Edit Dialog */}
      <WebhookFormDialog
        mode="edit"
        open={showEdit}
        onOpenChange={setShowEdit}
        events={events}
        webhook={editWebhook}
        onSaved={loadData}
      />

      {/* Delete Confirm Dialog */}
      <Dialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <DialogContent className="border-stone-200 bg-white text-stone-900 sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Hapus Webhook</DialogTitle>
            <DialogDescription className="text-stone-500">
              Apakah Anda yakin ingin menghapus webhook ini? Semua log delivery juga akan dihapus.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowDeleteConfirm(false)}
              className="border-stone-300 text-stone-600"
            >
              Batal
            </Button>
            <Button
              onClick={handleDelete}
              disabled={processing}
              className="bg-red-600 hover:bg-red-700"
            >
              {processing ? 'Menghapus...' : 'Hapus'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Logs Dialog */}
      <WebhookLogSheet
        open={showLogs}
        onOpenChange={setShowLogs}
        webhookName={logsWebhookName}
        logs={logs}
        loading={logsLoading}
      />
    </AdminLayout>
  )
}
