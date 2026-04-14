'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { api } from '@/lib/api'
import type { TeamSummary } from '@/types'

export function useAutoDrawGroup(tournamentId: string, availableTeams: TeamSummary[], onDone: () => void) {
  const [showAutoDraw, setShowAutoDraw] = useState(false)
  const [numGroups, setNumGroups] = useState(4)
  const [advancePerGroup, setAdvancePerGroup] = useState(2)
  const [autoDrawLegs, setAutoDrawLegs] = useState(1)
  const [drawing, setDrawing] = useState(false)
  const [drawPhase, setDrawPhase] = useState<'idle' | 'shuffling' | 'done'>('idle')
  const [shuffleDisplay, setShuffleDisplay] = useState<string[]>([])

  const handleAutoDraw = async () => {
    setDrawing(true); setDrawPhase('shuffling')
    const teamNames = availableTeams.map(t => t.name)
    const groupLabels = Array.from({ length: numGroups }, (_, i) => String.fromCharCode(65 + i))
    const interval = setInterval(() => {
      const shuffled = [...teamNames].sort(() => Math.random() - 0.5)
      setShuffleDisplay(groupLabels.map((label, gi) => {
        const start = Math.floor(gi * shuffled.length / numGroups)
        const end = Math.floor((gi + 1) * shuffled.length / numGroups)
        return `Grup ${label}: ${shuffled.slice(start, end).slice(0, 3).join(', ')}${end - start > 3 ? '...' : ''}`
      }))
    }, 150)
    await new Promise(r => setTimeout(r, 5000)); clearInterval(interval)
    try {
      await api.post(`/admin/tournaments/${tournamentId}/auto-draw`, { num_groups: numGroups, advance_per_group: advancePerGroup, legs: autoDrawLegs })
      setDrawPhase('done'); toast.success(`${numGroups} grup berhasil di-acak!`)
      await new Promise(r => setTimeout(r, 1500)); setShowAutoDraw(false); setDrawPhase('idle'); setShuffleDisplay([]); onDone()
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Gagal mengacak grup'
      toast.error(msg); setDrawPhase('idle'); setShuffleDisplay([])
    } finally { setDrawing(false) }
  }

  return {
    showAutoDraw, setShowAutoDraw,
    numGroups, setNumGroups,
    advancePerGroup, setAdvancePerGroup,
    autoDrawLegs, setAutoDrawLegs,
    drawing, drawPhase, shuffleDisplay,
    handleAutoDraw,
  }
}
