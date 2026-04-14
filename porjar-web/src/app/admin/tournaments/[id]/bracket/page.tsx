'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { toast } from 'sonner'
import { api } from '@/lib/api'
import { useAuthStore } from '@/store/auth-store'
import { AdminLayout } from '@/components/layouts/AdminLayout'
import { PageHeader } from '@/components/shared/PageHeader'
import { BracketManager } from '@/components/modules/admin/BracketManager'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { FileText, WarningCircle, List } from '@phosphor-icons/react'
import type { Tournament } from '@/types'

export default function AdminBracketPage() {
  const { isAuthenticated, isLoading: authLoading } = useAuthStore()
  const params = useParams<{ id: string }>()
  const [tournament, setTournament] = useState<Tournament | null>(null)
  const [loading, setLoading] = useState(true)

  const loadTournament = useCallback(async () => {
    if (!isAuthenticated || authLoading) return
    try {
      const t = await api.get<Tournament>(`/tournaments/${params.id}`)
      setTournament(t)
    } catch {
      toast.error('Gagal memuat data turnamen')
    } finally {
      setLoading(false)
    }
  }, [params.id, isAuthenticated, authLoading])

  useEffect(() => {
    loadTournament()
  }, [loadTournament])

  if (loading) {
    return (
      <AdminLayout>
        <Skeleton className="h-10 w-64 bg-stone-200" />
        <Skeleton className="mt-4 h-12 w-full bg-stone-200" />
        <Skeleton className="mt-4 h-96 w-full bg-stone-200" />
      </AdminLayout>
    )
  }

  const isBR = tournament?.format === 'battle_royale_points' || tournament?.format === 'battle_royale_placement'

  return (
    <AdminLayout>
      <PageHeader
        title="Kelola Bracket"
        description={tournament?.name}
        breadcrumbs={[
          { label: 'Turnamen', href: '/admin/tournaments' },
          { label: tournament?.name ?? '', href: `/admin/tournaments/${params.id}` },
          { label: 'Bracket' },
        ]}
        actions={
          !isBR ? (
            <Link href={`/admin/tournaments/${params.id}/report`}>
              <Button
                variant="outline"
                className="border-stone-300 text-stone-600 hover:bg-stone-50"
              >
                <FileText className="mr-2 h-4 w-4" />
                Laporan
              </Button>
            </Link>
          ) : undefined
        }
      />

      {isBR ? (
        <div className="rounded-xl border border-amber-200 dark:border-amber-800/50 bg-amber-50 dark:bg-amber-950/20 p-10 text-center">
          <WarningCircle size={40} weight="duotone" className="mx-auto mb-3 text-amber-500" />
          <p className="text-sm font-medium text-amber-800 dark:text-amber-300">
            Turnamen ini menggunakan format Battle Royale. Lihat halaman Lobby untuk manajemen pertandingan.
          </p>
          <Link href={`/admin/tournaments/${params.id}/lobbies`}>
            <Button className="mt-4 gap-1.5 bg-esi-red text-white hover:bg-esi-red/90">
              <List size={16} weight="duotone" />
              Ke Halaman Lobby
            </Button>
          </Link>
        </div>
      ) : tournament ? (
        <BracketManager
          tournamentId={params.id}
          format={tournament.format}
          bestOf={tournament.best_of}
          tournamentName={tournament.name}
        />
      ) : null}
    </AdminLayout>
  )
}
