'use client'

import { useEffect, useState, useCallback } from 'react'
import { api } from '@/lib/api'
import { useAuthStore } from '@/store/auth-store'
import { DashboardLayout } from '@/components/layouts/DashboardLayout'
import { PageHeader } from '@/components/shared/PageHeader'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import { Skeleton } from '@/components/ui/skeleton'
import { Trophy, Star } from '@phosphor-icons/react'
import type { EnrichedUserPoints } from '@/types'

export default function MyPointsPage() {
  const { isAuthenticated, isLoading: authLoading } = useAuthStore()
  const [points, setPoints] = useState<EnrichedUserPoints[]>([])
  const [loading, setLoading] = useState(true)

  const loadData = useCallback(async () => {
    if (!isAuthenticated || authLoading) return
    try {
      const data = await api.get<EnrichedUserPoints[]>('/my-points')
      setPoints(Array.isArray(data) ? data : [])
    } catch {
      console.error('Gagal memuat poin')
    } finally {
      setLoading(false)
    }
  }, [isAuthenticated, authLoading])

  useEffect(() => {
    loadData()
  }, [loadData])

  const totalPoints = points.reduce((sum, p) => sum + p.points, 0)

  if (authLoading || loading) {
    return (
      <DashboardLayout>
        <div className="space-y-4">
          <Skeleton className="h-10 w-64 bg-stone-100 dark:bg-zinc-800" />
          <Skeleton className="h-64 w-full bg-stone-100 dark:bg-zinc-800" />
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout>
      <PageHeader
        title="Poin Saya"
        description="Riwayat poin yang didapat dari event"
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Poin' },
        ]}
      />

      {/* Total Points Card */}
      <div className="mb-6 flex items-center gap-4 rounded-xl border border-stone-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 p-6 shadow-sm">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-esi-red/10">
          <Star size={24} weight="fill" className="text-esi-red" />
        </div>
        <div>
          <p className="text-sm text-stone-500 dark:text-zinc-400">Total Poin</p>
          <p className="text-3xl font-bold text-stone-900 dark:text-zinc-100">{totalPoints}</p>
        </div>
      </div>

      {/* Points History */}
      <div className="rounded-xl border border-stone-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="border-stone-200 dark:border-zinc-700 bg-esi-red/5 hover:bg-esi-red/5">
                <TableHead className="text-stone-600 dark:text-zinc-400 font-semibold">Event</TableHead>
                <TableHead className="text-stone-600 dark:text-zinc-400 font-semibold">Turnamen</TableHead>
                <TableHead className="text-stone-600 dark:text-zinc-400 font-semibold">Tim</TableHead>
                <TableHead className="text-stone-600 dark:text-zinc-400 font-semibold">Ranking</TableHead>
                <TableHead className="text-right text-stone-600 dark:text-zinc-400 font-semibold">Poin</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {points.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-stone-400 dark:text-zinc-500">
                    Belum ada poin. Ikuti event dan menangkan turnamen!
                  </TableCell>
                </TableRow>
              ) : (
                points.map((p) => (
                  <TableRow key={p.id} className="border-stone-100 dark:border-zinc-800 hover:bg-stone-50 dark:hover:bg-zinc-800/50">
                    <TableCell>
                      <span className="font-medium text-stone-900 dark:text-zinc-100">{p.event_name}</span>
                    </TableCell>
                    <TableCell className="text-stone-600 dark:text-zinc-400">{p.tournament_name}</TableCell>
                    <TableCell className="text-stone-500 dark:text-zinc-400">{p.team_name}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1.5">
                        {p.rank_position <= 3 && (
                          <Trophy
                            size={14}
                            weight="fill"
                            className={
                              p.rank_position === 1 ? 'text-amber-500' :
                              p.rank_position === 2 ? 'text-stone-400' : 'text-amber-700'
                            }
                          />
                        )}
                        <span className="font-medium text-stone-900 dark:text-zinc-100">Juara {p.rank_position}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-right font-bold text-esi-red tabular-nums">+{p.points}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </DashboardLayout>
  )
}
