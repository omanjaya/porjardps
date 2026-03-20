'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import {
  Users,
  GameController,
  MagnifyingGlass,
} from '@phosphor-icons/react'
import { CoachLayout } from '@/components/layouts/CoachLayout'
import { PageHeader } from '@/components/shared/PageHeader'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { api } from '@/lib/api'
import { cn, mediaUrl } from '@/lib/utils'

interface CoachTeam {
  id: string
  name: string
  game_name: string
  game_slug: string
  member_count: number
  max_members: number
  status: string
  logo_url: string | null
  captain_name: string | null
}

export default function CoachTeamsPage() {
  const [teams, setTeams] = useState<CoachTeam[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  useEffect(() => {
    async function loadTeams() {
      try {
        const data = await api.get<CoachTeam[]>('/coach/teams')
        setTeams(data ?? [])
      } catch (err) {
        console.error('Gagal memuat tim coach:', err)
      } finally {
        setLoading(false)
      }
    }
    loadTeams()
  }, [])

  const filtered = teams.filter(t => {
    if (!search) return true
    const q = search.toLowerCase()
    return t.name.toLowerCase().includes(q) || t.game_name.toLowerCase().includes(q)
  })

  return (
    <CoachLayout>
      <PageHeader
        title="Tim Sekolah"
        description="Semua tim esport dari sekolah kamu"
        breadcrumbs={[
          { label: 'Coach', href: '/coach' },
          { label: 'Tim' },
        ]}
      />

      {/* Search */}
      <div className="mb-4 relative">
        <MagnifyingGlass size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-porjar-muted" />
        <Input
          placeholder="Cari tim..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="pl-9 border-stone-200 focus:border-porjar-red focus:ring-porjar-red/20"
        />
      </div>

      {/* Teams grid */}
      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-36 rounded-xl bg-porjar-border" />
          ))}
        </div>
      ) : filtered.length > 0 ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map(team => (
            <Link
              key={team.id}
              href={`/teams/${team.id}`}
              className="group rounded-xl border border-stone-200 bg-white p-5 shadow-sm transition-all hover:border-porjar-red/30 hover:shadow-md"
            >
              <div className="mb-3 flex items-center justify-between">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-porjar-red/10">
                  {team.logo_url ? (
                    <Image src={mediaUrl(team.logo_url)!} alt={team.name} width={40} height={40} className="h-10 w-10 rounded-lg object-cover" unoptimized />
                  ) : (
                    <GameController size={24} weight="duotone" className="text-porjar-red" />
                  )}
                </div>
                <span
                  className={cn(
                    '-skew-x-2 rounded px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider',
                    team.status === 'approved' || team.status === 'active'
                      ? 'bg-green-100 text-green-700'
                      : team.status === 'pending'
                        ? 'bg-amber-100 text-amber-700'
                        : team.status === 'rejected'
                          ? 'bg-red-100 text-red-700'
                          : 'bg-stone-100 text-stone-600'
                  )}
                >
                  {team.status}
                </span>
              </div>

              <h3 className="text-sm font-bold text-porjar-text group-hover:text-porjar-red transition-colors">
                {team.name}
              </h3>

              <div className="mt-2 flex items-center gap-3 text-xs text-porjar-muted">
                <span className="flex items-center gap-1">
                  <GameController size={12} />
                  {team.game_name}
                </span>
                <span className="flex items-center gap-1">
                  <Users size={12} />
                  {team.member_count}/{team.max_members}
                </span>
              </div>

              {team.captain_name && (
                <p className="mt-2 text-xs text-porjar-muted">
                  Captain: <span className="font-medium text-porjar-text">{team.captain_name}</span>
                </p>
              )}
            </Link>
          ))}
        </div>
      ) : (
        <div className="rounded-xl border border-stone-200 bg-white p-10 text-center shadow-sm">
          <Users size={40} weight="duotone" className="mx-auto mb-3 text-porjar-border" />
          <p className="text-sm text-porjar-muted">
            {search ? 'Tidak ada tim yang cocok' : 'Belum ada tim terdaftar dari sekolah kamu'}
          </p>
        </div>
      )}
    </CoachLayout>
  )
}
