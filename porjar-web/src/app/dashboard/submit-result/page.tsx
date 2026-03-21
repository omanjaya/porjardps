'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/store/auth-store'
import {
  Trophy,
  GameController,
  ArrowLeft,
  ArrowCounterClockwise,
  WarningCircle,
} from '@phosphor-icons/react'
import { DashboardLayout } from '@/components/layouts/DashboardLayout'
import { PageHeader } from '@/components/shared/PageHeader'
import { SubmissionCard } from '@/components/modules/submission/SubmissionCard'
import type { SubmissionData } from '@/components/modules/submission/SubmissionCard'
import { Skeleton } from '@/components/ui/skeleton'
import { api } from '@/lib/api'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { BracketSubmitForm } from './BracketSubmitForm'
import { BRSubmitForm } from './BRSubmitForm'

interface ActiveMatch {
  id: string
  type: 'bracket' | 'battle_royale'
  team_a_name: string
  team_b_name: string
  game_name: string
  game_slug: string
  best_of?: number
  lobby_name?: string
  scheduled_at: string | null
}

export default function SubmitResultPage() {
  const router = useRouter()
  const { isAuthenticated, isLoading: authLoading } = useAuthStore()
  const [activeMatches, setActiveMatches] = useState<ActiveMatch[]>([])
  const [submissions, setSubmissions] = useState<SubmissionData[]>([])
  const [selectedMatch, setSelectedMatch] = useState<ActiveMatch | null>(null)
  const [resubmittingSub, setResubmittingSub] = useState<SubmissionData | null>(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)

  // Bracket form
  const [winner, setWinner] = useState<'team_a' | 'team_b' | ''>('')
  const [scoreA, setScoreA] = useState('')
  const [scoreB, setScoreB] = useState('')
  const [screenshots, setScreenshots] = useState<string[]>([])

  // BR form
  const [placement, setPlacement] = useState('')
  const [kills, setKills] = useState('')

  useEffect(() => {
    if (!isAuthenticated || authLoading) return
    loadData()
  }, [isAuthenticated, authLoading])

  async function loadData() {
    try {
      const [matches, subs] = await Promise.all([
        api.get<ActiveMatch[]>('/submissions/active-matches').catch(() => [] as ActiveMatch[]),
        api.get<SubmissionData[]>('/submissions/my').catch(() => [] as SubmissionData[]),
      ])
      setActiveMatches(matches ?? [])
      setSubmissions(subs ?? [])
    } catch {
      toast.error('Gagal memuat data pertandingan')
    } finally {
      setLoading(false)
    }
  }

  function resetForm() {
    setWinner('')
    setScoreA('')
    setScoreB('')
    setScreenshots([])
    setPlacement('')
    setKills('')
    setResubmittingSub(null)
  }

  function selectMatch(match: ActiveMatch) {
    setSelectedMatch(match)
    resetForm()
  }

  async function handleSubmitBracket() {
    if (!selectedMatch) return
    if (!winner) { toast.error('Pilih pemenang pertandingan'); return }
    if (!scoreA || !scoreB) { toast.error('Masukkan skor pertandingan'); return }
    if (screenshots.length === 0) { toast.error('Upload minimal 1 screenshot'); return }

    setSubmitting(true)
    try {
      await api.post('/submissions', {
        match_id: selectedMatch.id,
        match_type: 'bracket',
        claimed_winner: winner,
        claimed_score_a: parseInt(scoreA),
        claimed_score_b: parseInt(scoreB),
        screenshots,
      })
      toast.success('Hasil pertandingan berhasil dikirim!')
      setSelectedMatch(null)
      resetForm()
      loadData()
    } catch {
      toast.error('Gagal mengirim hasil. Coba lagi.')
    } finally {
      setSubmitting(false)
    }
  }

  async function handleSubmitBR() {
    if (!selectedMatch) return
    if (!placement) { toast.error('Pilih placement'); return }
    if (!kills && kills !== '0') { toast.error('Masukkan jumlah kills'); return }
    if (screenshots.length === 0) { toast.error('Upload minimal 1 screenshot'); return }

    setSubmitting(true)
    try {
      await api.post('/submissions', {
        match_id: selectedMatch.id,
        match_type: 'battle_royale',
        claimed_placement: parseInt(placement),
        claimed_kills: parseInt(kills),
        screenshots,
      })
      toast.success('Hasil pertandingan berhasil dikirim!')
      setSelectedMatch(null)
      resetForm()
      loadData()
    } catch {
      toast.error('Gagal mengirim hasil. Coba lagi.')
    } finally {
      setSubmitting(false)
    }
  }

  async function handleResubmit(sub: SubmissionData) {
    const match = activeMatches.find(m => m.id === sub.match_id)
    if (match) {
      setSelectedMatch(match)
      setResubmittingSub(sub)
      // Pre-fill form with previous submission data
      if (sub.claimed_score_a !== undefined) setScoreA(String(sub.claimed_score_a))
      if (sub.claimed_score_b !== undefined) setScoreB(String(sub.claimed_score_b))
      if (sub.claimed_winner) setWinner(sub.claimed_winner as 'team_a' | 'team_b')
      if (sub.claimed_placement !== undefined) setPlacement(String(sub.claimed_placement))
      if (sub.claimed_kills !== undefined) setKills(String(sub.claimed_kills))
      setScreenshots([])
    }
  }

  return (
    <DashboardLayout>
      <PageHeader
        title="Kirim Hasil Pertandingan"
        description="Upload bukti dan skor pertandingan kamu"
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Kirim Hasil' },
        ]}
      />

      {/* Active Matches */}
      {!selectedMatch && (
        <>
          {submissions.some(s => s.status === 'rejected') && (
            <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-2.5 flex items-center gap-2">
              <WarningCircle size={16} className="text-amber-600 shrink-0" />
              <p className="text-sm text-amber-700">Kamu punya hasil yang ditolak. Klik untuk melihat alasan dan kirim ulang.</p>
            </div>
          )}

          <div className="mb-4 sm:mb-6">
            <h2 className="mb-3 flex items-center gap-2 text-base font-bold uppercase tracking-wide text-porjar-text">
              <Trophy size={18} weight="fill" className="text-porjar-red" />
              Pertandingan Aktif
            </h2>

            {loading ? (
              <div className="grid gap-3 sm:grid-cols-2">
                {Array.from({ length: 2 }).map((_, i) => (
                  <Skeleton key={i} className="h-28 rounded-xl bg-porjar-border" />
                ))}
              </div>
            ) : activeMatches.length > 0 ? (
              <div className="grid gap-3 sm:grid-cols-2">
                {activeMatches.map(match => (
                  <button
                    key={match.id}
                    onClick={() => selectMatch(match)}
                    className="group rounded-xl border border-stone-200 bg-white p-4 text-left shadow-sm transition-all hover:border-porjar-red/30 hover:shadow-md"
                  >
                    <div className="mb-2 flex items-center gap-2">
                      <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-porjar-red/10">
                        <GameController size={14} weight="duotone" className="text-porjar-red" />
                      </div>
                      <span className="text-xs font-semibold uppercase tracking-wider text-porjar-muted">
                        {match.game_name}
                      </span>
                      <span className={cn(
                        '-skew-x-2 rounded px-1.5 py-0.5 text-[10px] font-bold uppercase',
                        match.type === 'bracket'
                          ? 'bg-blue-100 text-blue-700'
                          : 'bg-orange-100 text-orange-700'
                      )}>
                        {match.type === 'bracket' ? 'Bracket' : 'BR'}
                      </span>
                    </div>
                    {match.type === 'bracket' ? (
                      <p className="text-sm font-semibold text-porjar-text">
                        {match.team_a_name} vs {match.team_b_name}
                      </p>
                    ) : (
                      <p className="text-sm font-semibold text-porjar-text">
                        {match.lobby_name ?? 'Lobby'}
                      </p>
                    )}
                    <p className="mt-1 text-xs text-porjar-red font-medium group-hover:underline">
                      Kirim hasil &rarr;
                    </p>
                  </button>
                ))}
              </div>
            ) : (
              <div className="rounded-xl border border-stone-200 bg-white p-8 text-center shadow-sm">
                <GameController size={40} weight="duotone" className="mx-auto mb-3 text-porjar-border" />
                <p className="text-sm text-porjar-muted">Tidak ada pertandingan aktif saat ini</p>
              </div>
            )}
          </div>

          {/* Submission History */}
          <div>
            <h2 className="mb-3 flex items-center gap-2 text-base font-bold uppercase tracking-wide text-porjar-text">
              <ArrowCounterClockwise size={18} weight="fill" className="text-porjar-red" />
              Riwayat Pengiriman
            </h2>

            {loading ? (
              <div className="space-y-3">
                {Array.from({ length: 3 }).map((_, i) => (
                  <Skeleton key={i} className="h-32 rounded-xl bg-porjar-border" />
                ))}
              </div>
            ) : submissions.length > 0 ? (
              <div className="space-y-3">
                {submissions.map(sub => (
                  <div key={sub.id}>
                    <SubmissionCard submission={sub} />
                    {sub.status === 'rejected' && (
                      <button
                        onClick={() => handleResubmit(sub)}
                        className="mt-2 ml-4 flex items-center gap-1 text-xs font-medium text-porjar-red hover:underline"
                      >
                        <ArrowCounterClockwise size={12} />
                        Kirim ulang
                      </button>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="rounded-xl border border-stone-200 bg-white p-8 text-center shadow-sm">
                <p className="text-sm text-porjar-muted">Belum ada riwayat pengiriman</p>
              </div>
            )}
          </div>
        </>
      )}

      {/* Submission Form */}
      {selectedMatch && (
        <div className="space-y-4">
          <button
            onClick={() => { setSelectedMatch(null); resetForm() }}
            className="flex items-center gap-1.5 text-sm font-medium text-porjar-muted hover:text-porjar-red transition-colors"
          >
            <ArrowLeft size={16} />
            Kembali ke daftar pertandingan
          </button>

          <div className="rounded-xl border border-stone-200 bg-white p-4 sm:p-6 shadow-sm">
            {/* Match info header */}
            <div className="mb-4 sm:mb-6 rounded-lg bg-porjar-bg p-4">
              <div className="flex items-center gap-2 mb-2">
                <GameController size={18} weight="duotone" className="text-porjar-red" />
                <span className="text-xs font-semibold uppercase tracking-wider text-porjar-muted">
                  {selectedMatch.game_name}
                </span>
              </div>
              {selectedMatch.type === 'bracket' ? (
                <p className="text-lg font-bold text-porjar-text">
                  {selectedMatch.team_a_name} vs {selectedMatch.team_b_name}
                </p>
              ) : (
                <p className="text-lg font-bold text-porjar-text">
                  {selectedMatch.lobby_name ?? 'Lobby Battle Royale'}
                </p>
              )}
            </div>

            {/* Rejection reason alert */}
            {resubmittingSub?.status === 'rejected' && resubmittingSub.rejection_reason && (
              <div className="rounded-lg border border-red-200 bg-red-50 p-3 mb-4">
                <p className="text-xs font-semibold text-red-700 uppercase tracking-wide mb-1">Alasan Penolakan</p>
                <p className="text-sm text-red-600">{resubmittingSub.rejection_reason}</p>
              </div>
            )}

            {/* Bracket Form */}
            {selectedMatch.type === 'bracket' && (
              <BracketSubmitForm
                teamAName={selectedMatch.team_a_name}
                teamBName={selectedMatch.team_b_name}
                bestOf={selectedMatch.best_of}
                winner={winner}
                setWinner={setWinner}
                scoreA={scoreA}
                setScoreA={setScoreA}
                scoreB={scoreB}
                setScoreB={setScoreB}
                onScreenshotsChange={setScreenshots}
                submitting={submitting}
                onSubmit={handleSubmitBracket}
              />
            )}

            {/* BR Form */}
            {selectedMatch.type === 'battle_royale' && (
              <BRSubmitForm
                placement={placement}
                setPlacement={setPlacement}
                kills={kills}
                setKills={setKills}
                onScreenshotsChange={setScreenshots}
                submitting={submitting}
                onSubmit={handleSubmitBR}
              />
            )}
          </div>
        </div>
      )}
    </DashboardLayout>
  )
}
