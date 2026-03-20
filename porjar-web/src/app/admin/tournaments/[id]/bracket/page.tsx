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
import { FileText } from '@phosphor-icons/react'
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
          <Link href={`/admin/tournaments/${params.id}/report`}>
            <Button
              variant="outline"
              className="border-stone-300 text-stone-600 hover:bg-stone-50"
            >
              <FileText className="mr-2 h-4 w-4" />
              Laporan
            </Button>
          </Link>
        }
      />

      {tournament && (
        <BracketManager
          tournamentId={params.id}
          format={tournament.format}
          bestOf={tournament.best_of}
        />
      )}
    </AdminLayout>
  )
}
