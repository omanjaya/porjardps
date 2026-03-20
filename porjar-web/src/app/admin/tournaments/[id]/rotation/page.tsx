'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams } from 'next/navigation'
import { toast } from 'sonner'
import { api } from '@/lib/api'
import { useAuthStore } from '@/store/auth-store'
import { AdminLayout } from '@/components/layouts/AdminLayout'
import { PageHeader } from '@/components/shared/PageHeader'
import { LobbyRotationManager } from '@/components/modules/admin/LobbyRotationManager'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Skeleton } from '@/components/ui/skeleton'
import type { Tournament, BRLobby } from '@/types'

export default function AdminRotationPage() {
  const { isAuthenticated, isLoading: authLoading } = useAuthStore()
  const params = useParams<{ id: string }>()
  const [tournament, setTournament] = useState<Tournament | null>(null)
  const [lobbies, setLobbies] = useState<BRLobby[]>([])
  const [loading, setLoading] = useState(true)
  const [activeDay, setActiveDay] = useState('1')

  const loadData = useCallback(async () => {
    if (!isAuthenticated || authLoading) return
    try {
      const [t, l] = await Promise.all([
        api.get<Tournament>(`/tournaments/${params.id}`),
        api.get<BRLobby[]>(`/tournaments/${params.id}/lobbies`),
      ])
      setTournament(t)
      setLobbies(l ?? [])
    } catch {
      toast.error('Gagal memuat data')
    } finally {
      setLoading(false)
    }
  }, [params.id, isAuthenticated, authLoading])

  useEffect(() => {
    loadData()
  }, [loadData])

  if (loading) {
    return (
      <AdminLayout>
        <Skeleton className="h-10 w-64 bg-slate-800" />
        <Skeleton className="mt-4 h-96 w-full bg-slate-800" />
      </AdminLayout>
    )
  }

  if (!tournament) {
    return (
      <AdminLayout>
        <div className="py-16 text-center text-slate-400">Turnamen tidak ditemukan.</div>
      </AdminLayout>
    )
  }

  // Get unique day numbers from lobbies
  const dayNumbers = [...new Set(lobbies.map((l) => l.day_number))].sort((a, b) => a - b)
  if (dayNumbers.length === 0) {
    dayNumbers.push(1)
  }

  return (
    <AdminLayout>
      <PageHeader
        title="Rotasi Lobby"
        description={tournament.name}
        breadcrumbs={[
          { label: 'Turnamen', href: '/admin/tournaments' },
          { label: tournament.name, href: `/admin/tournaments/${params.id}` },
          { label: 'Rotasi Lobby' },
        ]}
      />

      <Tabs value={activeDay} onValueChange={setActiveDay}>
        <TabsList className="bg-slate-800 border border-slate-700/50">
          {dayNumbers.map((day) => (
            <TabsTrigger
              key={day}
              value={String(day)}
              className="text-slate-300 data-active:text-slate-50"
            >
              Hari {day}
            </TabsTrigger>
          ))}
        </TabsList>

        {dayNumbers.map((day) => (
          <TabsContent key={day} value={String(day)} className="mt-4">
            <LobbyRotationManager
              tournamentId={params.id}
              dayNumber={day}
            />
          </TabsContent>
        ))}
      </Tabs>
    </AdminLayout>
  )
}
