'use client'

import { useEffect, useRef, useState } from 'react'
import { Trophy, Sword } from '@phosphor-icons/react'
import { cn } from '@/lib/utils'
import type { BracketMatch } from '@/types'

interface FeedItem {
  id: string
  winnerName: string
  loserName: string
  round: number
  isNew?: boolean
}

interface MatchResultFeedProps {
  matches: BracketMatch[]
  /** IDs of matches just completed via WS (for flash highlight) */
  newMatchIds?: string[]
}

function toFeedItem(m: BracketMatch, isNew = false): FeedItem | null {
  const winner = m.winner
  const loser = winner?.id === m.team_a?.id ? m.team_b : m.team_a
  if (!winner?.name || !loser?.name) return null
  return {
    id: m.id,
    winnerName: winner.name,
    loserName: loser.name,
    round: m.round,
    isNew,
  }
}

export function MatchResultFeed({ matches, newMatchIds = [] }: MatchResultFeedProps) {
  const scrollRef = useRef<HTMLDivElement>(null)

  const completedItems = matches
    .filter((m) => m.status === 'completed' && m.winner)
    .sort((a, b) => {
      // sort by match_number descending so most recent is first
      return (b.match_number ?? 0) - (a.match_number ?? 0)
    })
    .map((m) => toFeedItem(m, newMatchIds.includes(m.id)))
    .filter((x): x is FeedItem => x !== null)

  // Auto-scroll to start when new result arrives
  const prevNewLen = useRef(newMatchIds.length)
  useEffect(() => {
    if (newMatchIds.length > prevNewLen.current && scrollRef.current) {
      scrollRef.current.scrollTo({ left: 0, behavior: 'smooth' })
    }
    prevNewLen.current = newMatchIds.length
  }, [newMatchIds.length])

  if (completedItems.length === 0) return null

  return (
    <div className="mb-4 rounded-xl border border-stone-200 bg-white shadow-sm overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-2 border-b border-stone-100 px-4 py-2.5">
        <Trophy size={14} weight="fill" className="text-yellow-500" />
        <span className="text-xs font-semibold text-stone-600 uppercase tracking-wide">
          Hasil Terkini
        </span>
        <span className="ml-auto text-[10px] text-stone-400">{completedItems.length} pertandingan selesai</span>
      </div>

      {/* Feed */}
      <div
        ref={scrollRef}
        className="flex gap-2 overflow-x-auto px-3 py-2.5 scrollbar-none"
        style={{ scrollbarWidth: 'none' }}
      >
        {completedItems.map((item) => (
          <FeedCard key={item.id} item={item} />
        ))}
      </div>
    </div>
  )
}

function FeedCard({ item }: { item: FeedItem }) {
  const [flash, setFlash] = useState(item.isNew)

  useEffect(() => {
    if (!item.isNew) return
    const t = setTimeout(() => setFlash(false), 3000)
    return () => clearTimeout(t)
  }, [item.isNew])

  return (
    <div
      className={cn(
        'flex-shrink-0 rounded-lg border px-3 py-2 text-left transition-colors duration-700',
        flash
          ? 'border-yellow-300 bg-yellow-50'
          : 'border-stone-100 bg-stone-50'
      )}
    >
      {/* Round label */}
      <p className="mb-1 text-[10px] font-medium text-stone-400 uppercase tracking-wide">
        Round {item.round}
      </p>

      {/* Winner */}
      <div className="flex items-center gap-1.5">
        <Trophy size={11} weight="fill" className="text-yellow-500 flex-shrink-0" />
        <span className="text-xs font-semibold text-stone-900 whitespace-nowrap max-w-[120px] truncate">
          {item.winnerName}
        </span>
      </div>

      {/* Divider */}
      <div className="my-1 flex items-center gap-1">
        <div className="h-px flex-1 bg-stone-200" />
        <Sword size={9} className="text-stone-300" />
        <div className="h-px flex-1 bg-stone-200" />
      </div>

      {/* Loser */}
      <div className="flex items-center gap-1.5">
        <span className="text-xs text-stone-400 whitespace-nowrap max-w-[120px] truncate">
          {item.loserName}
        </span>
      </div>
    </div>
  )
}
