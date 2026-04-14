'use client'

import { useState, useEffect } from 'react'
import { Warning, ShieldWarning } from '@phosphor-icons/react'
import { api } from '@/lib/api'

interface TeamCard {
  id: string
  card_type: 'yellow' | 'red'
  reason: string
  point_deduction: number
  is_revoked: boolean
  created_at: string
  match_label?: string
  team_name?: string
  issuer_name?: string
}

export function TeamCardsSection({ teamId }: { teamId: string }) {
  const [cards, setCards] = useState<TeamCard[]>([])
  const [loadError, setLoadError] = useState(false)

  useEffect(() => {
    if (!teamId) return
    setLoadError(false)
    api.get<TeamCard[]>(`/player/teams/${teamId}/cards`).then(setCards).catch(() => setLoadError(true))
  }, [teamId])

  if (loadError) return null
  if (cards.length === 0) return null

  const activeCards = cards.filter((c) => !c.is_revoked)
  const revokedCards = cards.filter((c) => c.is_revoked)
  const totalDeduction = activeCards.reduce((sum, c) => sum + c.point_deduction, 0)

  return (
    <div className="space-y-3">
      <h2 className="flex items-center gap-2 text-lg font-bold text-esi-text">
        <ShieldWarning size={20} weight="bold" />
        Kartu Tim
      </h2>

      {/* Summary */}
      {totalDeduction > 0 && (
        <div className="rounded-lg border border-amber-200 dark:border-amber-800/50 bg-amber-50 dark:bg-amber-950/30 px-4 py-2.5">
          <p className="text-sm font-semibold text-amber-800 dark:text-amber-200">
            Total pengurangan poin: <span className="text-amber-900 dark:text-amber-100">-{totalDeduction} poin</span>
          </p>
        </div>
      )}

      <div className="space-y-2">
        {activeCards.map((card) => (
          <TeamCardBadge key={card.id} card={card} />
        ))}
        {revokedCards.map((card) => (
          <TeamCardBadge key={card.id} card={card} />
        ))}
      </div>
    </div>
  )
}

function TeamCardBadge({ card }: { card: TeamCard }) {
  const isYellow = card.card_type === 'yellow'
  const isRevoked = card.is_revoked

  return (
    <div
      className={`rounded-xl border-l-4 p-3 transition-all ${
        isRevoked
          ? 'border-l-stone-300 dark:border-l-zinc-600 bg-stone-50 dark:bg-zinc-800/50 opacity-60'
          : isYellow
          ? 'border-l-yellow-400 bg-yellow-50 dark:bg-yellow-950/20 border border-l-4 border-yellow-200 dark:border-yellow-800/40'
          : 'border-l-red-500 bg-red-50 dark:bg-red-950/20 border border-l-4 border-red-200 dark:border-red-800/40'
      }`}
    >
      <div className="flex items-start gap-2.5">
        <div className={`mt-0.5 shrink-0 ${isRevoked ? 'text-stone-400 dark:text-zinc-500' : isYellow ? 'text-yellow-600 dark:text-yellow-400' : 'text-red-600 dark:text-red-400'}`}>
          <Warning size={18} weight="fill" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-bold uppercase tracking-wider ${
                isRevoked
                  ? 'bg-stone-200 dark:bg-zinc-700 text-stone-500 dark:text-zinc-400'
                  : isYellow
                  ? 'bg-yellow-200 dark:bg-yellow-900/50 text-yellow-800 dark:text-yellow-300'
                  : 'bg-red-200 dark:bg-red-900/50 text-red-800 dark:text-red-300'
              }`}
            >
              {isYellow ? 'Kartu Kuning' : 'Kartu Merah'}
            </span>
            {!isRevoked && (
              <span className={`text-xs font-bold ${isYellow ? 'text-yellow-700 dark:text-yellow-400' : 'text-red-700 dark:text-red-400'}`}>
                -{card.point_deduction} poin
              </span>
            )}
            {isRevoked && (
              <span className="inline-flex items-center rounded-full bg-stone-200 dark:bg-zinc-700 px-2 py-0.5 text-[10px] font-semibold text-stone-500 dark:text-zinc-400">
                Dicabut
              </span>
            )}
          </div>
          <p className={`mt-1 text-sm ${isRevoked ? 'line-through text-stone-400 dark:text-zinc-500' : 'text-esi-text'}`}>
            {card.reason}
          </p>
          <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[11px] text-esi-muted">
            {card.match_label && <span>{card.match_label}</span>}
            <span>
              {new Date(card.created_at).toLocaleDateString('id-ID', {
                day: 'numeric',
                month: 'short',
                year: 'numeric',
              })}
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}
