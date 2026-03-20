'use client'

import { useEffect, useState, useCallback, useMemo, Suspense } from 'react'
import { useParams, useSearchParams } from 'next/navigation'
import { api } from '@/lib/api'
import { useWebSocket } from '@/hooks/useWebSocket'
import { BracketView } from '@/components/modules/bracket/BracketView'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'
import type { BracketMatch, WSMessage } from '@/types'

function EmbedBracketContent() {
  const params = useParams<{ id: string }>()
  const searchParams = useSearchParams()
  const theme = searchParams.get('theme') ?? 'light'

  const [matches, setMatches] = useState<BracketMatch[]>([])
  const [loading, setLoading] = useState(true)

  const loadData = useCallback(async () => {
    try {
      const m = await api.get<BracketMatch[]>(`/tournaments/${params.id}/bracket`)
      setMatches(m ?? [])
    } catch (err) {
      console.error('Gagal memuat data bracket embed:', err)
    } finally {
      setLoading(false)
    }
  }, [params.id])

  useEffect(() => {
    loadData()
  }, [loadData])

  // WebSocket real-time updates
  useWebSocket({
    channels: [`tournament:${params.id}`],
    messageTypes: ['score_update', 'match_status', 'bracket_advance'],
    onMessage: useCallback(
      (_msg: WSMessage) => {
        loadData()
      },
      [loadData]
    ),
  })

  const maxRound = useMemo(
    () => matches.reduce((max, m) => Math.max(max, m.round), 0),
    [matches]
  )

  const liveMatchIds = useMemo(
    () => matches.filter((m) => m.status === 'live').map((m) => m.id),
    [matches]
  )

  if (loading) {
    return (
      <div className={cn('p-4', theme === 'dark' ? 'bg-slate-900' : 'bg-porjar-bg')}>
        <Skeleton className={cn('h-96 w-full', theme === 'dark' ? 'bg-slate-800' : 'bg-stone-200')} />
      </div>
    )
  }

  return (
    <div
      className={cn(
        'min-h-screen p-2',
        theme === 'dark' ? 'bg-slate-900 text-slate-50' : 'bg-porjar-bg text-stone-900'
      )}
    >
      {matches.length > 0 ? (
        <BracketView
          matches={matches}
          rounds={maxRound}
          liveMatchIds={liveMatchIds}
        />
      ) : (
        <div className="flex items-center justify-center h-64 text-stone-500 text-sm">
          Bracket belum tersedia
        </div>
      )}
    </div>
  )
}

export default function EmbedBracketPage() {
  return (
    <Suspense fallback={<div className="p-4"><Skeleton className="h-96 w-full bg-stone-200" /></div>}>
      <EmbedBracketContent />
    </Suspense>
  )
}
