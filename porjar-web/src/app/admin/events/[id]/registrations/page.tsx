'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams } from 'next/navigation'
import { toast } from 'sonner'
import { api, ApiError } from '@/lib/api'
import { useAuthStore } from '@/store/auth-store'
import { PageHeader } from '@/components/shared/PageHeader'
import { EmptyState } from '@/components/shared/EmptyState'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Trophy, ClipboardText, Trash, ArrowsClockwise } from '@phosphor-icons/react'
import type { Event, EventRegistration } from '@/types'

const REFRESH_INTERVAL_MS = 20_000

function formatDateTime(dateStr: string | null): string {
  if (!dateStr) return '-'
  return new Date(dateStr).toLocaleString('id-ID', {
    day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
  })
}

export default function EventRegistrationsPage() {
  const { isAuthenticated, isLoading: authLoading } = useAuthStore()
  const params = useParams<{ id: string }>()

  const [event, setEvent] = useState<Event | null>(null)
  const [registrations, setRegistrations] = useState<EventRegistration[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [deleteTarget, setDeleteTarget] = useState<EventRegistration | null>(null)
  const [deleting, setDeleting] = useState(false)

  const load = useCallback(async (opts?: { silent?: boolean }) => {
    if (!isAuthenticated || authLoading) return
    if (!opts?.silent) setLoading(true)
    try {
      const [eventData, regsRes] = await Promise.all([
        api.get<Event>(`/admin/events/${params.id}`),
        api.get<{ registrations: EventRegistration[]; count: number }>(`/events/${params.id}/registrations`),
      ])
      setEvent(eventData ?? null)
      setRegistrations(Array.isArray(regsRes?.registrations) ? regsRes.registrations : [])
      setError(null)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Gagal memuat data pendaftaran')
      if (!opts?.silent) {
        setEvent(null)
        setRegistrations([])
      }
    } finally {
      if (!opts?.silent) setLoading(false)
    }
  }, [params.id, isAuthenticated, authLoading])

  useEffect(() => {
    load()
  }, [load])

  useEffect(() => {
    if (!isAuthenticated || authLoading) return
    const interval = setInterval(() => load({ silent: true }), REFRESH_INTERVAL_MS)
    return () => clearInterval(interval)
  }, [isAuthenticated, authLoading, load])

  async function handleManualRefresh() {
    await load({ silent: true })
    toast.success('Data diperbarui')
  }

  async function handleDelete() {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      await api.delete(`/admin/events/${params.id}/registrations/${deleteTarget.team.id}`)
      toast.success('Pendaftaran tim berhasil dihapus')
      setDeleteTarget(null)
      await load({ silent: true })
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Gagal menghapus pendaftaran')
    } finally {
      setDeleting(false)
    }
  }

  if (loading) {
    return (
      <>
        <Skeleton className="h-10 w-64 bg-stone-200 dark:bg-zinc-800" />
        <Skeleton className="mt-4 h-96 w-full bg-stone-200 dark:bg-zinc-800" />
      </>
    )
  }

  if (error && !event) {
    return (
      <>
        <PageHeader
          title="Pendaftar Event"
          breadcrumbs={[
            { label: 'Events', href: '/admin/events' },
            { label: 'Pendaftar' },
          ]}
        />
        <EmptyState
          icon={ClipboardText}
          title="Gagal Memuat Data"
          description={error}
          actionLabel="Coba Lagi"
          onAction={() => load()}
        />
      </>
    )
  }

  if (!event) {
    return <EmptyState icon={Trophy} title="Event Tidak Ditemukan" description="Event tidak ada atau sudah dihapus." />
  }

  return (
    <>
      <PageHeader
        title="Pendaftar Event"
        description={`Daftar tim yang terdaftar di ${event.name}`}
        breadcrumbs={[
          { label: 'Events', href: '/admin/events' },
          { label: event.name, href: `/admin/events/${params.id}` },
          { label: 'Pendaftar' },
        ]}
        actions={
          <Button
            variant="outline"
            onClick={handleManualRefresh}
            className="border-stone-300 dark:border-zinc-600 text-stone-700 dark:text-zinc-300"
          >
            <ArrowsClockwise size={14} className="mr-1.5" />
            Refresh
          </Button>
        }
      />

      {registrations.length === 0 ? (
        <EmptyState
          icon={ClipboardText}
          title="Belum Ada Pendaftar"
          description="Belum ada tim yang mendaftar ke event ini."
        />
      ) : (
        <div className="rounded-xl border border-stone-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-stone-200 dark:border-zinc-700 hover:bg-transparent bg-stone-50 dark:bg-zinc-800/50">
                  <TableHead className="text-stone-600 dark:text-zinc-400 uppercase text-xs tracking-wider">Tim</TableHead>
                  <TableHead className="text-stone-600 dark:text-zinc-400 uppercase text-xs tracking-wider">Sekolah</TableHead>
                  <TableHead className="text-stone-600 dark:text-zinc-400 uppercase text-xs tracking-wider">Terdaftar</TableHead>
                  <TableHead className="text-right text-stone-600 dark:text-zinc-400 uppercase text-xs tracking-wider">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {registrations.map((reg) => (
                  <TableRow key={reg.id} className="border-stone-100 dark:border-zinc-700">
                    <TableCell>
                      <span className="font-medium text-stone-900 dark:text-zinc-100">{reg.team.name}</span>
                    </TableCell>
                    <TableCell className="text-sm text-stone-500 dark:text-zinc-400">
                      {reg.team.school_name ?? '-'}
                    </TableCell>
                    <TableCell className="text-sm text-stone-500 dark:text-zinc-400">
                      {formatDateTime(reg.registered_at)}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="outline"
                        size="sm"
                        className="border-red-200 text-red-500 hover:bg-red-50 dark:bg-red-950/30"
                        onClick={() => setDeleteTarget(reg)}
                      >
                        <Trash size={14} className="mr-1" />
                        Hapus
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={!!deleteTarget}
        title="Hapus Pendaftaran"
        description={`Yakin ingin menghapus pendaftaran tim "${deleteTarget?.team.name}" dari event ini?`}
        confirmLabel={deleting ? 'Menghapus...' : 'Hapus'}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
        loading={deleting}
        variant="destructive"
      />
    </>
  )
}
