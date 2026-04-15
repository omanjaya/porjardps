'use client'

import { useEffect, useState } from 'react'
import {
  CheckCircle,
  XCircle,
  Image as ImageIcon,
  GameController,
  X,
  Sword,
  Trophy,
  Notepad,
  ShieldWarning,
} from '@phosphor-icons/react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { api, resolveMediaUrl } from '@/lib/api'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { SubmissionLightbox } from './SubmissionLightbox'
import { statusConfig, type AdminSubmissionData } from './SubmissionStatusBadge'

export function SubmissionDetailSheet({
  open,
  id,
  onOpenChange,
  onSuccess,
}: {
  open: boolean
  id: string | null
  onOpenChange: (open: boolean) => void
  onSuccess: (id: string, status: 'approved' | 'rejected', reason?: string, adminNotes?: string) => void
}) {
  const [sub, setSub] = useState<AdminSubmissionData | null>(null)
  const [loading, setLoading] = useState(true)
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null)
  const [rejectReason, setRejectReason] = useState('')
  const [showRejectForm, setShowRejectForm] = useState(false)
  const [processing, setProcessing] = useState(false)
  const [adminNotes, setAdminNotes] = useState('')

  useEffect(() => {
    if (!open || !id) return
    setLoading(true)
    setSub(null)
    setShowRejectForm(false)
    setRejectReason('')
    api.get<AdminSubmissionData>(`/admin/submissions/${id}`)
      .then(data => {
        setSub(data)
        setAdminNotes(data.admin_notes ?? '')
      })
      .catch(() => toast.error('Gagal memuat detail'))
      .finally(() => setLoading(false))
  }, [id, open])

  if (!open || !id) return null

  function onClose() {
    onOpenChange(false)
  }

  async function handleApprove() {
    if (!sub || !id) return
    setProcessing(true)
    try {
      await api.put(`/admin/submissions/${id}/verify`, { approved: true, admin_notes: adminNotes })
      onSuccess(id, 'approved', undefined, adminNotes)
      toast.success('Submission disetujui!')
      onClose()
    } catch {
      toast.error('Gagal menyetujui')
    } finally {
      setProcessing(false)
    }
  }

  async function handleReject() {
    if (!id) return
    if (!rejectReason.trim()) { toast.error('Masukkan alasan penolakan'); return }
    setProcessing(true)
    try {
      await api.put(`/admin/submissions/${id}/verify`, { approved: false, rejection_reason: rejectReason, admin_notes: adminNotes })
      onSuccess(id, 'rejected', rejectReason, adminNotes)
      toast.success('Submission ditolak')
      onClose()
    } catch {
      toast.error('Gagal menolak submission')
    } finally {
      setProcessing(false)
    }
  }

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Sheet panel */}
      <div className="fixed right-0 top-0 z-50 h-full w-full max-w-xl overflow-y-auto bg-white dark:bg-zinc-900 shadow-2xl flex flex-col">
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-stone-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-5 py-4">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-esi-red/10">
              <GameController size={18} weight="duotone" className="text-esi-red" />
            </div>
            <span className="font-bold text-esi-text">Detail Submission</span>
          </div>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-esi-muted hover:bg-stone-100 dark:hover:bg-zinc-800 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {loading ? (
          <div className="p-5 space-y-4">
            <Skeleton className="h-32 rounded-xl bg-esi-border" />
            <Skeleton className="h-24 rounded-xl bg-esi-border" />
            <Skeleton className="h-16 rounded-xl bg-esi-border" />
          </div>
        ) : !sub ? (
          <div className="flex flex-1 items-center justify-center p-10 text-sm text-esi-muted">
            Submission tidak ditemukan
          </div>
        ) : (
          <div className="flex-1 space-y-4 p-5">
            {/* Match Result */}
            <div className="rounded-xl border border-stone-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 p-4 shadow-sm">
              <div className="mb-3 flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-esi-muted">{sub.game_name}</span>
                {(() => {
                  const cfg = statusConfig[sub.status]
                  const Icon = cfg.icon
                  return (
                    <span className={cn('inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-medium', cfg.cls)}>
                      <Icon size={12} weight="fill" />{cfg.label}
                    </span>
                  )
                })()}
              </div>

              <div className="rounded-lg bg-esi-bg p-4">
                <p className="mb-2 text-center text-xs font-semibold uppercase text-esi-muted">Hasil Diklaim</p>
                {sub.match_type === 'bracket' || sub.match_type === 'group' ? (
                  <div className="flex items-center justify-center gap-3 text-base">
                    <span className="font-bold text-esi-text flex-1 text-right truncate">{sub.team_a_name}</span>
                    <span className="shrink-0 rounded bg-white dark:bg-zinc-900 px-3 py-1 text-xl font-black text-esi-red shadow">
                      {sub.claimed_score_a ?? '?'} – {sub.claimed_score_b ?? '?'}
                    </span>
                    <span className="font-bold text-esi-text flex-1 text-left truncate">{sub.team_b_name}</span>
                  </div>
                ) : (
                  <div className="flex items-center justify-center gap-8">
                    <div className="text-center">
                      <p className="text-3xl font-black text-esi-red">#{sub.claimed_placement ?? '?'}</p>
                      <div className="flex items-center gap-1 justify-center mt-0.5">
                        <Trophy size={12} className="text-esi-muted" />
                        <p className="text-xs text-esi-muted">Placement</p>
                      </div>
                    </div>
                    <div className="text-center">
                      <p className="text-3xl font-black text-esi-text">{sub.claimed_kills ?? 0}</p>
                      <div className="flex items-center gap-1 justify-center mt-0.5">
                        <Sword size={12} className="text-esi-muted" />
                        <p className="text-xs text-esi-muted">Kills</p>
                      </div>
                    </div>
                  </div>
                )}
                {sub.claimed_winner && (
                  <p className="mt-2 text-center text-xs text-esi-muted">
                    Pemenang: <span className="font-bold text-esi-red">{sub.claimed_winner}</span>
                  </p>
                )}
              </div>

              <div className="mt-3 space-y-1.5 border-t border-stone-100 dark:border-zinc-700 pt-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-esi-muted">Tim</span>
                  <span className="font-medium text-esi-text">{sub.submitted_team}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-esi-muted">Dikirim oleh</span>
                  <span className="font-medium text-esi-text">{sub.submitted_by}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-esi-muted">Waktu</span>
                  <span className="text-esi-text">{new Date(sub.submitted_at).toLocaleString('id-ID')}</span>
                </div>
              </div>
            </div>

            {/* Screenshots */}
            {(sub.screenshots ?? []).length > 0 && (
              <div className="rounded-xl border border-stone-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 p-4 shadow-sm">
                <p className="mb-3 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-esi-text">
                  <ImageIcon size={14} weight="duotone" className="text-esi-red" />
                  Screenshot ({sub.screenshots.length})
                </p>
                <div className="grid grid-cols-3 gap-2">
                  {sub.screenshots.map((url, i) => {
                    const resolved = resolveMediaUrl(url)
                    return resolved ? (
                      <button
                        key={i}
                        onClick={() => setLightboxUrl(resolved)}
                        className="overflow-hidden rounded-lg border border-stone-200 dark:border-zinc-700 hover:scale-105 transition-transform"
                      >
                        <img src={resolved} alt={`Screenshot ${i + 1}`} className="h-24 w-full object-cover" />
                      </button>
                    ) : null
                  })}
                </div>
              </div>
            )}

            {/* Opponent submission */}
            {sub.opponent_submission && (
              <div className="rounded-xl border border-blue-200 bg-blue-50 dark:bg-blue-950/30 p-4 shadow-sm">
                <p className="mb-3 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-blue-700 dark:text-blue-400">
                  <ShieldWarning size={14} weight="duotone" />
                  Submission Lawan
                </p>
                <div className="rounded-lg bg-white dark:bg-zinc-900 p-3">
                  {sub.opponent_submission.match_type === 'bracket' || sub.opponent_submission.match_type === 'group' ? (
                    <p className="text-center text-sm font-bold text-esi-text">
                      {sub.opponent_submission.team_a_name}
                      <span className="mx-2 text-esi-red">
                        {sub.opponent_submission.claimed_score_a ?? '?'} – {sub.opponent_submission.claimed_score_b ?? '?'}
                      </span>
                      {sub.opponent_submission.team_b_name}
                    </p>
                  ) : (
                    <div className="flex items-center justify-center gap-6">
                      <div className="text-center">
                        <p className="text-2xl font-black text-esi-red">#{sub.opponent_submission.claimed_placement ?? '?'}</p>
                        <p className="text-xs text-esi-muted">Placement</p>
                      </div>
                      <div className="text-center">
                        <p className="text-2xl font-black text-esi-text">{sub.opponent_submission.claimed_kills ?? 0}</p>
                        <p className="text-xs text-esi-muted">Kills</p>
                      </div>
                    </div>
                  )}
                  <p className="mt-2 text-xs text-esi-muted text-center">
                    {sub.opponent_submission.submitted_by} · {sub.opponent_submission.submitted_team}
                  </p>
                </div>
                {/* Opponent screenshots */}
                {(sub.opponent_submission.screenshots ?? []).length > 0 && (
                  <div className="mt-2 flex gap-2 overflow-x-auto">
                    {sub.opponent_submission.screenshots.map((url, i) => {
                      const resolved = resolveMediaUrl(url)
                      return resolved ? (
                        <button
                          key={i}
                          onClick={() => setLightboxUrl(resolved)}
                          className="shrink-0 overflow-hidden rounded-lg border border-blue-200 hover:scale-105 transition-transform"
                        >
                          <img src={resolved} alt={`Opp screenshot ${i + 1}`} className="h-16 w-20 object-cover" />
                        </button>
                      ) : null
                    })}
                  </div>
                )}
              </div>
            )}

            {/* Admin notes */}
            {sub.status === 'pending' && (
              <div className="rounded-xl border border-stone-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 p-4 shadow-sm">
                <p className="mb-2 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-esi-text">
                  <Notepad size={14} weight="duotone" className="text-esi-red" />
                  Catatan Admin
                </p>
                <textarea
                  value={adminNotes}
                  onChange={e => setAdminNotes(e.target.value)}
                  placeholder="Tambahkan catatan..."
                  rows={2}
                  className="w-full rounded-lg border border-stone-200 dark:border-zinc-700 bg-esi-bg/50 px-3 py-2 text-sm text-esi-text placeholder:text-esi-muted/50 focus:border-esi-red focus:outline-none focus:ring-2 focus:ring-esi-red/20"
                />
              </div>
            )}

            {/* Rejection reason display */}
            {sub.status === 'rejected' && sub.rejection_reason && (
              <div className="rounded-xl border border-red-200 bg-red-50 dark:bg-red-950/30 p-4 shadow-sm">
                <p className="text-xs font-bold text-red-700 mb-1">Alasan Penolakan</p>
                <p className="text-sm text-red-600">{sub.rejection_reason}</p>
              </div>
            )}

            {/* History */}
            {(sub.history ?? []).length > 0 && (
              <div className="rounded-xl border border-stone-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 p-4 shadow-sm">
                <p className="mb-3 text-xs font-bold uppercase tracking-wide text-esi-text">Riwayat Submission</p>
                <div className="space-y-2">
                  {sub.history!.map((hist) => {
                    const hcfg = statusConfig[hist.status]
                    const HIcon = hcfg.icon
                    return (
                      <div key={hist.id} className="flex items-center justify-between rounded-lg border border-stone-100 dark:border-zinc-700 bg-esi-bg/50 p-3">
                        <div className="text-xs">
                          <p className="font-medium text-esi-text">{hist.submitted_by} · {hist.submitted_team}</p>
                          <p className="text-esi-muted">{new Date(hist.submitted_at).toLocaleString('id-ID')}</p>
                        </div>
                        <span className={cn('inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-medium', hcfg.cls)}>
                          <HIcon size={10} weight="fill" />{hcfg.label}
                        </span>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Action buttons */}
            {sub.status === 'pending' && (
              <div className="rounded-xl border border-stone-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 p-4 shadow-sm space-y-3">
                <p className="text-xs font-bold uppercase tracking-wide text-esi-text">Aksi</p>
                <Button
                  onClick={handleApprove}
                  disabled={processing}
                  className="w-full bg-green-600 text-white hover:bg-green-700"
                >
                  <CheckCircle size={18} weight="bold" className="mr-2" />
                  {processing ? 'Memproses...' : 'Approve Submission'}
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
                  <div className="rounded-lg border border-red-200 bg-red-50 dark:bg-red-950/30 p-3 space-y-2">
                    <label className="text-xs font-medium text-red-700">Alasan Penolakan</label>
                    <Input
                      placeholder="Masukkan alasan..."
                      value={rejectReason}
                      onChange={e => setRejectReason(e.target.value)}
                      className="border-red-200 bg-white dark:bg-zinc-900 text-sm"
                    />
                    <div className="flex gap-2">
                      <Button size="sm" onClick={handleReject} disabled={processing} className="bg-red-600 text-white hover:bg-red-700">
                        {processing ? 'Memproses...' : 'Kirim Penolakan'}
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => { setShowRejectForm(false); setRejectReason('') }}>
                        Batal
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Lightbox */}
      <SubmissionLightbox url={lightboxUrl} onClose={() => setLightboxUrl(null)} zIndex={200} />
    </>
  )
}
