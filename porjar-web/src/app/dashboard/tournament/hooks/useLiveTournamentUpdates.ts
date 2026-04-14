'use client'

import { useCallback, useState } from 'react'
import { toast } from 'sonner'
import { useWebSocket } from '@/hooks/useWebSocket'
import type { BracketMatch, WSMessage } from '@/types'

interface Options {
  tournamentId: string | null
  setMatches: React.Dispatch<React.SetStateAction<BracketMatch[]>>
  loadTournamentData: () => void | Promise<void>
}

export function useLiveTournamentUpdates({
  tournamentId,
  setMatches,
  loadTournamentData,
}: Options) {
  const [newMatchIds, setNewMatchIds] = useState<string[]>([])

  const handleWSMessage = useCallback(
    (msg: WSMessage) => {
      if (msg.type === 'bracket_advance') {
        const data = msg.data as Record<string, unknown> | undefined
        const teamName = data?.team_name as string | undefined
        if (teamName) {
          toast.success(`${teamName} lolos ke round berikutnya`, { duration: 4000 })
        }
        loadTournamentData()
        return
      }

      if (msg.type === 'match_complete') {
        const data = msg.data as Record<string, unknown> | undefined
        const winnerName = data?.winner_name as string | undefined
        const matchId = data?.match_id as string | undefined
        if (winnerName) {
          toast.success(`${winnerName} menang!`, { duration: 6000 })
        }
        if (matchId) {
          setNewMatchIds((prev) => [matchId, ...prev].slice(0, 20))
          setTimeout(() => {
            setNewMatchIds((prev) => prev.filter((id) => id !== matchId))
          }, 4000)
        }
        loadTournamentData()
        return
      }

      const data = msg.data as Record<string, unknown> | undefined
      const matchId = data?.match_id as string | undefined
      const matchNumber = data?.match_number as number | undefined
      const matchLabel = matchNumber != null ? `#${matchNumber}` : ''

      if (!matchId) {
        loadTournamentData()
        return
      }

      if (msg.type === 'score_update') {
        const scoreA = data?.score_a as number | undefined
        const scoreB = data?.score_b as number | undefined
        if (scoreA != null && scoreB != null) {
          toast(`Match ${matchLabel}: ${scoreA} - ${scoreB}`, { duration: 3000 })
        }
      }

      if (msg.type === 'match_status') {
        const status = data?.status as string | undefined
        if (status === 'live') {
          toast(`Match ${matchLabel} sedang berlangsung!`)
        }
      }

      setMatches((prev) => {
        const idx = prev.findIndex((m) => m.id === matchId)
        if (idx === -1) return prev

        const updated = [...prev]
        const match = { ...updated[idx] }

        if (msg.type === 'score_update') {
          if (data?.score_a != null) match.score_a = data.score_a as number
          if (data?.score_b != null) match.score_b = data.score_b as number
        }

        if (msg.type === 'match_status') {
          if (data?.status) match.status = data.status as BracketMatch['status']
          if (data?.winner_id && match.team_a?.id === data.winner_id) {
            match.winner = match.team_a
          } else if (data?.winner_id && match.team_b?.id === data.winner_id) {
            match.winner = match.team_b
          }
        }

        updated[idx] = match
        return updated
      })
    },
    [loadTournamentData, setMatches]
  )

  useWebSocket({
    channels: tournamentId ? [`tournament:${tournamentId}`] : [],
    messageTypes: [
      'score_update',
      'match_status',
      'match_complete',
      'bracket_advance',
      'bracket_update',
      'tournament_update',
    ],
    onMessage: handleWSMessage,
    autoConnect: !!tournamentId,
  })

  return { newMatchIds }
}
