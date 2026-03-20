'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  Users,
  Sword,
  PaperPlaneTilt,
  ArrowRight,
  GameController,
  Student,
  Lock,
  WarningCircle,
  Trophy,
  Eye,
  Clock,
} from '@phosphor-icons/react'
import { DashboardLayout } from '@/components/layouts/DashboardLayout'
import { useAuthStore } from '@/store/auth-store'
import { api } from '@/lib/api'
import { EmptyState } from '@/components/shared/EmptyState'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { CountdownTimer } from '@/components/shared/CountdownTimer'
import type { BracketMatch, TeamMember } from '@/types'

interface DashboardData {
  team: {
    id: string
    name: string
    game_name: string
    game_slug: string
    school_name: string
    members: TeamMember[]
  } | null
  next_match: BracketMatch | null
}

export default function DashboardPage() {
  const router = useRouter()
  const { user, isAuthenticated, isLoading: authLoading } = useAuthStore()
  const [data, setData] = useState<DashboardData | null>(null)

  useEffect(() => {
    if (!isAuthenticated || authLoading) return
    loadData()
  }, [isAuthenticated, authLoading])

  async function loadData() {
    try {
      const result = await api.get<DashboardData>('/player/dashboard')
      setData(result)
    } catch (err) {
      console.error('Gagal memuat dashboard:', err)
      setData({ team: null, next_match: null })
    }
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Welcome */}
        <div className="rounded-xl border border-porjar-border bg-white p-5 shadow-sm">
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-porjar-red/10">
              <GameController size={28} weight="duotone" className="text-porjar-red" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-porjar-text">
                Halo, {user?.full_name ?? 'Player'}!
              </h1>
              <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-porjar-muted">
                {data?.team ? (
                  <span>
                    Kamu terdaftar di{' '}
                    <span className="font-semibold text-porjar-red">{data.team.game_name}</span>
                    {user?.tingkat && (
                      <> ({user.tingkat})</>
                    )}
                  </span>
                ) : (
                  <span>Selamat datang di PORJAR Esport</span>
                )}
              </div>
              <div className="mt-1.5 flex flex-wrap items-center gap-2">
                {user?.tingkat && (
                  <span className="inline-flex items-center gap-1 rounded-full border border-blue-200 bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700">
                    <Student size={12} />
                    {user.tingkat}
                  </span>
                )}
                {data?.team && (
                  <span className="inline-flex items-center gap-1 rounded-full border border-porjar-red/20 bg-porjar-red/5 px-2 py-0.5 text-xs font-medium text-porjar-red">
                    <Sword size={12} />
                    {data.team.game_name}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Force password change banner */}
        {user?.needs_password_change && (
          <Link
            href="/dashboard/change-password"
            className="flex items-center gap-3 rounded-xl border-2 border-amber-300 bg-amber-50 p-4 shadow-sm transition-all hover:border-amber-400 hover:shadow-md"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-100">
              <Lock size={22} weight="bold" className="text-amber-700" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-bold text-amber-900">Ubah password default kamu</p>
              <p className="text-xs text-amber-700">Demi keamanan, segera ubah password NISN menjadi password unik</p>
            </div>
            <ArrowRight size={18} className="text-amber-600" />
          </Link>
        )}

        {/* Team Info Card */}
        {data?.team && (
          <div className="rounded-xl border border-porjar-border bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <h2 className="flex items-center gap-2 text-base font-bold text-porjar-text">
                <Users size={18} weight="bold" />
                Tim Saya
              </h2>
              <Link
                href={`/dashboard/teams`}
                className="text-xs font-semibold text-porjar-red hover:underline"
              >
                Detail
              </Link>
            </div>
            <div className="rounded-lg border border-porjar-border bg-porjar-bg p-4">
              <p className="text-sm font-bold text-porjar-text">{data.team.name}</p>
              <p className="text-xs text-porjar-muted">{data.team.school_name}</p>
              {data.team.members.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1">
                  {data.team.members.map((m) => (
                    <span
                      key={m.id}
                      className="rounded-md bg-white px-1.5 py-0.5 text-[10px] font-medium text-porjar-muted border border-porjar-border"
                    >
                      {m.full_name}
                      {m.role === 'captain' && ' (C)'}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Next Match Card */}
        {data?.next_match && (
          <div className="rounded-xl border border-porjar-border bg-white shadow-sm overflow-hidden">
            <div className="bg-porjar-bg px-5 py-2.5 flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-porjar-muted">
                Pertandingan Berikutnya
              </span>
              <StatusBadge status={data.next_match.status} />
            </div>
            <div className="p-5">
              <div className="flex items-center justify-center gap-6">
                <div className="flex-1 text-center">
                  <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-lg bg-porjar-red/10">
                    <span className="text-lg font-bold text-porjar-red">
                      {data.next_match.team_a?.name?.charAt(0) ?? '?'}
                    </span>
                  </div>
                  <p className="text-xs font-semibold text-porjar-text truncate">
                    {data.next_match.team_a?.name ?? 'TBD'}
                  </p>
                </div>
                <span className="text-xl font-bold text-stone-400">VS</span>
                <div className="flex-1 text-center">
                  <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-lg bg-stone-100">
                    <span className="text-lg font-bold text-stone-500">
                      {data.next_match.team_b?.name?.charAt(0) ?? '?'}
                    </span>
                  </div>
                  <p className="text-xs font-semibold text-porjar-text truncate">
                    {data.next_match.team_b?.name ?? 'TBD'}
                  </p>
                </div>
              </div>
              {data.next_match.scheduled_at && (
                <div className="mt-4 text-center">
                  <CountdownTimer
                    targetDate={data.next_match.scheduled_at}
                    label="Dimulai dalam"
                    size="sm"
                  />
                </div>
              )}
              <p className="mt-2 text-center text-xs text-porjar-muted">
                Round {data.next_match.round} - Match #{data.next_match.match_number}
              </p>
            </div>
          </div>
        )}

        {/* Quick Links */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <QuickLinkCard
            href="/dashboard/my-matches"
            icon={Sword}
            label="Pertandingan"
            color="text-porjar-red"
            bg="bg-porjar-red/10"
          />
          <QuickLinkCard
            href="/dashboard/submit-result"
            icon={PaperPlaneTilt}
            label="Kirim Bukti"
            color="text-blue-600"
            bg="bg-blue-50"
          />
          <QuickLinkCard
            href="/tournaments"
            icon={Trophy}
            label="Lihat Bracket"
            color="text-amber-600"
            bg="bg-amber-50"
          />
          <QuickLinkCard
            href="/dashboard/change-password"
            icon={Lock}
            label="Ubah Password"
            color="text-stone-600"
            bg="bg-stone-100"
          />
        </div>

        {/* Empty state if no team */}
        {data && !data.team && (
          <div className="rounded-xl border border-porjar-border bg-white p-6 shadow-sm">
            <EmptyState
              icon={Users}
              title="Belum ada tim"
              description="Kamu belum terdaftar di tim manapun. Buat tim baru atau minta captain untuk mengundang kamu."
              actionLabel="Buat Tim Baru"
              onAction={() => router.push('/dashboard/teams/create')}
            />
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}

function QuickLinkCard({
  href,
  icon: IconComp,
  label,
  color,
  bg,
}: {
  href: string
  icon: React.ComponentType<{ size?: number; weight?: 'duotone' | 'fill' | 'regular' | 'bold' | 'light' | 'thin'; className?: string }>
  label: string
  color: string
  bg: string
}) {
  return (
    <Link
      href={href}
      className="flex flex-col items-center gap-2 rounded-xl border border-porjar-border bg-white p-4 shadow-sm transition-all hover:border-porjar-red/30 hover:shadow-md"
    >
      <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${bg}`}>
        <IconComp size={22} weight="duotone" className={color} />
      </div>
      <span className="text-xs font-semibold text-porjar-text">{label}</span>
    </Link>
  )
}
