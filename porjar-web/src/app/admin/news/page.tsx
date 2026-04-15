'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { api, ApiError } from '@/lib/api'
import { PageHeader } from '@/components/shared/PageHeader'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Plus, Trash } from '@phosphor-icons/react'
import type { News } from '@/types'
import { usePaginatedNews } from './hooks/usePaginatedNews'
import { useNewsCrud } from './hooks/useNewsCrud'
import { NewsTable } from './components/NewsTable'
import { NewsFormDialog } from './dialogs/NewsFormDialog'
import { DeleteNewsDialog } from './dialogs/DeleteNewsDialog'

export default function AdminNewsPage() {
  const {
    news,
    totalItems,
    totalPages,
    loading,
    currentPage,
    setCurrentPage,
    perPage,
    refetch,
  } = usePaginatedNews()

  const crud = useNewsCrud(refetch)

  const [showCreate, setShowCreate] = useState(false)
  const [editNews, setEditNews] = useState<News | null>(null)
  const [deleteNews, setDeleteNews] = useState<News | null>(null)

  // Bulk selection state
  const [selectedIds, setSelectedIds] = useState<number[]>([])
  const [bulkConfirmOpen, setBulkConfirmOpen] = useState(false)
  const [bulkProcessing, setBulkProcessing] = useState(false)

  function toggleOne(id: number) {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    )
  }

  function toggleAll() {
    const pageIds = news.map((n) => n.id)
    const allSelected = pageIds.length > 0 && pageIds.every((id) => selectedIds.includes(id))
    if (allSelected) {
      setSelectedIds((prev) => prev.filter((id) => !pageIds.includes(id)))
    } else {
      setSelectedIds((prev) => Array.from(new Set([...prev, ...pageIds])))
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
        ids.map((id) => api.delete(`/news/${id}`))
      )
      const ok = results.filter((r) => r.status === 'fulfilled').length
      const fail = results.length - ok
      if (ok > 0) toast.success(`${ok} berita berhasil dihapus`)
      if (fail > 0) {
        const firstErr = results.find((r) => r.status === 'rejected') as PromiseRejectedResult | undefined
        const msg = firstErr?.reason instanceof ApiError ? firstErr.reason.message : ''
        toast.error(`${fail} berita gagal dihapus${msg ? `: ${msg}` : ''}`)
      }
      clearSelection()
      setBulkConfirmOpen(false)
      await refetch()
    } finally {
      setBulkProcessing(false)
    }
  }

  if (loading) {
    return (
      <>
        <Skeleton className="h-10 w-64 bg-stone-200" />
        <Skeleton className="mt-4 h-96 w-full bg-stone-200" />
      </>
    )
  }

  return (
    <>
      <PageHeader
        title="Manajemen Berita"
        description="Kelola artikel berita, pengumuman, dan update event"
        actions={
          <Button
            onClick={() => setShowCreate(true)}
            className="bg-esi-red hover:bg-esi-red-dark text-white"
          >
            <Plus size={16} weight="bold" className="mr-1" />
            Tambah Berita
          </Button>
        }
      />

      <div className={selectedIds.length > 0 ? 'pb-32 sm:pb-24' : undefined}>
        <NewsTable
          news={news}
          totalItems={totalItems}
          totalPages={totalPages}
          currentPage={currentPage}
          perPage={perPage}
          onPageChange={setCurrentPage}
          onEdit={setEditNews}
          onDelete={setDeleteNews}
          selectedIds={selectedIds}
          onToggleOne={toggleOne}
          onToggleAll={toggleAll}
        />
      </div>

      <NewsFormDialog
        open={showCreate}
        onOpenChange={setShowCreate}
        mode="create"
        processing={crud.processing}
        onSubmit={crud.createNews}
      />

      <NewsFormDialog
        open={!!editNews}
        onOpenChange={(o) => { if (!o) setEditNews(null) }}
        mode="edit"
        news={editNews}
        processing={crud.processing}
        onSubmit={(form) => editNews ? crud.updateNews(editNews, form) : Promise.resolve(false)}
      />

      <DeleteNewsDialog
        open={!!deleteNews}
        onOpenChange={(o) => { if (!o) setDeleteNews(null) }}
        news={deleteNews}
        processing={crud.processing}
        onConfirm={crud.deleteNews}
      />

      {/* Bulk delete confirmation */}
      <Dialog open={bulkConfirmOpen} onOpenChange={(o) => { if (!o && !bulkProcessing) setBulkConfirmOpen(false) }}>
        <DialogContent className="bg-white dark:bg-zinc-900 border-stone-200 dark:border-zinc-700 text-stone-900 dark:text-zinc-100 sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-red-600">Hapus {selectedIds.length} Berita</DialogTitle>
            <DialogDescription className="text-stone-500 dark:text-zinc-400">
              Yakin hapus <strong className="text-stone-900 dark:text-zinc-100">{selectedIds.length} berita</strong> yang dipilih? Tindakan ini tidak dapat dibatalkan.
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
              <b>{selectedIds.length}</b> berita dipilih
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
    </>
  )
}
