'use client'

import { useEffect, useState, useCallback, Suspense } from 'react'
import { useParams, useSearchParams } from 'next/navigation'
import { api } from '@/lib/api'
import { useWebSocket } from '@/hooks/useWebSocket'
import { LiveScoreCard } from '@/components/modules/match/LiveScoreCard'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'
import type { BracketMatch, WSMessage } from '@/types'

function EmbedMatchContent() {
  const params = useParams<{ id: string }>()
  const searchParams = useSearchParams()
  const theme = searchParams.get('theme') ?? 'light'

  const [match, setMatch] = useState<BracketMatch | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      try {
        const data = await api.get<BracketMatch>(`/matches/${params.id}`)
        setMatch(data)
      } catch (err) {
        console.error('Gagal memuat data match embed:', err)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [params.id])

  const handleWSMessage = useCallback(
    (msg: WSMessage) => {
      const update = msg.data as BracketMatch
      if (update.id === params.id) {
        setMatch(update)
      }
    },
    [params.id]
  )

  useWebSocket({
    channels: [`match:${params.id}`],
    onMessage: handleWSMessage,
    messageTypes: ['score_update', 'match_status'],
    autoConnect: match?.status === 'live',
  })

  if (loading) {
    return (
      <div className={cn('p-3', theme === 'dark' ? 'bg-slate-900' : 'bg-porjar-bg')}>
        <Skeleton className={cn('h-32 w-full', theme === 'dark' ? 'bg-slate-800' : 'bg-stone-200')} />
      </div>
    )
  }

  if (!match) {
    return (
      <div className={cn('p-3 text-center text-sm', theme === 'dark' ? 'bg-slate-900 text-slate-500' : 'bg-porjar-bg text-stone-500')}>
        Match tidak ditemukan
      </div>
    )
  }

  return (
    <div
      className={cn(
        'min-h-[120px] p-2',
        theme === 'dark' ? 'bg-slate-900 text-slate-50' : 'bg-porjar-bg text-stone-900'
      )}
    >
      <LiveScoreCard match={match} />
    </div>
  )
}

export default function EmbedMatchPage() {
  return (
    <Suspense fallback={<div className="p-3"><Skeleton className="h-32 w-full bg-stone-200" /></div>}>
      <EmbedMatchContent />
    </Suspense>
  )
}
