'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { WarningCircle } from '@phosphor-icons/react'
import { api } from '@/lib/api'
import { PublicLayout } from '@/components/layouts/PublicLayout'
import { PageHeader } from '@/components/shared/PageHeader'
import { EmptyState } from '@/components/shared/EmptyState'
import { ScheduleTimeline } from '@/components/modules/schedule/ScheduleTimeline'
import { Skeleton } from '@/components/ui/skeleton'
import type { Schedule, Tournament } from '@/types'

export default function TournamentSchedulePage() {
  const params = useParams<{ id: string }>()
  const [tournament, setTournament] = useState<Tournament | null>(null)
  const [schedules, setSchedules] = useState<Schedule[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function load() {
      try {
        const [t, s] = await Promise.all([
          api.get<Tournament>(`/tournaments/${params.id}`),
          api.get<Schedule[]>(`/schedules?tournament_id=${params.id}`),
        ])
        setTournament(t)
        setSchedules(s)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Gagal memuat jadwal')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [params.id])

  if (loading) {
    return (
      <PublicLayout>
        <div className="space-y-4">
          <Skeleton className="h-10 w-64 rounded-lg bg-slate-800" />
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-14 rounded-lg bg-slate-800" />
          ))}
        </div>
      </PublicLayout>
    )
  }

  if (error) {
    return (
      <PublicLayout>
        <EmptyState
          icon={WarningCircle}
          title="Terjadi Kesalahan"
          description={error}
        />
      </PublicLayout>
    )
  }

  return (
    <PublicLayout>
      <PageHeader
        title={tournament ? `Jadwal - ${tournament.name}` : 'Jadwal Turnamen'}
        description="Jadwal pertandingan untuk turnamen ini"
        breadcrumbs={[
          { label: 'Turnamen', href: '/tournaments' },
          ...(tournament
            ? [{ label: tournament.name, href: `/tournaments/${tournament.id}` }]
            : []),
          { label: 'Jadwal' },
        ]}
      />

      <ScheduleTimeline schedules={schedules} />
    </PublicLayout>
  )
}
