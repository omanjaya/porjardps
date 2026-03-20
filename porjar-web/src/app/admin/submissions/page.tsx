'use client'

import { Suspense } from 'react'
import { useState, useEffect } from 'react'
import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import {
  CheckCircle,
  XCircle,
  Clock,
  Funnel,
  MagnifyingGlass,
  Lightning,
  Image as ImageIcon,
  GameController,
  WarningCircle,
} from '@phosphor-icons/react'
import { AdminLayout } from '@/components/layouts/AdminLayout'
import { PageHeader } from '@/components/shared/PageHeader'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { api } from '@/lib/api'
import { toast } from 'sonner'
import { useAuthStore } from '@/store/auth-store'
import { cn } from '@/lib/utils'
import type { SubmissionData, SubmissionStatus } from '@/components/modules/submission/SubmissionCard'

type FilterTab = SubmissionStatus | 'all'

const tabs: { value: FilterTab; label: string }[] = [
  { value: 'pending', label: 'Pending' },
  { value: 'approved', label: 'Approved' },
  { value: 'rejected', label: 'Rejected' },
  { value: 'disputed', label: 'Disputed' },
  { value: 'all', label: 'Semua' },
]

function AdminSubmissionsContent() {
  const { isAuthenticated, isLoading: authLoading } = useAuthStore()
  const router = useRouter()
  const searchParams = useSearchParams()
  const pathname = usePathname()
  const [submissions, setSubmissions] = useState<SubmissionData[]>([])
  const filter = (searchParams.get('status') as FilterTab) || 'pending'
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [rejectId, setRejectId] = useState<string | null>(null)
  const [rejectReason, setRejectReason] = useState('')
  const [processing, setProcessing] = useState<string | null>(null)
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null)

  function setFilter(value: FilterTab) {
    const params = new URLSearchParams(searchParams.toString())
    if (value === 'pending') {
      params.delete('status')
    } else {
      params.set('status', value)
    }
    router.replace(`${pathname}?${params.toString()}`)
  }

  useEffect(() => {
    if (!isAuthenticated || authLoading) return
    loadSubmissions()
  }, [isAuthenticated, authLoading])

  async function loadSubmissions() {
    try {
      const data = await api.get<SubmissionData[]>('/admin/submissions')
      setSubmissions(data ?? [])
    } catch {
      toast.error('Gagal memuat submissions')
    } finally {
      setLoading(false)
    }
  }

  const filtered = submissions.filter(s => {
    if (filter !== 'all' && s.status !== filter) return false
    if (search) {
      const q = search.toLowerCase()
      return (
        (s.team_a_name?.toLowerCase() ?? '').includes(q) ||
        (s.team_b_name?.toLowerCase() ?? '').includes(q) ||
        (s.submitted_by?.toLowerCase() ?? '').includes(q) ||
        (s.game_name?.toLowerCase() ?? '').includes(q)
      )
    }
    return true
  })

  async function handleApprove(id: string) {
    setProcessing(id)
    try {
      await api.put(`/admin/submissions/${id}/verify`, { approved: true })
      setSubmissions(prev => prev.map(s => s.id === id ? { ...s, status: 'approved' as SubmissionStatus } : s))
      toast.success('Submission disetujui!')
    } catch {
      toast.error('Gagal menyetujui submission')
    } finally {
      setProcessing(null)
    }
  }

  async function handleReject(id: string) {
    if (!rejectReason.trim()) {
      toast.error('Masukkan alasan penolakan')
      return
    }
    setProcessing(id)
    try {
      await api.put(`/admin/submissions/${id}/verify`, { approved: false, rejection_reason: rejectReason })
      setSubmissions(prev => prev.map(s => s.id === id ? { ...s, status: 'rejected' as SubmissionStatus, rejection_reason: rejectReason } : s))
      toast.success('Submission ditolak')
      setRejectId(null)
      setRejectReason('')
    } catch {
      toast.error('Gagal menolak submission')
    } finally {
      setProcessing(null)
    }
  }

  const pendingCount = submissions.filter(s => s.status === 'pending').length

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

      {/* Tabs */}
      <div className="mb-4 flex flex-wrap items-center gap-2 border-b border-stone-200 pb-3">
        {tabs.map(tab => (
          <button
            key={tab.value}
            onClick={() => setFilter(tab.value)}
            className={cn(
              'rounded-lg px-3 py-1.5 text-sm font-medium transition-colors',
              filter === tab.value
                ? 'bg-porjar-red/10 text-porjar-red'
                : 'text-porjar-muted hover:text-porjar-text hover:bg-porjar-bg'
            )}
          >
            {tab.label}
            {tab.value === 'pending' && pendingCount > 0 && (
              <span className="ml-1.5 rounded-full bg-porjar-red px-1.5 py-0.5 text-[10px] font-bold text-white">
                {pendingCount}
              </span>
            )}
          </button>
        ))}

        <div className="ml-auto flex items-center gap-2">
          <div className="relative">
            <MagnifyingGlass size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-porjar-muted" />
            <Input
              placeholder="Cari tim atau pemain..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="h-8 w-48 pl-9 text-sm border-stone-200 focus:border-porjar-red focus:ring-porjar-red/20"
            />
          </div>
        </div>
      </div>

      {/* Submissions list */}
      {loading ? (
        <div className="space-y-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-48 rounded-xl bg-porjar-border" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-xl border border-stone-200 bg-white p-10 text-center shadow-sm">
          <CheckCircle size={40} weight="duotone" className="mx-auto mb-3 text-porjar-border" />
          <p className="text-sm text-porjar-muted">
            {filter === 'pending' ? 'Tidak ada submission pending' : 'Tidak ada submission ditemukan'}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filtered.map(sub => (
            <div
              key={sub.id}
              className="rounded-xl border border-stone-200 bg-white p-5 shadow-sm"
            >
              {/* Header */}
              <div className="mb-4 flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-porjar-red/10">
                    <GameController size={22} weight="duotone" className="text-porjar-red" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold uppercase tracking-wider text-porjar-muted">
                        {sub.game_name}
                      </span>
                      {sub.is_auto_matched && (
                        <span
                          className="-skew-x-2 rounded bg-blue-100 px-1.5 py-0.5 text-[10px] font-bold uppercase text-blue-700 cursor-help"
                          title="Kedua tim mengirim skor yang sama — dapat di-approve otomatis"
                        >
                          Auto-match
                        </span>
                      )}
                    </div>
                    {sub.match_type === 'bracket' ? (
                      <p className="text-sm font-bold text-porjar-text">
                        {sub.team_a_name} <span className="text-porjar-red">{sub.claimed_score_a} - {sub.claimed_score_b}</span> {sub.team_b_name}
                      </p>
                    ) : (
                      <p className="text-sm font-bold text-porjar-text">
                        {sub.submitted_team} - Placement #{sub.claimed_placement}, {sub.claimed_kills} kills
                      </p>
                    )}
                  </div>
                </div>

                <div className="text-right text-xs text-porjar-muted">
                  <p>Oleh: <span className="font-medium text-porjar-text">{sub.submitted_by}</span></p>
                  <p>{sub.submitted_team}</p>
                  <p className="mt-0.5 text-[10px]">{new Date(sub.submitted_at).toLocaleString('id-ID')}</p>
                </div>
              </div>

              {/* Screenshots */}
              {(sub.screenshots ?? []).length > 0 && (
                <div className="mb-4 flex gap-2 overflow-x-auto pb-1">
                  {(sub.screenshots ?? []).map((url, i) => (
                    <button
                      key={i}
                      onClick={() => setLightboxUrl(url)}
                      className="shrink-0 overflow-hidden rounded-lg border border-stone-200 transition-transform hover:scale-105"
                    >
                      <img
                        src={url}
                        alt={`Bukti screenshot ${i + 1} dari ${sub.team_a_name} vs ${sub.team_b_name}`}
                        className="h-20 w-28 object-cover"
                        onError={(e) => {
                          e.currentTarget.src = ''
                          e.currentTarget.className = 'h-20 w-28 bg-stone-100 flex items-center justify-center'
                        }}
                      />
                    </button>
                  ))}
                </div>
              )}

              {/* Actions */}
              {sub.status === 'pending' && (
                <div className="flex items-center gap-2 border-t border-stone-100 pt-3">
                  {sub.is_auto_matched && (
                    <span className="mr-2 flex items-center gap-1 text-xs text-blue-600">
                      <Lightning size={12} weight="fill" />
                      Kedua tim mengirim hasil yang sama
                    </span>
                  )}
                  <div className="ml-auto flex items-center gap-2">
                    <Button
                      size="sm"
                      onClick={() => handleApprove(sub.id)}
                      disabled={processing === sub.id}
                      className="bg-green-600 text-white hover:bg-green-700"
                    >
                      {processing === sub.id ? (
                        <span className="inline-flex items-center gap-1.5">
                          <svg className="h-3.5 w-3.5 animate-spin" viewBox="0 0 24 24" fill="none">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                          </svg>
                          Memproses...
                        </span>
                      ) : (
                        <>
                          <CheckCircle size={16} weight="bold" className="mr-1" />
                          Approve
                        </>
                      )}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setRejectId(rejectId === sub.id ? null : sub.id)}
                      disabled={processing === sub.id}
                      className="border-red-300 text-red-600 hover:bg-red-50"
                    >
                      {processing === sub.id ? (
                        <span className="inline-flex items-center gap-1.5">
                          <svg className="h-3.5 w-3.5 animate-spin" viewBox="0 0 24 24" fill="none">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                          </svg>
                          Memproses...
                        </span>
                      ) : (
                        <>
                          <XCircle size={16} weight="bold" className="mr-1" />
                          Reject
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              )}

              {/* Status for non-pending */}
              {sub.status !== 'pending' && (
                <div className="flex items-center gap-2 border-t border-stone-100 pt-3">
                  <span
                    className={cn(
                      'inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-medium',
                      sub.status === 'approved' && 'bg-green-50 text-green-700 border-green-200',
                      sub.status === 'rejected' && 'bg-red-50 text-red-700 border-red-200',
                      sub.status === 'disputed' && 'bg-purple-50 text-purple-700 border-purple-200',
                    )}
                  >
                    {sub.status === 'approved' && <CheckCircle size={12} weight="fill" />}
                    {sub.status === 'rejected' && <XCircle size={12} weight="fill" />}
                    {sub.status === 'disputed' && <WarningCircle size={12} weight="fill" />}
                    {sub.status.charAt(0).toUpperCase() + sub.status.slice(1)}
                  </span>
                  {sub.rejection_reason && (
                    <span className="text-xs text-porjar-muted">Alasan: {sub.rejection_reason}</span>
                  )}
                  <button
                    onClick={() => router.push(`/admin/submissions/${sub.id}`)}
                    className="ml-auto text-xs font-medium text-porjar-red hover:underline"
                  >
                    Detail &rarr;
                  </button>
                </div>
              )}

              {/* Reject dialog */}
              {rejectId === sub.id && (
                <div className="mt-3 rounded-lg border border-red-200 bg-red-50 p-3">
                  <label className="mb-1 block text-xs font-medium text-red-700">Alasan Penolakan</label>
                  <Input
                    placeholder="Masukkan alasan penolakan..."
                    value={rejectReason}
                    onChange={e => setRejectReason(e.target.value)}
                    className="mb-2 border-red-200 bg-white text-sm focus:border-red-400 focus:ring-red-400/20"
                  />
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      onClick={() => handleReject(sub.id)}
                      disabled={processing === sub.id}
                      className="bg-red-600 text-white hover:bg-red-700"
                    >
                      Kirim Penolakan
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => { setRejectId(null); setRejectReason('') }}
                    >
                      Batal
                    </Button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Lightbox */}
      {lightboxUrl && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 p-4"
          onClick={() => setLightboxUrl(null)}
        >
          <div className="relative max-h-[90vh] max-w-[90vw]">
            <img
              src={lightboxUrl}
              alt="Screenshot"
              className="max-h-[85vh] max-w-full rounded-lg object-contain"
            />
            <button
              onClick={() => setLightboxUrl(null)}
              className="absolute -right-3 -top-3 flex h-8 w-8 items-center justify-center rounded-full bg-white text-porjar-text shadow-lg hover:bg-stone-100"
            >
              &times;
            </button>
          </div>
        </div>
      )}
    </AdminLayout>
  )
}

export default function AdminSubmissionsPage() {
  return (
    <Suspense fallback={
      <div className="space-y-4 p-6">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-48 rounded-xl bg-porjar-border" />
        ))}
      </div>
    }>
      <AdminSubmissionsContent />
    </Suspense>
  )
}
