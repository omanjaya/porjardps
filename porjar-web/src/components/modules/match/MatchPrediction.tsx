'use client'

import { useEffect, useState, useCallback } from 'react'
import { toast } from 'sonner'
import { api } from '@/lib/api'
import { useAuthStore } from '@/store/auth-store'
import { cn, mediaUrl } from '@/lib/utils'
import Image from 'next/image'
import { Trophy, CheckCircle, SignIn } from '@phosphor-icons/react'
import type { MatchPredictions, TeamSummary } from '@/types'

interface MatchPredictionProps {
  matchId: string
  teamA: TeamSummary | null
  teamB: TeamSummary | null
  matchStatus: string
  winnerId?: string | null
}

export function MatchPrediction({
  matchId,
  teamA,
  teamB,
  matchStatus,
  winnerId,
}: MatchPredictionProps) {
  const { isAuthenticated } = useAuthStore()
  const [predictions, setPredictions] = useState<MatchPredictions | null>(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)

  const isCompleted = matchStatus === 'completed'
  const isLive = matchStatus === 'live'
  const canVote = !isCompleted && !isLive && isAuthenticated

  const loadPredictions = useCallback(async () => {
    try {
      const data = await api.get<MatchPredictions>(`/matches/${matchId}/predictions`)
      setPredictions(data)
    } catch (err) {
      console.error('Gagal memuat prediksi:', err)
    } finally {
      setLoading(false)
    }
  }, [matchId])

  useEffect(() => {
    loadPredictions()
  }, [loadPredictions])

  async function handleVote(teamId: string) {
    if (!canVote || submitting) return
    setSubmitting(true)
    try {
      await api.post(`/matches/${matchId}/predict`, { predicted_winner_id: teamId })
      await loadPredictions()
    } catch {
      toast.error('Gagal mengirim prediksi')
    } finally {
      setSubmitting(false)
    }
  }

  if (!teamA || !teamB) return null
  if (loading) {
    return (
      <div className="rounded-xl border border-stone-200 bg-white p-4 animate-pulse">
        <div className="h-4 w-32 bg-stone-200 rounded mb-3" />
        <div className="h-12 bg-stone-200 rounded" />
      </div>
    )
  }

  const userPrediction = predictions?.user_prediction
  const userPredictedCorrectly = isCompleted && userPrediction && userPrediction === winnerId
  const userPredictedWrong = isCompleted && userPrediction && userPrediction !== winnerId

  const teamAPct = predictions?.team_a_percent ?? 0
  const teamBPct = predictions?.team_b_percent ?? 0
  const totalVotes = predictions?.total_votes ?? 0

  return (
    <div className="rounded-xl border border-stone-200 bg-white p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-stone-500">
          Prediksi Pemenang
        </h3>
        <span className="text-[10px] text-stone-400">
          {totalVotes} vote{totalVotes !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Result badge for completed matches */}
      {userPredictedCorrectly && (
        <div className="mb-3 flex items-center justify-center gap-2 rounded-lg bg-green-50 border border-green-200 px-3 py-2">
          <CheckCircle size={16} weight="fill" className="text-green-600" />
          <span className="text-sm font-semibold text-green-600">
            Prediksi kamu benar!
          </span>
        </div>
      )}
      {userPredictedWrong && (
        <div className="mb-3 flex items-center justify-center gap-2 rounded-lg bg-red-50 border border-red-200 px-3 py-2">
          <span className="text-sm font-medium text-red-600">
            Prediksi kamu kurang tepat
          </span>
        </div>
      )}

      {/* Voting buttons */}
      <div className="grid grid-cols-2 gap-2 mb-3">
        <button
          onClick={() => handleVote(teamA.id)}
          disabled={!canVote || submitting}
          className={cn(
            'flex flex-col items-center gap-1.5 rounded-lg border px-3 py-3 transition-all duration-200',
            userPrediction === teamA.id
              ? 'border-porjar-red/50 bg-red-50 text-porjar-red'
              : 'border-stone-200 bg-stone-50 text-stone-700 hover:border-stone-300',
            !canVote && 'cursor-default opacity-80',
            canVote && 'hover:bg-stone-100'
          )}
        >
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-stone-100">
            {teamA.logo_url ? (
              <Image src={mediaUrl(teamA.logo_url)!} alt={teamA.name} width={32} height={32} className="h-full w-full rounded-lg object-cover" unoptimized />
            ) : (
              <Trophy size={16} className="text-stone-400" />
            )}
          </div>
          <span className="text-xs font-semibold truncate max-w-full">{teamA.name}</span>
          {userPrediction === teamA.id && (
            <CheckCircle size={14} weight="fill" className="text-porjar-red" />
          )}
        </button>

        <button
          onClick={() => handleVote(teamB.id)}
          disabled={!canVote || submitting}
          className={cn(
            'flex flex-col items-center gap-1.5 rounded-lg border px-3 py-3 transition-all duration-200',
            userPrediction === teamB.id
              ? 'border-porjar-red/50 bg-red-50 text-porjar-red'
              : 'border-stone-200 bg-stone-50 text-stone-700 hover:border-stone-300',
            !canVote && 'cursor-default opacity-80',
            canVote && 'hover:bg-stone-100'
          )}
        >
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-stone-100">
            {teamB.logo_url ? (
              <Image src={mediaUrl(teamB.logo_url)!} alt={teamB.name} width={32} height={32} className="h-full w-full rounded-lg object-cover" unoptimized />
            ) : (
              <Trophy size={16} className="text-stone-400" />
            )}
          </div>
          <span className="text-xs font-semibold truncate max-w-full">{teamB.name}</span>
          {userPrediction === teamB.id && (
            <CheckCircle size={14} weight="fill" className="text-porjar-red" />
          )}
        </button>
      </div>

      {/* Vote bar */}
      {totalVotes > 0 && (
        <div className="space-y-1.5">
          <div className="flex h-2.5 w-full overflow-hidden rounded-full bg-stone-200">
            <div
              className="bg-porjar-red transition-all duration-500 ease-out rounded-l-full"
              style={{ width: `${teamAPct}%` }}
            />
            <div
              className="bg-amber-500 transition-all duration-500 ease-out rounded-r-full"
              style={{ width: `${teamBPct}%` }}
            />
          </div>
          <div className="flex justify-between text-[10px] text-stone-500">
            <span>
              <span className="text-porjar-red font-semibold">{Math.round(teamAPct)}%</span>{' '}{' '}
              {teamA.name}
            </span>
            <span>
              {teamB.name}{' '}
              <span className="text-amber-400 font-semibold">{Math.round(teamBPct)}%</span>
            </span>
          </div>
        </div>
      )}

      {/* Login prompt */}
      {!isAuthenticated && !isCompleted && !isLive && (
        <div className="mt-3 flex items-center justify-center gap-2 rounded-lg bg-stone-50 border border-stone-200 px-3 py-2">
          <SignIn size={14} className="text-stone-400" />
          <a href="/login" className="text-xs text-porjar-red hover:text-red-700 underline">
            Login untuk voting
          </a>
        </div>
      )}

      {/* Status indicator for live/completed */}
      {isLive && (
        <div className="mt-2 text-center text-[10px] text-stone-400">
          Voting ditutup saat match berlangsung
        </div>
      )}
      {isCompleted && !userPrediction && (
        <div className="mt-2 text-center text-[10px] text-stone-400">
          Match telah selesai
        </div>
      )}
    </div>
  )
}
