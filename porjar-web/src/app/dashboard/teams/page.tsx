'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useAuthStore } from '@/store/auth-store'
import { api } from '@/lib/api'
import { DashboardLayout } from '@/components/layouts/DashboardLayout'
import { PageHeader } from '@/components/shared/PageHeader'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { EmptyState } from '@/components/shared/EmptyState'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Users, Plus, GameController } from '@phosphor-icons/react'
import { mediaUrl } from '@/lib/utils'
import type { Team } from '@/types'

export default function MyTeamsPage() {
  const { isAuthenticated, isLoading: authLoading } = useAuthStore()
  const [teams, setTeams] = useState<Team[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!isAuthenticated || authLoading) return
    async function load() {
      try {
        const data = await api.get<Team[]>('/teams/my')
        setTeams(data ?? [])
      } catch (err) {
        console.error('Gagal memuat daftar tim:', err)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [isAuthenticated, authLoading])

  return (
    <DashboardLayout>
      <PageHeader
        title="Tim Saya"
        description="Daftar tim yang kamu ikuti"
        actions={
          <Link href="/dashboard/teams/create">
            <Button className="bg-porjar-red hover:bg-porjar-red-dark text-white">
              <Plus size={16} className="mr-1" />
              Buat Tim
            </Button>
          </Link>
        }
      />

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-20 rounded-lg bg-stone-200" />
          ))}
        </div>
      ) : teams.length === 0 ? (
        <EmptyState
          icon={Users}
          title="Belum Ada Tim"
          description="Kamu belum tergabung di tim manapun. Buat tim baru untuk mulai bertanding."
          actionLabel="Buat Tim"
          onAction={() => {
            window.location.href = '/dashboard/teams/create'
          }}
        />
      ) : (
        <div className="space-y-3">
          {teams.map((team) => (
            <Link
              key={team.id}
              href={`/dashboard/teams/${team.id}`}
              className="block rounded-xl border border-stone-200 bg-white p-3 sm:p-4 shadow-sm transition-colors hover:bg-stone-50"
            >
              <div className="flex items-center gap-3 sm:gap-4">
                {/* Logo */}
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-stone-100">
                  {team.logo_url ? (
                    <img
                      src={mediaUrl(team.logo_url)!}
                      alt=""
                      className="h-12 w-12 rounded-xl object-cover"
                    />
                  ) : (
                    <GameController size={24} className="text-stone-400" />
                  )}
                </div>

                {/* Info */}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-stone-900">{team.name}</h3>
                    <StatusBadge status={team.status} />
                  </div>
                  <div className="mt-0.5 flex items-center gap-3 text-xs text-stone-400">
                    <span>{team.game.name}</span>
                    {team.school && <span>{team.school.name}</span>}
                    <div className="flex items-center gap-1">
                      <Users size={10} />
                      <span>{team.member_count} anggota</span>
                    </div>
                  </div>
                </div>

                {/* Seed */}
                {team.seed != null && (
                  <span className="rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-bold text-amber-600 border border-amber-200">
                    Seed #{team.seed}
                  </span>
                )}
              </div>
            </Link>
          ))}
        </div>
      )}
    </DashboardLayout>
  )
}
