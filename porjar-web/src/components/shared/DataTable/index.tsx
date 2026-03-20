'use client'

import { useState, useMemo } from 'react'
import { ArrowsDownUp, ListDashes } from '@phosphor-icons/react'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'

interface Column<T> {
  key: string
  header: string
  render?: (item: T) => React.ReactNode
  sortable?: boolean
  className?: string
}

interface DataTableProps<T> {
  columns: Column<T>[]
  data: T[]
  pagination?: {
    page: number
    per_page: number
    total: number
    total_pages: number
  }
  onPageChange?: (page: number) => void
  loading?: boolean
  emptyMessage?: string
  emptyIcon?: React.ComponentType<{
    size: number
    weight: string
    className: string
  }>
  onRowClick?: (item: T) => void
}

type SortDirection = 'asc' | 'desc'

export function DataTable<T extends Record<string, unknown>>({
  columns,
  data,
  pagination,
  onPageChange,
  loading = false,
  emptyMessage = 'Tidak ada data',
  emptyIcon: EmptyIcon,
  onRowClick,
}: DataTableProps<T>) {
  const [sortKey, setSortKey] = useState<string | null>(null)
  const [sortDir, setSortDir] = useState<SortDirection>('asc')

  const handleSort = (key: string) => {
    if (sortKey === key) {
      setSortDir((prev) => (prev === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortKey(key)
      setSortDir('asc')
    }
  }

  const sortedData = useMemo(() => {
    if (!sortKey) return data

    return [...data].sort((a, b) => {
      const aVal = a[sortKey]
      const bVal = b[sortKey]

      if (aVal == null && bVal == null) return 0
      if (aVal == null) return 1
      if (bVal == null) return -1

      let result = 0
      if (typeof aVal === 'string' && typeof bVal === 'string') {
        result = aVal.localeCompare(bVal)
      } else if (typeof aVal === 'number' && typeof bVal === 'number') {
        result = aVal - bVal
      } else {
        result = String(aVal).localeCompare(String(bVal))
      }

      return sortDir === 'desc' ? -result : result
    })
  }, [data, sortKey, sortDir])

  // Loading skeleton
  if (loading) {
    return (
      <div className="rounded-lg border border-stone-200 overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="border-stone-200 hover:bg-transparent">
                {columns.map((col) => (
                  <TableHead key={col.key} className="text-stone-600 bg-stone-50 whitespace-nowrap">
                    {col.header}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i} className="border-stone-100">
                  {columns.map((col) => (
                    <TableCell key={col.key}>
                      <Skeleton className="h-4 w-full bg-stone-200/50" />
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    )
  }

  // Empty state
  if (data.length === 0) {
    return (
      <div className="rounded-lg border border-stone-200 overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="border-stone-200 hover:bg-transparent">
                {columns.map((col) => (
                  <TableHead key={col.key} className="text-stone-600 bg-stone-50 whitespace-nowrap">
                    {col.header}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
          </Table>
        </div>
        <div className="flex flex-col items-center justify-center py-16 text-center">
          {EmptyIcon ? (
            <EmptyIcon size={40} weight="duotone" className="mb-3 text-stone-400" />
          ) : (
            <ListDashes size={40} weight="duotone" className="mb-3 text-stone-400" />
          )}
          <p className="text-sm text-stone-500">{emptyMessage}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <div className="rounded-lg border border-stone-200 overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="border-stone-200 hover:bg-transparent">
                {columns.map((col) => (
                  <TableHead
                    key={col.key}
                    className={`text-stone-600 bg-stone-50 whitespace-nowrap ${col.className ?? ''}`}
                  >
                    {col.sortable ? (
                      <button
                        type="button"
                        onClick={() => handleSort(col.key)}
                        className="inline-flex items-center gap-1 hover:text-stone-900 transition-colors"
                      >
                        {col.header}
                        <ArrowsDownUp
                          size={14}
                          weight="bold"
                          className={sortKey === col.key ? 'text-porjar-red' : 'text-stone-400'}
                        />
                      </button>
                    ) : (
                      col.header
                    )}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedData.map((item, idx) => (
                <TableRow
                  key={idx}
                  onClick={onRowClick ? () => onRowClick(item) : undefined}
                  className={`border-stone-100 transition-colors hover:bg-red-50/40 ${
                    onRowClick ? 'cursor-pointer' : ''
                  }`}
                >
                  {columns.map((col) => (
                    <TableCell
                      key={col.key}
                      className={`text-stone-800 ${col.className ?? ''}`}
                    >
                      {col.render ? col.render(item) : (item[col.key] as React.ReactNode)}
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Pagination */}
      {pagination && pagination.total_pages > 1 && (
        <div className="flex flex-col gap-2 px-1 sm:flex-row sm:items-center sm:justify-between">
          <span className="text-sm text-stone-500">
            Halaman {pagination.page} dari {pagination.total_pages} ({pagination.total} data)
          </span>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={pagination.page <= 1}
              onClick={() => onPageChange?.(pagination.page - 1)}
              className="border-stone-200 bg-white text-stone-700 hover:bg-stone-50 hover:text-stone-900 disabled:opacity-40"
            >
              Sebelumnya
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={pagination.page >= pagination.total_pages}
              onClick={() => onPageChange?.(pagination.page + 1)}
              className="border-stone-200 bg-white text-stone-700 hover:bg-stone-50 hover:text-stone-900 disabled:opacity-40"
            >
              Selanjutnya
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
