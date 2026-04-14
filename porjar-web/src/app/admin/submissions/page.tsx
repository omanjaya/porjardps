'use client'

import { Suspense, useState } from 'react'
import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import { AdminLayout } from '@/components/layouts/AdminLayout'
import { PageHeader } from '@/components/shared/PageHeader'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import type { FilterTab } from './components/SubmissionStatusBadge'
import { SubmissionsFilterBar } from './components/SubmissionsFilterBar'
import { SubmissionsTable } from './components/SubmissionsTable'
import { SubmissionDetailSheet } from './components/SubmissionDetailSheet'
import { SubmissionLightbox } from './components/SubmissionLightbox'
import { usePaginatedSubmissions } from './hooks/usePaginatedSubmissions'
import { useSubmissionActions } from './hooks/useSubmissionActions'

export type { AdminSubmissionData } from './components/SubmissionStatusBadge'

function AdminSubmissionsContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const pathname = usePathname()
  const filter = (searchParams.get('status') as FilterTab) || 'pending'
  const [search, setSearch] = useState('')
  const [gameFilter, setGameFilter] = useState<string>('')
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null)
  const [detailId, setDetailId] = useState<string | null>(null)

  const { setSubmissions, loading, filtered, gameNames, pendingCount, reload } =
    usePaginatedSubmissions(filter, gameFilter, search)

  const {
    processing,
    bulkProcessing,
    rejectId,
    setRejectId,
    rejectReason,
    setRejectReason,
    selectedIds,
    setSelectedIds,
    handleApprove,
    handleReject,
    handleBulkApprove,
    handleSheetVerified,
  } = useSubmissionActions(setSubmissions, reload)

  function setFilter(value: FilterTab) {
    const params = new URLSearchParams(searchParams.toString())
    if (value === 'pending') {
      params.delete('status')
    } else {
      params.set('status', value)
    }
    router.replace(`${pathname}?${params.toString()}`)
  }

  return (
    <AdminLayout>
      <PageHeader
        title="Verifikasi Hasil"
        description={`${pendingCount} submission menunggu verifikasi`}
        breadcrumbs={[
          { label: 'Admin', href: '/admin' },
          { label: 'Verifikasi Hasil' },
        ]}
      />

      <SubmissionsFilterBar
        filter={filter}
        setFilter={setFilter}
        search={search}
        setSearch={setSearch}
        gameFilter={gameFilter}
        setGameFilter={setGameFilter}
        gameNames={gameNames}
        pendingCount={pendingCount}
      />

      <SubmissionsTable
        loading={loading}
        filtered={filtered}
        filter={filter}
        selectedIds={selectedIds}
        setSelectedIds={setSelectedIds}
        processing={processing}
        rejectId={rejectId}
        setRejectId={setRejectId}
        rejectReason={rejectReason}
        setRejectReason={setRejectReason}
        onApprove={handleApprove}
        onReject={handleReject}
        onOpenDetail={setDetailId}
        onOpenLightbox={setLightboxUrl}
      />

      {/* Bulk action bar */}
      {selectedIds.size > 0 && (
        <div className="sticky bottom-4 z-30 mx-auto w-fit rounded-xl border border-green-200 dark:border-green-800 bg-white dark:bg-zinc-900 px-4 py-2 shadow-lg flex items-center gap-3">
          <span className="text-sm font-semibold text-esi-text">{selectedIds.size} dipilih</span>
          <Button size="sm" onClick={handleBulkApprove} disabled={bulkProcessing} className="bg-green-600 hover:bg-green-700 text-white">
            {bulkProcessing ? 'Memproses...' : 'Approve Semua'}
          </Button>
          <Button size="sm" variant="outline" onClick={() => setSelectedIds(new Set())}>
            Batal
          </Button>
        </div>
      )}

      <SubmissionLightbox url={lightboxUrl} onClose={() => setLightboxUrl(null)} zIndex={100} />

      <SubmissionDetailSheet
        open={!!detailId}
        id={detailId}
        onOpenChange={(o) => { if (!o) setDetailId(null) }}
        onSuccess={handleSheetVerified}
      />
    </AdminLayout>
  )
}

export default function AdminSubmissionsPage() {
  return (
    <Suspense fallback={
      <div className="space-y-4 p-6">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-48 rounded-xl bg-esi-border" />
        ))}
      </div>
    }>
      <AdminSubmissionsContent />
    </Suspense>
  )
}
