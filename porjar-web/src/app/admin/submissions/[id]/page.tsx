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
  ShieldWarning,
  Warning,
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
import type { MatchCard } from '@/types/referee'

interface SubmissionDetail extends SubmissionData {
  opponent_submission?: SubmissionData | null
  admin_notes?: string
  history?: SubmissionData[]
  kills_p1?: number
  kills_p2?: number
  kills_p3?: number
  kills_p4?: number
}

export default function SubmissionDetailPage() {
  const { isAuthenticated, isLoading: authLoading, user } = useAuthStore()
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
  const [matchCards, setMatchCards] = useState<MatchCard[]>([])

  useEffect(() => {
    if (authLoading) return
    if (!isAuthenticated || !user || (user.role !== 'admin' && user.role !== 'superadmin')) {
      router.push('/login')
      return
    }
    loadSubmission()
  }, [id, isAuthenticated, authLoading, user]) // eslint-disable-line react-hooks/exhaustive-deps

  // Fetch cards for this match once submission is loaded
  useEffect(() => {
    if (!submission?.match_id) return
    api.get<MatchCard[]>(`/matches/${submission.match_id}/cards`).then(setMatchCards).catch(() => {})
  }, [submission?.match_id])

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
          <Skeleton className="h-8 w-64 bg-esi-border" />
          <Skeleton className="h-64 rounded-xl bg-esi-border" />
          <Skeleton className="h-48 rounded-xl bg-esi-border" />
        </div>
      </AdminLayout>
    )
  }

  if (!submission) {
    return (
      <AdminLayout>
        <div className="rounded-xl border border-stone-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 p-10 text-center shadow-sm">
          <WarningCircle size={40} weight="duotone" className="mx-auto mb-3 text-esi-border" />
          <p className="text-sm text-esi-muted">Submission tidak ditemukan</p>
          <Button
            variant="ghost"
            size="sm"
            className="mt-3 text-esi-red"
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
        className="mb-4 flex items-center gap-1.5 text-sm font-medium text-esi-muted hover:text-esi-red transition-colors"
      >
        <ArrowLeft size={16} />
        Kembali ke daftar
      </button>

      {/* Cards warning banner */}
      {matchCards.length > 0 && (() => {
        const activeCards = matchCards.filter((c) => !c.is_revoked)
        if (activeCards.length === 0) return null
        const yellowCount = activeCards.filter((c) => c.card_type === 'yellow').length
        const redCount = activeCards.filter((c) => c.card_type === 'red').length
        const totalDeduction = activeCards.reduce((sum, c) => sum + c.point_deduction, 0)
        return (
          <div className="mb-4 rounded-xl border border-amber-200 dark:border-amber-800/50 bg-amber-50 dark:bg-amber-950/30 p-4 shadow-sm">
            <div className="flex items-start gap-3">
              <ShieldWarning size={22} weight="fill" className="shrink-0 text-amber-600 dark:text-amber-400 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-semibold text-amber-900 dark:text-amber-200">
                  Match ini memiliki {activeCards.length} kartu yang dikeluarkan
                </p>
                <div className="mt-1.5 flex flex-wrap items-center gap-2">
                  {yellowCount > 0 && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-yellow-200 dark:bg-yellow-900/50 px-2 py-0.5 text-[11px] font-bold text-yellow-800 dark:text-yellow-300">
                      <Warning size={12} weight="fill" />
                      {yellowCount} Kuning
                    </span>
                  )}
                  {redCount > 0 && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-red-200 dark:bg-red-900/50 px-2 py-0.5 text-[11px] font-bold text-red-800 dark:text-red-300">
                      <Warning size={12} weight="fill" />
                      {redCount} Merah
                    </span>
                  )}
                  <span className="text-xs font-medium text-amber-700 dark:text-amber-300">
                    Total: -{totalDeduction} poin
                  </span>
                </div>
                <div className="mt-2 space-y-1">
                  {activeCards.map((card) => (
                    <p key={card.id} className="text-xs text-amber-800 dark:text-amber-300">
                      <span className="font-semibold">{card.team_name}:</span> {card.reason}
                    </p>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )
      })()}

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Left: Submission Detail */}
        <div className="space-y-4">
          {/* Match Info Card */}
          <div className="rounded-xl border border-stone-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 p-5 shadow-sm">
            <div className="mb-4 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-esi-red/10">
                <GameController size={22} weight="duotone" className="text-esi-red" />
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-esi-muted">{submission.game_name}</p>
                <span
                  className={cn(
                    'inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-medium',
                    submission.status === 'pending' && 'bg-amber-50 dark:bg-amber-950/30 text-amber-700 border-amber-200',
                    submission.status === 'approved' && 'bg-green-50 dark:bg-green-950/30 text-green-700 border-green-200',
                    submission.status === 'rejected' && 'bg-red-50 dark:bg-red-950/30 text-red-700 border-red-200',
                    submission.status === 'disputed' && 'bg-purple-50 dark:bg-purple-950/30 text-purple-700 border-purple-200',
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
            <div className="rounded-lg bg-esi-bg p-4">
              <p className="mb-1 text-xs font-semibold uppercase text-esi-muted">Hasil yang Diklaim</p>
              {submission.match_type === 'bracket' ? (
                <>
                  <div className="flex items-center justify-center gap-4 text-lg">
                    <span className="font-bold text-esi-text">{submission.team_a_name}</span>
                    <span className="rounded bg-white dark:bg-zinc-900 px-3 py-1 text-xl font-black text-esi-red">
                      {submission.claimed_score_a} - {submission.claimed_score_b}
                    </span>
                    <span className="font-bold text-esi-text">{submission.team_b_name}</span>
                  </div>
                  {submission.claimed_winner && (
                    <p className="mt-2 text-center text-sm text-esi-muted">
                      Pemenang: <span className="font-bold text-esi-red">{submission.claimed_winner}</span>
                    </p>
                  )}
                </>
              ) : (
                <div className="space-y-3">
                  <div className="flex items-center justify-center gap-6">
                    <div className="text-center">
                      <p className="text-3xl font-black text-esi-red">#{submission.claimed_placement}</p>
                      <p className="text-xs text-esi-muted">Placement</p>
                    </div>
                    <div className="text-center">
                      <p className="text-3xl font-black text-esi-text">{submission.claimed_kills}</p>
                      <p className="text-xs text-esi-muted">Total Kills</p>
                    </div>
                  </div>
                  {/* Per-player kills breakdown */}
                  <div className="grid grid-cols-4 gap-2 rounded-lg bg-esi-bg/60 p-2">
                    {[submission.kills_p1, submission.kills_p2, submission.kills_p3, submission.kills_p4].map((k, i) => (
                      <div key={i} className="text-center">
                        <p className="text-lg font-bold text-esi-text">{k ?? 0}</p>
                        <p className="text-[10px] text-esi-muted">P{i + 1}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Submitter info */}
            <div className="mt-4 border-t border-stone-100 dark:border-zinc-700 pt-3 text-sm">
              <div className="flex justify-between">
                <span className="text-esi-muted">Dikirim oleh</span>
                <span className="font-medium text-esi-text">{submission.submitted_by}</span>
              </div>
              <div className="mt-1 flex justify-between">
                <span className="text-esi-muted">Tim</span>
                <span className="font-medium text-esi-text">{submission.submitted_team}</span>
              </div>
              <div className="mt-1 flex justify-between">
                <span className="text-esi-muted">Waktu</span>
                <span className="text-esi-text">{new Date(submission.submitted_at).toLocaleString('id-ID')}</span>
              </div>
            </div>
          </div>

          {/* Screenshots */}
          <div className="rounded-xl border border-stone-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 p-5 shadow-sm">
            <h3 className="mb-3 flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-esi-text">
              <ImageIcon size={16} weight="duotone" className="text-esi-red" />
              Screenshot Bukti ({allScreenshots.length})
            </h3>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {allScreenshots.map((url, i) => (
                <button
                  key={i}
                  onClick={() => openLightbox(allScreenshots, i)}
                  className="overflow-hidden rounded-lg border border-stone-200 dark:border-zinc-700 transition-transform hover:scale-105"
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
            <div className="rounded-xl border border-blue-200 bg-blue-50 dark:bg-blue-950/30 p-5 shadow-sm">
              <h3 className="mb-3 flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-esi-text">
                <WarningCircle size={16} weight="duotone" className="text-blue-600" />
                Submission Lawan
              </h3>
              <div className="rounded-lg bg-white dark:bg-zinc-900 p-4">
                {submission.opponent_submission.match_type === 'bracket' ? (
                  <div className="text-center">
                    <p className="text-lg font-bold">
                      <span className="text-esi-text">{submission.opponent_submission.team_a_name}</span>
                      <span className="mx-2 text-esi-red">
                        {submission.opponent_submission.claimed_score_a} - {submission.opponent_submission.claimed_score_b}
                      </span>
                      <span className="text-esi-text">{submission.opponent_submission.team_b_name}</span>
                    </p>
                    {submission.opponent_submission.claimed_winner && (
                      <p className="mt-1 text-sm text-esi-muted">
                        Pemenang: <span className="font-bold text-esi-red">{submission.opponent_submission.claimed_winner}</span>
                      </p>
                    )}
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div className="flex items-center justify-center gap-6">
                      <div className="text-center">
                        <p className="text-2xl font-black text-esi-red">#{submission.opponent_submission.claimed_placement}</p>
                        <p className="text-xs text-esi-muted">Placement</p>
                      </div>
                      <div className="text-center">
                        <p className="text-2xl font-black text-esi-text">{submission.opponent_submission.claimed_kills}</p>
                        <p className="text-xs text-esi-muted">Total Kills</p>
                      </div>
                    </div>
                    <div className="grid grid-cols-4 gap-1 rounded-lg bg-white/50 dark:bg-zinc-900/50 p-2">
                      {[submission.opponent_submission?.kills_p1 ?? 0, submission.opponent_submission?.kills_p2 ?? 0, submission.opponent_submission?.kills_p3 ?? 0, submission.opponent_submission?.kills_p4 ?? 0].map((k, i) => (
                        <div key={i} className="text-center">
                          <p className="text-sm font-bold text-esi-text">{k}</p>
                          <p className="text-[10px] text-esi-muted">P{i + 1}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                <p className="mt-3 text-xs text-esi-muted">
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
          <div className="rounded-xl border border-stone-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 p-5 shadow-sm">
            <h3 className="mb-3 flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-esi-text">
              <Notepad size={16} weight="duotone" className="text-esi-red" />
              Catatan Admin
            </h3>
            <textarea
              value={adminNotes}
              onChange={e => setAdminNotes(e.target.value)}
              maxLength={500}
              placeholder="Tambahkan catatan untuk submission ini..."
              rows={3}
              className="w-full rounded-lg border border-stone-200 dark:border-zinc-700 bg-esi-bg/50 px-3 py-2 text-sm text-esi-text placeholder:text-esi-muted/50 focus:border-esi-red focus:outline-none focus:ring-2 focus:ring-esi-red/20"
            />
          </div>

          {/* Action buttons */}
          {submission.status === 'pending' && (
            <div className="rounded-xl border border-stone-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 p-5 shadow-sm">
              <h3 className="mb-3 text-sm font-bold uppercase tracking-wide text-esi-text">Aksi</h3>
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
                    className="w-full border-red-300 text-red-600 hover:bg-red-50 dark:bg-red-950/30"
                  >
                    <XCircle size={18} weight="bold" className="mr-2" />
                    Reject Submission
                  </Button>
                ) : (
                  <div className="rounded-lg border border-red-200 bg-red-50 dark:bg-red-950/30 p-3">
                    <label className="mb-1 block text-xs font-medium text-red-700">Alasan Penolakan</label>
                    <Input
                      placeholder="Masukkan alasan..."
                      value={rejectReason}
                      onChange={e => setRejectReason(e.target.value)}
                      className="mb-2 border-red-200 bg-white dark:bg-zinc-900 text-sm"
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
            <div className="rounded-xl border border-red-200 bg-red-50 dark:bg-red-950/30 p-5 shadow-sm">
              <h3 className="mb-2 text-sm font-bold text-red-700">Alasan Penolakan</h3>
              <p className="text-sm text-red-600">{submission.rejection_reason}</p>
            </div>
          )}

          {/* History */}
          {submission.history && submission.history.length > 0 && (
            <div className="rounded-xl border border-stone-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 p-5 shadow-sm">
              <h3 className="mb-3 text-sm font-bold uppercase tracking-wide text-esi-text">
                Riwayat Submission Match Ini
              </h3>
              <div className="space-y-2">
                {submission.history.filter(Boolean).map((hist, i) => (
                  <div
                    key={hist.id}
                    className="flex items-center justify-between rounded-lg border border-stone-100 dark:border-zinc-700 bg-esi-bg/50 p-3"
                  >
                    <div className="text-xs">
                      <p className="font-medium text-esi-text">{hist.submitted_by}</p>
                      <p className="text-esi-muted">{new Date(hist.submitted_at).toLocaleString('id-ID')}</p>
                    </div>
                    <span
                      className={cn(
                        'rounded-full border px-2 py-0.5 text-[10px] font-medium',
                        hist.status === 'approved' && 'bg-green-50 dark:bg-green-950/30 text-green-700 border-green-200',
                        hist.status === 'rejected' && 'bg-red-50 dark:bg-red-950/30 text-red-700 border-red-200',
                        hist.status === 'pending' && 'bg-amber-50 dark:bg-amber-950/30 text-amber-700 border-amber-200',
                        hist.status === 'disputed' && 'bg-purple-50 dark:bg-purple-950/30 text-purple-700 border-purple-200',
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
              className="absolute -right-3 -top-3 flex h-8 w-8 items-center justify-center rounded-full bg-white dark:bg-zinc-900 text-esi-text shadow-lg hover:bg-stone-100 dark:hover:bg-zinc-700 dark:bg-zinc-800"
            >
              &times;
            </button>
          </div>
        </div>
      )}
    </AdminLayout>
  )
}
