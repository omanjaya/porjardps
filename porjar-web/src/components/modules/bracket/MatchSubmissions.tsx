'use client'

import { useEffect, useState } from 'react'
import { api, ApiError } from '@/lib/api'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import {
  CheckCircle,
  XCircle,
  Clock,
  Image as ImageIcon,
  User,
  Trophy,
} from '@phosphor-icons/react'

function isValidImageUrl(url: string): boolean {
  try {
    const u = new URL(url)
    return u.protocol === 'https:' || u.protocol === 'http:'
  } catch {
    return false
  }
}

interface Submission {
  id: string
  bracket_match_id: string | null
  submitted_by: string
  team_id: string
  claimed_winner_id: string | null
  claimed_score_a: number | null
  claimed_score_b: number | null
  screenshot_urls: string[]
  status: 'pending' | 'approved' | 'rejected'
  rejection_reason: string | null
  created_at: string
  // enriched
  submitter_name?: string
  team_name?: string
  claimed_winner_name?: string
}

interface MatchSubmissionsProps {
  matchId: string
  isAdmin?: boolean
}

export function MatchSubmissions({ matchId, isAdmin = false }: MatchSubmissionsProps) {
  const [submissions, setSubmissions] = useState<Submission[]>([])
  const [loading, setLoading] = useState(true)
  const [verifying, setVerifying] = useState<string | null>(null)
  const [failedImages, setFailedImages] = useState<Set<string>>(new Set())

  useEffect(() => {
    loadSubmissions()
  }, [matchId])

  async function loadSubmissions() {
    try {
      const data = await api.get<Submission[]>(`/matches/${matchId}/submissions`)
      setSubmissions(data ?? [])
    } catch {
      setSubmissions([])
    } finally {
      setLoading(false)
    }
  }

  async function handleVerify(subId: string, approved: boolean) {
    setVerifying(subId)
    try {
      await api.put(`/admin/submissions/${subId}/verify`, {
        approved,
        rejection_reason: approved ? '' : 'Ditolak oleh admin dari bracket view',
      })
      toast.success(approved ? 'Submission disetujui' : 'Submission ditolak')
      await loadSubmissions()
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Gagal memverifikasi')
    } finally {
      setVerifying(null)
    }
  }

  const visibleSubmissions = isAdmin
    ? submissions
    : submissions.filter((s) => s.status === 'approved')

  if (loading) {
    return (
      <div className="space-y-2">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-stone-400">Hasil Pertandingan</h3>
        <div className="animate-pulse space-y-2">
          <div className="h-16 rounded-lg bg-stone-100" />
        </div>
      </div>
    )
  }

  if (visibleSubmissions.length === 0) {
    if (!isAdmin) return null
    return (
      <div className="space-y-2">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-stone-400">Submissions</h3>
        <p className="text-xs text-stone-400 italic">Belum ada submission untuk match ini</p>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      <h3 className="text-xs font-semibold uppercase tracking-wider text-stone-400">
        {isAdmin ? `Submissions (${submissions.length})` : 'Bukti Hasil Pertandingan'}
      </h3>

      <div className="space-y-2">
        {visibleSubmissions.map((sub) => (
          <div
            key={sub.id}
            className={`rounded-lg border p-3 text-xs ${
              sub.status === 'approved'
                ? 'border-green-200 bg-green-50/50'
                : sub.status === 'rejected'
                  ? 'border-red-200 bg-red-50/50'
                  : 'border-amber-200 bg-amber-50/50'
            }`}
          >
            {/* Header */}
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-1.5">
                <User size={12} className="text-stone-500" />
                <span className="font-semibold text-stone-700">
                  {sub.team_name ?? sub.team_id.slice(0, 8)}
                </span>
              </div>
              <div className="flex items-center gap-1">
                {sub.status === 'approved' && <CheckCircle size={14} weight="fill" className="text-green-600" />}
                {sub.status === 'rejected' && <XCircle size={14} weight="fill" className="text-red-600" />}
                {sub.status === 'pending' && <Clock size={14} weight="fill" className="text-amber-600" />}
                <span className={`font-medium ${
                  sub.status === 'approved' ? 'text-green-700' :
                  sub.status === 'rejected' ? 'text-red-700' : 'text-amber-700'
                }`}>
                  {sub.status === 'approved' ? 'Disetujui' :
                   sub.status === 'rejected' ? 'Ditolak' : 'Menunggu'}
                </span>
              </div>
            </div>

            {/* Claimed result */}
            <div className="flex items-center gap-3 mb-2">
              {sub.claimed_winner_id && (
                <div className="flex items-center gap-1 text-stone-600">
                  <Trophy size={12} className="text-porjar-red" />
                  <span>Klaim menang: <strong>{sub.claimed_winner_name ?? sub.claimed_winner_id.slice(0, 8)}</strong></span>
                </div>
              )}
              {sub.claimed_score_a != null && sub.claimed_score_b != null && (
                <span className="font-bold text-stone-700 tabular-nums">
                  {sub.claimed_score_a} - {sub.claimed_score_b}
                </span>
              )}
            </div>

            {/* Screenshot previews */}
            {sub.screenshot_urls && sub.screenshot_urls.length > 0 && (
              <div className="mb-2">
                <div className="flex items-center gap-1 mb-1.5">
                  <ImageIcon size={12} className="text-stone-400" />
                  <span className="text-[10px] text-stone-400">Bukti ({sub.screenshot_urls.length})</span>
                </div>
                <div className="flex gap-2 overflow-x-auto pb-1">
                  {sub.screenshot_urls.map((url, i) => (
                    <div
                      key={i}
                      className="shrink-0 block rounded-lg border border-stone-200 overflow-hidden hover:border-porjar-red/40 hover:shadow-md transition-all"
                    >
                      {!isValidImageUrl(url) || failedImages.has(url) ? (
                        <div className="flex items-center justify-center h-32 w-32 bg-stone-100 text-stone-400 text-[10px]">
                          Gambar tidak tersedia
                        </div>
                      ) : (
                        <a
                          href={url}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          <img
                            src={url}
                            alt={`Screenshot ${i + 1}`}
                            className="h-32 w-auto object-cover bg-stone-100"
                            onError={() => setFailedImages(prev => new Set([...prev, url]))}
                          />
                        </a>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Rejection reason */}
            {sub.status === 'rejected' && sub.rejection_reason && (
              <p className="text-[11px] text-red-600 italic mb-2">Alasan: {sub.rejection_reason}</p>
            )}

            {/* Timestamp */}
            <p className="text-[10px] text-stone-400">
              {new Date(sub.created_at).toLocaleString('id-ID', {
                day: 'numeric', month: 'short', year: 'numeric',
                hour: '2-digit', minute: '2-digit',
              })}
            </p>

            {/* Admin actions for pending */}
            {isAdmin && sub.status === 'pending' && (
              <div className="flex items-center gap-2 mt-2 pt-2 border-t border-stone-200/60">
                <Button
                  size="xs"
                  disabled={verifying === sub.id}
                  onClick={() => handleVerify(sub.id, true)}
                  className="bg-green-600 hover:bg-green-700 text-white"
                >
                  <CheckCircle size={12} className="mr-0.5" />
                  Approve
                </Button>
                <Button
                  size="xs"
                  variant="destructive"
                  disabled={verifying === sub.id}
                  onClick={() => handleVerify(sub.id, false)}
                >
                  <XCircle size={12} className="mr-0.5" />
                  Reject
                </Button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
