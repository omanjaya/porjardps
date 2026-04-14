'use client'

import { useState } from 'react'
import { AdminLayout } from '@/components/layouts/AdminLayout'
import { PageHeader } from '@/components/shared/PageHeader'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Plus } from '@phosphor-icons/react'
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

  if (loading) {
    return (
      <AdminLayout>
        <Skeleton className="h-10 w-64 bg-stone-200" />
        <Skeleton className="mt-4 h-96 w-full bg-stone-200" />
      </AdminLayout>
    )
  }

  return (
    <AdminLayout>
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

      <NewsTable
        news={news}
        totalItems={totalItems}
        totalPages={totalPages}
        currentPage={currentPage}
        perPage={perPage}
        onPageChange={setCurrentPage}
        onEdit={setEditNews}
        onDelete={setDeleteNews}
      />

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
    </AdminLayout>
  )
}
