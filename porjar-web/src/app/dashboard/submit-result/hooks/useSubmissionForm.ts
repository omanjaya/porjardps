'use client'

import { useState } from 'react'
import { api } from '@/lib/api'
import { toast } from 'sonner'
import type { SubmissionData } from '@/components/modules/submission/SubmissionCard'
import type { ActiveMatch } from './useActiveMatches'

interface Params {
  loadData: (submissionId?: string) => void
  setSelectedMatch: (m: ActiveMatch | null) => void
}

export function useSubmissionForm({ loadData, setSelectedMatch }: Params) {
  const [submitting, setSubmitting] = useState(false)
  const [resubmittingSub, setResubmittingSub] = useState<SubmissionData | null>(null)

  // Bracket form
  const [scoreA, setScoreA] = useState('')
  const [scoreB, setScoreB] = useState('')
  const [screenshots, setScreenshots] = useState<string[]>([])

  // BR form
  const [placement, setPlacement] = useState('')
  const [killsP1, setKillsP1] = useState('')
  const [killsP2, setKillsP2] = useState('')
  const [killsP3, setKillsP3] = useState('')
  const [killsP4, setKillsP4] = useState('')

  function resetForm() {
    setScoreA('')
    setScoreB('')
    setScreenshots([])
    setPlacement('')
    setKillsP1('')
    setKillsP2('')
    setKillsP3('')
    setKillsP4('')
    setResubmittingSub(null)
  }

  async function handleSubmitBracket(selectedMatch: ActiveMatch) {
    const a = parseInt(scoreA)
    const b = parseInt(scoreB)
    if (isNaN(a) || isNaN(b)) { toast.error('Masukkan skor pertandingan'); return }
    // P4: eFootball-specific check must come before generic draw check
    if (selectedMatch.game_slug === 'efootball' && a === b) {
      toast.error('eFootball tidak boleh seri, harus ada pemenang')
      return
    }
    if (a === b) { toast.error('Skor tidak boleh seri, harus ada pemenang'); return }
    if (screenshots.length === 0) { toast.error('Upload minimal 1 screenshot'); return }

    setSubmitting(true)
    try {
      const res = await api.post<{ status?: string; id?: string; job_id?: string }>('/submissions', {
        match_id: selectedMatch.id,
        match_type: selectedMatch.type === 'group' ? 'group' : 'bracket',
        claimed_score_a: a,
        claimed_score_b: b,
        screenshots,
      })
      setSelectedMatch(null)
      resetForm()
      if (res?.status === 'queued') {
        toast.success('Submission sedang diproses...')
        setTimeout(() => loadData(res?.job_id), 3000)
      } else {
        toast.success('Hasil pertandingan berhasil dikirim!')
        loadData(res?.id)
      }
    } catch (err: unknown) {
      if (err && typeof err === 'object' && 'details' in err) {
        const details = (err as { details?: Record<string, string> }).details
        if (details) {
          toast.error(Object.values(details).join('. '))
          return
        }
      }
      toast.error(err instanceof Error ? err.message : 'Gagal mengirim hasil. Coba lagi.')
    } finally {
      setSubmitting(false)
    }
  }

  async function handleSubmitBR(selectedMatch: ActiveMatch) {
    if (!placement) { toast.error('Pilih placement'); return }
    if (screenshots.length === 0) { toast.error('Upload minimal 1 screenshot'); return }

    setSubmitting(true)
    try {
      const res = await api.post<{ status?: string; id?: string; job_id?: string }>('/submissions', {
        match_id: selectedMatch.id,
        match_type: 'battle_royale',
        map_number: selectedMatch.current_map ?? 1,
        claimed_placement: parseInt(placement),
        kills_p1: parseInt(killsP1) || 0,
        kills_p2: parseInt(killsP2) || 0,
        kills_p3: parseInt(killsP3) || 0,
        kills_p4: parseInt(killsP4) || 0,
        screenshots,
      })
      setSelectedMatch(null)
      resetForm()
      if (res?.status === 'queued') {
        toast.success('Submission sedang diproses...')
        setTimeout(() => loadData(res?.job_id), 3000)
      } else {
        toast.success('Hasil pertandingan berhasil dikirim!')
        loadData(res?.id)
      }
    } catch (err: unknown) {
      if (err && typeof err === 'object' && 'details' in err) {
        const details = (err as { details?: Record<string, string> }).details
        if (details) {
          toast.error(Object.values(details).join('. '))
          return
        }
      }
      toast.error(err instanceof Error ? err.message : 'Gagal mengirim hasil. Coba lagi.')
    } finally {
      setSubmitting(false)
    }
  }

  function applyResubmit(sub: SubmissionData) {
    setResubmittingSub(sub)
    if (sub.claimed_score_a !== undefined) setScoreA(String(sub.claimed_score_a))
    if (sub.claimed_score_b !== undefined) setScoreB(String(sub.claimed_score_b))
    if (sub.claimed_placement !== undefined) setPlacement(String(sub.claimed_placement))
    setKillsP1(String(sub.kills_p1 ?? 0))
    setKillsP2(String(sub.kills_p2 ?? 0))
    setKillsP3(String(sub.kills_p3 ?? 0))
    setKillsP4(String(sub.kills_p4 ?? 0))
    setScreenshots([])
  }

  return {
    submitting,
    resubmittingSub,
    scoreA, setScoreA,
    scoreB, setScoreB,
    screenshots, setScreenshots,
    placement, setPlacement,
    killsP1, setKillsP1,
    killsP2, setKillsP2,
    killsP3, setKillsP3,
    killsP4, setKillsP4,
    resetForm,
    handleSubmitBracket,
    handleSubmitBR,
    applyResubmit,
  }
}
