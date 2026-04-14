'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import { api } from '@/lib/api'
import { useAuthStore } from '@/store/auth-store'
import { DashboardLayout } from '@/components/layouts/DashboardLayout'
import { PageHeader } from '@/components/shared/PageHeader'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Trophy, CalendarBlank, ArrowRight, Users } from '@phosphor-icons/react'
import type { MyEventRegistration } from '@/types'

const STATUS_LABELS: Record<string, string> = {
  draft: 'Draft',
  published: 'Terbuka',
  ongoing: 'Berlangsung',
  completed: 'Selesai',
  archived: 'Arsip',
}

const STATUS_VARIANT: Record<string, 'default' | 'secondary' | 'outline'> = {
  draft: 'secondary',
  published: 'default',
  ongoing: 'default',
  completed: 'outline',
  archived: 'outline',
}

export default function MyEventsPage() {
  const { isAuthenticated, isLoading: authLoading } = useAuthStore()
  const [events, setEvents] = useState<MyEventRegistration[]>([])
  const [loading, setLoading] = useState(true)

  const loadData = useCallback(async () => {
    if (!isAuthenticated || authLoading) return
    try {
      const data = await api.get<MyEventRegistration[]>('/my-events')
      setEvents(Array.isArray(data) ? data : [])
    } catch {
      console.error('Gagal memuat data event')
    } finally {
      setLoading(false)
    }
  }, [isAuthenticated, authLoading])

  useEffect(() => {
    loadData()
  }, [loadData])

  if (authLoading || loading) {
    return (
      <DashboardLayout>
        <div className="space-y-4">
          <Skeleton className="h-10 w-64 bg-stone-100 dark:bg-zinc-800" />
          {[1, 2, 3].map(i => (
            <Skeleton key={i} className="h-24 w-full bg-stone-100 dark:bg-zinc-800" />
          ))}
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout>
      <PageHeader
        title="Event Saya"
        description="Event yang tim kamu ikuti"
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Event' },
        ]}
      />

      {events.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-stone-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 py-16 px-4 text-center">
          <Trophy size={48} className="text-stone-300 dark:text-zinc-600 mb-4" />
          <p className="text-lg font-semibold text-stone-600 dark:text-zinc-400">Belum ada event</p>
          <p className="mt-1 text-sm text-stone-400 dark:text-zinc-500">Tim kamu belum terdaftar di event manapun.</p>
          <Link href="/events" className="mt-4">
            <span className="inline-flex items-center gap-1.5 text-sm font-medium text-esi-red hover:underline">
              Cari Event <ArrowRight size={14} />
            </span>
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {events.map((reg) => (
            <Link key={reg.id} href={`/events/${reg.event_slug}`}>
              <div className="group rounded-xl border border-stone-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 p-4 transition-all hover:shadow-md hover:border-esi-red/30">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-esi-red/10">
                      <Trophy size={20} weight="fill" className="text-esi-red" />
                    </div>
                    <div className="min-w-0">
                      <p className="font-semibold text-stone-900 dark:text-zinc-100 truncate">{reg.event_name}</p>
                      <div className="flex items-center gap-3 mt-0.5 text-xs text-stone-500 dark:text-zinc-400">
                        <span className="flex items-center gap-1">
                          <Users size={12} /> {reg.team_name}
                        </span>
                        {reg.event_start_date && (
                          <span className="flex items-center gap-1">
                            <CalendarBlank size={12} />
                            {new Date(reg.event_start_date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Badge variant={STATUS_VARIANT[reg.event_status] ?? 'secondary'}>
                      {STATUS_LABELS[reg.event_status] ?? reg.event_status}
                    </Badge>
                    <ArrowRight size={16} className="text-stone-400 dark:text-zinc-500 group-hover:text-esi-red transition-colors" />
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </DashboardLayout>
  )
}
