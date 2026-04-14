'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { api } from '@/lib/api'
import { MatchCard } from '@/components/shared/MatchCard'
import { Button } from '@/components/ui/button'
import { ArrowLeft } from '@phosphor-icons/react'
import { Skeleton } from '@/components/ui/skeleton'
import type { BracketMatch } from '@/types'
import type { Tournament } from '@/types/tournament'
import type { Event } from '@/types/common'

export default function MatchCardPage() {
  const params = useParams<{ id: string }>()
  const router = useRouter()
  const [match, setMatch] = useState<BracketMatch | null>(null)
  const [tournament, setTournament] = useState<Tournament | null>(null)
  const [event, setEvent] = useState<Event | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        const m = await api.get<BracketMatch>(`/matches/${params.id}`)
        if (cancelled) return
        setMatch(m)
        if (m.tournament_id) {
          try {
            const t = await api.get<Tournament>(`/tournaments/${m.tournament_id}`)
            if (!cancelled) setTournament(t)
            if (t?.event_id) {
              try {
                const e = await api.get<Event>(`/events/${t.event_id}`)
                if (!cancelled) setEvent(e)
              } catch {
                /* ignore */
              }
            }
          } catch {
            /* ignore */
          }
        }
      } catch (err) {
        console.error('Gagal memuat detail match:', err)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [params.id])

  if (loading) {
    return (
      <div className="min-h-screen bg-stone-50 dark:bg-zinc-950 p-6">
        <Skeleton className="mx-auto h-96 w-full max-w-4xl" />
      </div>
    )
  }

  if (!match) {
    return (
      <div className="min-h-screen bg-stone-50 dark:bg-zinc-950 p-6 text-center">
        <p className="text-stone-500 dark:text-zinc-400">Pertandingan tidak ditemukan.</p>
        <Button onClick={() => router.back()} variant="outline" className="mt-4">
          Kembali
        </Button>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-stone-100 p-4 sm:p-8 dark:bg-zinc-950 print:bg-white print:p-0">
      <div className="no-print mb-4 mx-auto max-w-4xl flex items-center justify-between">
        <Button onClick={() => router.back()} variant="outline" size="sm">
          <ArrowLeft size={16} className="mr-1" />
          Kembali
        </Button>
        <div className="text-xs text-stone-500 dark:text-zinc-400">Kartu Pertandingan</div>
      </div>

      <MatchCard match={match} tournament={tournament} event={event} />
    </div>
  )
}
