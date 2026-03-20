'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useAuthStore } from '@/store/auth-store'
import {
  ArrowLeft,
  CheckCircle,
  XCircle,
  Clock,
  GameController,
  Image as ImageIcon,
  WarningCircle,
  Notepad,
} from '@phosphor-icons/react'
import { AdminLayout } from '@/components/layouts/AdminLayout'
import { PageHeader } from '@/components/shared/PageHeader'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { api } from '@/lib/api'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import type { SubmissionData, SubmissionStatus } from '@/components/modules/submission/SubmissionCard'

interface SubmissionDetail extends SubmissionData {
  opponent_submission?: SubmissionData | null
  admin_notes?: string
  history?: SubmissionData[]
}

export default function SubmissionDetailPage() {
  const { isAuthenticated, isLoading: authLoading } = useAuthStore()
  const params = useParams()
  const router = useRouter()
  const id = params.id as string

  const [submission, setSubmission] = useState<SubmissionDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null)
  const [lightboxIndex, setLightboxIndex] = useState(0)
  const [adminNotes, setAdminNotes] = useState('')
  const [rejectReason, setRejectReason] = useState('')
  const [showRejectForm, setShowRejectForm] = useState(false)
  const [processing, setProcessing] = useState(false)

  useEffect(() => {
    if (!isAuthenticated || authLoading) return
    loadSubmission()
  }, [id, isAuthenticated, authLoading]) // eslint-disable-line react-hooks/exhaustive-deps

  async function loadSubmission() {
    try {
      const data = await api.get<SubmissionDetail>(`/admin/submissions/${id}`)
      setSubmission(data)
      setAdminNotes(data.admin_notes ?? '')
    } catch {
      toast.error('Gagal memuat data submission')
    } finally {
      setLoading(false)
    }
  }

  async function handleApprove() {
    setProcessing(true)
    try {
      await api.put(`/admin/submissions/${id}/verify`, { approved: true, admin_notes: adminNotes })
      setSubmission(prev => prev ? { ...prev, status: 'approved' } : prev)
      toast.success('Submission disetujui!')
    } catch {
      toast.error('Gagal menyetujui submission')
    } finally {
      setProcessing(false)
    }
  }

  async function handleReject() {
    if (!rejectReason.trim()) {
      toast.error('Masukkan alasan penolakan')
      return
    }
    setProcessing(true)
    try {
      await api.put(`/admin/submissions/${id}/verify`, { approved: false, rejection_reason: rejectReason, admin_notes: adminNotes })
      setSubmission(prev => prev ? { ...prev, status: 'rejected', rejection_reason: rejectReason } : prev)
      toast.success('Submission ditolak')
      setShowRejectForm(false)
    } catch {
      toast.error('Gagal menolak submission')
    } finally {
      setProcessing(false)
    }
  }

  function openLightbox(urls: string[], index: number) {
    setLightboxUrl(urls[index])
    setLightboxIndex(index)
  }

  if (loading) {
    return (
      <AdminLayout>
        <div className="space-y-4">
          <Skeleton className="h-8 w-64 bg-porjar-border" />
          <Skeleton className="h-64 rounded-xl bg-porjar-border" />
          <Skeleton className="h-48 rounded-xl bg-porjar-border" />
        </div>
      </AdminLayout>
    )
  }

  if (!submission) {
    return (
      <AdminLayout>
        <div className="rounded-xl border border-stone-200 bg-white p-10 text-center shadow-sm">
          <WarningCircle size={40} weight="duotone" className="mx-auto mb-3 text-porjar-border" />
          <p className="text-sm text-porjar-muted">Submission tidak ditemukan</p>
          <Button
            variant="ghost"
            size="sm"
            className="mt-3 text-porjar-red"
            onClick={() => router.push('/admin/submissions')}
          >
            Kembali
          </Button>
        </div>
      </AdminLayout>
    )
  }

  const allScreenshots = submission.screenshots ?? []
  const opponentScreenshots = submission.opponent_submission?.screenshots ?? []

  return (
    <AdminLayout>
      <PageHeader
        title="Detail Submission"
        breadcrumbs={[
          { label: 'Admin', href: '/admin' },
          { label: 'Verifikasi', href: '/admin/submissions' },
          { label: `#${id.slice(0, 8)}` },
        ]}
      />

      <button
        onClick={() => router.push('/admin/submissions')}
        className="mb-4 flex items-center gap-1.5 text-sm font-medium text-porjar-muted hover:text-porjar-red transition-colors"
      >
        <ArrowLeft size={16} />
        Kembali ke daftar
      </button>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Left: Submission Detail */}
        <div className="space-y-4">
          {/* Match Info Card */}
          <div className="rounded-xl border border-stone-200 bg-white p-5 shadow-sm">
            <div className="mb-4 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-porjar-red/10">
                <GameController size={22} weight="duotone" className="text-porjar-red" />
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-porjar-muted">{submission.game_name}</p>
                <span
                  className={cn(
                    'inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-medium',
                    submission.status === 'pending' && 'bg-amber-50 text-amber-700 border-amber-200',
                    submission.status === 'approved' && 'bg-green-50 text-green-700 border-green-200',
                    submission.status === 'rejected' && 'bg-red-50 text-red-700 border-red-200',
                    submission.status === 'disputed' && 'bg-purple-50 text-purple-700 border-purple-200',
                  )}
                >
                  {submission.status === 'pending' && <Clock size={12} weight="fill" />}
                  {submission.status === 'approved' && <CheckCircle size={12} weight="fill" />}
                  {submission.status === 'rejected' && <XCircle size={12} weight="fill" />}
                  {submission.status === 'disputed' && <WarningCircle size={12} weight="fill" />}
                  {submission.status.charAt(0).toUpperCase() + submission.status.slice(1)}
                </span>
              </div>
            </div>

            {/* Claimed Result */}
            <div className="rounded-lg bg-porjar-bg p-4">
              <p className="mb-1 text-xs font-semibold uppercase text-porjar-muted">Hasil yang Diklaim</p>
              {submission.match_type === 'bracket' ? (
                <>
                  <div className="flex items-center justify-center gap-4 text-lg">
                    <span className="font-bold text-porjar-text">{submission.team_a_name}</span>
                    <span className="rounded bg-white px-3 py-1 text-xl font-black text-porjar-red">
                      {submission.claimed_score_a} - {submission.claimed_score_b}
                    </span>
                    <span className="font-bold text-porjar-text">{submission.team_b_name}</span>
                  </div>
                  {submission.claimed_winner && (
                    <p className="mt-2 text-center text-sm text-porjar-muted">
                      Pemenang: <span className="font-bold text-porjar-red">{submission.claimed_winner}</span>
                    </p>
                  )}
                </>
              ) : (
                <div className="flex items-center justify-center gap-6 text-lg">
                  <div className="text-center">
                    <p className="text-3xl font-black text-porjar-red">#{submission.claimed_placement}</p>
                    <p className="text-xs text-porjar-muted">Placement</p>
                  </div>
                  <div className="text-center">
                    <p className="text-3xl font-black text-porjar-text">{submission.claimed_kills}</p>
                    <p className="text-xs text-porjar-muted">Kills</p>
                  </div>
                </div>
              )}
            </div>

            {/* Submitter info */}
            <div className="mt-4 border-t border-stone-100 pt-3 text-sm">
              <div className="flex justify-between">
                <span className="text-porjar-muted">Dikirim oleh</span>
                <span className="font-medium text-porjar-text">{submission.submitted_by}</span>
              </div>
              <div className="mt-1 flex justify-between">
                <span className="text-porjar-muted">Tim</span>
                <span className="font-medium text-porjar-text">{submission.submitted_team}</span>
              </div>
              <div className="mt-1 flex justify-between">
                <span className="text-porjar-muted">Waktu</span>
                <span className="text-porjar-text">{new Date(submission.submitted_at).toLocaleString('id-ID')}</span>
              </div>
            </div>
          </div>

          {/* Screenshots */}
          <div className="rounded-xl border border-stone-200 bg-white p-5 shadow-sm">
            <h3 className="mb-3 flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-porjar-text">
              <ImageIcon size={16} weight="duotone" className="text-porjar-red" />
              Screenshot Bukti ({allScreenshots.length})
            </h3>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {allScreenshots.map((url, i) => (
                <button
                  key={i}
                  onClick={() => openLightbox(allScreenshots, i)}
                  className="overflow-hidden rounded-lg border border-stone-200 transition-transform hover:scale-105"
                >
                  <img src={url} alt={`Screenshot ${i + 1}`} className="h-32 w-full object-cover" />
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Right: Opponent + Actions */}
        <div className="space-y-4">
          {/* Opponent submission comparison */}
          {submission.opponent_submission && (
            <div className="rounded-xl border border-blue-200 bg-blue-50/50 p-5 shadow-sm">
              <h3 className="mb-3 flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-porjar-text">
                <WarningCircle size={16} weight="duotone" className="text-blue-600" />
                Submission Lawan
              </h3>
              <div className="rounded-lg bg-white p-4">
                {submission.opponent_submission.match_type === 'bracket' ? (
                  <div className="text-center">
                    <p className="text-lg font-bold">
                      <span className="text-porjar-text">{submission.opponent_submission.team_a_name}</span>
                      <span className="mx-2 text-porjar-red">
                        {submission.opponent_submission.claimed_score_a} - {submission.opponent_submission.claimed_score_b}
                      </span>
                      <span className="text-porjar-text">{submission.opponent_submission.team_b_name}</span>
                    </p>
                    {submission.opponent_submission.claimed_winner && (
                      <p className="mt-1 text-sm text-porjar-muted">
                        Pemenang: <span className="font-bold text-porjar-red">{submission.opponent_submission.claimed_winner}</span>
                      </p>
                    )}
                  </div>
                ) : (
                  <div className="flex items-center justify-center gap-6">
                    <div className="text-center">
                      <p className="text-2xl font-black text-porjar-red">#{submission.opponent_submission.claimed_placement}</p>
                      <p className="text-xs text-porjar-muted">Placement</p>
                    </div>
                    <div className="text-center">
                      <p className="text-2xl font-black text-porjar-text">{submission.opponent_submission.claimed_kills}</p>
                      <p className="text-xs text-porjar-muted">Kills</p>
                    </div>
                  </div>
                )}
                <p className="mt-3 text-xs text-porjar-muted">
                  Oleh: {submission.opponent_submission.submitted_by} ({submission.opponent_submission.submitted_team})
                </p>
              </div>

              {/* Opponent screenshots */}
              {opponentScreenshots.length > 0 && (
                <div className="mt-3 grid grid-cols-3 gap-2">
                  {opponentScreenshots.map((url, i) => (
                    <button
                      key={i}
                      onClick={() => openLightbox(opponentScreenshots, i)}
                      className="overflow-hidden rounded-lg border border-blue-200 transition-transform hover:scale-105"
                    >
                      <img src={url} alt={`Opponent screenshot ${i + 1}`} className="h-20 w-full object-cover" />
                    </button>
                  ))}
                </div>
              )}

              {/* Match comparison indicator */}
              {submission.is_auto_matched && (
                <div className="mt-3 rounded-lg bg-green-100 p-2 text-center">
                  <p className="text-xs font-medium text-green-700">
                    Kedua tim mengirim hasil yang sama - Auto-match
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Admin notes */}
          <div className="rounded-xl border border-stone-200 bg-white p-5 shadow-sm">
            <h3 className="mb-3 flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-porjar-text">
              <Notepad size={16} weight="duotone" className="text-porjar-red" />
              Catatan Admin
            </h3>
            <textarea
              value={adminNotes}
              onChange={e => setAdminNotes(e.target.value)}
              placeholder="Tambahkan catatan untuk submission ini..."
              rows={3}
              className="w-full rounded-lg border border-stone-200 bg-porjar-bg/50 px-3 py-2 text-sm text-porjar-text placeholder:text-porjar-muted/50 focus:border-porjar-red focus:outline-none focus:ring-2 focus:ring-porjar-red/20"
            />
          </div>

          {/* Action buttons */}
          {submission.status === 'pending' && (
            <div className="rounded-xl border border-stone-200 bg-white p-5 shadow-sm">
              <h3 className="mb-3 text-sm font-bold uppercase tracking-wide text-porjar-text">Aksi</h3>
              <div className="space-y-3">
                <Button
                  onClick={handleApprove}
                  disabled={processing}
                  className="w-full bg-green-600 text-white hover:bg-green-700"
                >
                  <CheckCircle size={18} weight="bold" className="mr-2" />
                  Approve Submission
                </Button>

                {!showRejectForm ? (
                  <Button
                    variant="outline"
                    onClick={() => setShowRejectForm(true)}
                    disabled={processing}
                    className="w-full border-red-300 text-red-600 hover:bg-red-50"
                  >
                    <XCircle size={18} weight="bold" className="mr-2" />
                    Reject Submission
                  </Button>
                ) : (
                  <div className="rounded-lg border border-red-200 bg-red-50 p-3">
                    <label className="mb-1 block text-xs font-medium text-red-700">Alasan Penolakan</label>
                    <Input
                      placeholder="Masukkan alasan..."
                      value={rejectReason}
                      onChange={e => setRejectReason(e.target.value)}
                      className="mb-2 border-red-200 bg-white text-sm"
                    />
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        onClick={handleReject}
                        disabled={processing}
                        className="bg-red-600 text-white hover:bg-red-700"
                      >
                        Kirim Penolakan
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => { setShowRejectForm(false); setRejectReason('') }}
                      >
                        Batal
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Rejection reason display */}
          {submission.status === 'rejected' && submission.rejection_reason && (
            <div className="rounded-xl border border-red-200 bg-red-50 p-5 shadow-sm">
              <h3 className="mb-2 text-sm font-bold text-red-700">Alasan Penolakan</h3>
              <p className="text-sm text-red-600">{submission.rejection_reason}</p>
            </div>
          )}

          {/* History */}
          {submission.history && submission.history.length > 0 && (
            <div className="rounded-xl border border-stone-200 bg-white p-5 shadow-sm">
              <h3 className="mb-3 text-sm font-bold uppercase tracking-wide text-porjar-text">
                Riwayat Submission Match Ini
              </h3>
              <div className="space-y-2">
                {submission.history.map((hist, i) => (
                  <div
                    key={hist.id}
                    className="flex items-center justify-between rounded-lg border border-stone-100 bg-porjar-bg/50 p-3"
                  >
                    <div className="text-xs">
                      <p className="font-medium text-porjar-text">{hist.submitted_by}</p>
                      <p className="text-porjar-muted">{new Date(hist.submitted_at).toLocaleString('id-ID')}</p>
                    </div>
                    <span
                      className={cn(
                        'rounded-full border px-2 py-0.5 text-[10px] font-medium',
                        hist.status === 'approved' && 'bg-green-50 text-green-700 border-green-200',
                        hist.status === 'rejected' && 'bg-red-50 text-red-700 border-red-200',
                        hist.status === 'pending' && 'bg-amber-50 text-amber-700 border-amber-200',
                        hist.status === 'disputed' && 'bg-purple-50 text-purple-700 border-purple-200',
                      )}
                    >
                      {hist.status}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

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
