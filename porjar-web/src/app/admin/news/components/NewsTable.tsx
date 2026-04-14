'use client'

import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { EmptyState } from '@/components/shared/EmptyState'
import { Newspaper, PencilSimple, Trash } from '@phosphor-icons/react'
import type { News } from '@/types'

interface NewsTableProps {
  news: News[]
  totalItems: number
  totalPages: number
  currentPage: number
  perPage: number
  onPageChange: (page: number) => void
  onEdit: (item: News) => void
  onDelete: (item: News) => void
}

function formatDate(iso: string): string {
  if (!iso) return '-'
  const d = new Date(iso)
  if (isNaN(d.getTime())) return '-'
  return d.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })
}

export function NewsTable({
  news,
  totalItems,
  totalPages,
  currentPage,
  perPage,
  onPageChange,
  onEdit,
  onDelete,
}: NewsTableProps) {
  return (
    <>
      <div className="mb-4 text-sm text-stone-500 dark:text-zinc-400">
        Menampilkan <span className="font-semibold text-stone-900 dark:text-zinc-100">{totalItems}</span> berita
        {totalPages > 1 && <span className="text-stone-400 dark:text-zinc-500"> · Halaman {currentPage} dari {totalPages}</span>}
      </div>

      {totalItems === 0 ? (
        <EmptyState icon={Newspaper} title="Belum Ada Berita" description="Klik tombol Tambah Berita untuk membuat artikel pertama." />
      ) : (
        <div className="rounded-xl border border-stone-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-stone-200 dark:border-zinc-700 hover:bg-transparent bg-stone-50 dark:bg-zinc-800/50">
                  <TableHead className="text-stone-600 dark:text-zinc-400 uppercase text-xs tracking-wider">Judul</TableHead>
                  <TableHead className="text-stone-600 dark:text-zinc-400 uppercase text-xs tracking-wider">Kategori</TableHead>
                  <TableHead className="hidden sm:table-cell text-stone-600 dark:text-zinc-400 uppercase text-xs tracking-wider">Tanggal Publikasi</TableHead>
                  <TableHead className="text-right text-stone-600 dark:text-zinc-400 uppercase text-xs tracking-wider">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {news.map((item) => (
                  <TableRow key={item.id} className="border-stone-100 dark:border-zinc-700 hover:bg-red-50 dark:hover:bg-red-950/30">
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="font-medium text-stone-900 dark:text-zinc-100 line-clamp-1">{item.title}</span>
                        <span className="text-xs text-stone-400 dark:text-zinc-500 font-mono">{item.slug}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="inline-flex items-center rounded-full border border-stone-200 dark:border-zinc-700 bg-stone-50 dark:bg-zinc-800 px-2.5 py-0.5 text-xs font-medium text-stone-700 dark:text-zinc-300">
                        {item.category}
                      </span>
                    </TableCell>
                    <TableCell className="hidden sm:table-cell text-sm text-stone-500 dark:text-zinc-400">
                      {formatDate(item.published_at)}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          size="xs"
                          variant="ghost"
                          onClick={() => onEdit(item)}
                          className="text-stone-500 dark:text-zinc-400 hover:text-blue-600 h-7 w-7 p-0"
                          title="Edit berita"
                        >
                          <PencilSimple size={15} />
                        </Button>
                        <Button
                          size="xs"
                          variant="ghost"
                          onClick={() => onDelete(item)}
                          className="text-stone-500 dark:text-zinc-400 hover:text-red-600 h-7 w-7 p-0"
                          title="Hapus berita"
                        >
                          <Trash size={15} />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {totalPages > 1 && (
            <div className="flex flex-col gap-2 border-t border-stone-200 dark:border-zinc-700 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-xs text-stone-500 dark:text-zinc-400">
                {(currentPage - 1) * perPage + 1}–{Math.min(currentPage * perPage, totalItems)} dari {totalItems}
              </p>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => onPageChange(Math.max(1, currentPage - 1))}
                  disabled={currentPage === 1}
                  className="rounded-lg border border-stone-200 dark:border-zinc-700 px-3 py-1.5 text-xs font-medium text-stone-600 dark:text-zinc-400 hover:bg-stone-50 dark:hover:bg-zinc-800 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Sebelumnya
                </button>
                <span className="px-2 text-xs text-stone-500 dark:text-zinc-400">
                  {currentPage} / {totalPages}
                </span>
                <button
                  onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
                  disabled={currentPage === totalPages}
                  className="rounded-lg border border-stone-200 dark:border-zinc-700 px-3 py-1.5 text-xs font-medium text-stone-600 dark:text-zinc-400 hover:bg-stone-50 dark:hover:bg-zinc-800 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Berikutnya
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </>
  )
}
