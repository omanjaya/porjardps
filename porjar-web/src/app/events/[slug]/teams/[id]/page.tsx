'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import { ArrowLeft, GraduationCap, Trophy, Users } from '@phosphor-icons/react'
import { api, resolveMediaUrl } from '@/lib/api'
import { useEvent } from '@/contexts/EventContext'
import { EmptyState } from '@/components/shared/EmptyState'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { Skeleton } from '@/components/ui/skeleton'
import type { TeamDetail, Tournament } from '@/types'

export default function EventTeamDetailPage() {
  const event = useEvent()
  const params = useParams<{ slug: string; id: string }>()
  const [team, setTeam] = useState<TeamDetail | null>(null)
  const [tournaments, setTournaments] = useState<Tournament[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false

    async function load() {
      try {
        const [t, tournys] = await Promise.all([
          api.get<TeamDetail>(`/teams/${params.id}`),
          api
            .get<Tournament[] | { data?: Tournament[] }>(
              `/teams/${params.id}/tournaments?event_id=${event.id}`,
            )
            .catch(() => [] as Tournament[]),
        ])
        if (cancelled) return
        setTeam(t)
        const list: Tournament[] = Array.isArray(tournys)
          ? (tournys as Tournament[])
          : Array.isArray((tournys as { data?: Tournament[] })?.data)
            ? ((tournys as { data: Tournament[] }).data)
            : []
        setTournaments(list)
      } catch {
        if (!cancelled) setTeam(null)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()

    return () => {
      cancelled = true
    }
  }, [params.id, event.id])

  if (loading) {
    return (
      <div className="mx-auto max-w-4xl px-4 sm:px-6 py-6 sm:py-10 space-y-4">
        <Skeleton className="h-48 rounded-2xl bg-stone-100 dark:bg-zinc-800" />
        <Skeleton className="h-32 rounded-xl bg-stone-100 dark:bg-zinc-800" />
      </div>
    )
  }

  if (!team) {
    return (
      <div className="mx-auto max-w-4xl px-4 sm:px-6 py-10">
        <EmptyState
          icon={Users}
          title="Tim tidak ditemukan"
          description="Tim yang kamu cari tidak ada"
        />
      </div>
    )
  }

  const teamLogo = resolveMediaUrl(team.logo_url)
  const members = team.members ?? []

  return (
    <div className="mx-auto max-w-4xl px-4 sm:px-6 py-6 sm:py-10">
      {/* Back link */}
      <Link
        href={`/events/${event.slug}/teams`}
        className="inline-flex items-center gap-1 mb-4 text-sm font-semibold text-stone-500 hover:text-esi-red"
      >
        <ArrowLeft size={14} /> Kembali ke Daftar Tim
      </Link>

      {/* Hero */}
      <div className="rounded-2xl border border-stone-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 p-6 sm:p-8 mb-6">
        <div className="flex flex-col sm:flex-row items-center gap-4">
          {teamLogo ? (
            <Image
              src={teamLogo}
              alt=""
              width={80}
              height={80}
              className="h-20 w-20 rounded-2xl object-cover"
              unoptimized
            />
          ) : (
            <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-esi-red/10">
              <Users size={32} weight="duotone" className="text-esi-red" />
            </div>
          )}
          <div className="flex-1 text-center sm:text-left">
            <h1 className="text-2xl font-black text-stone-900 dark:text-zinc-100">
              {team.name}
            </h1>
            <div className="mt-2 flex flex-wrap items-center justify-center sm:justify-start gap-3 text-sm text-stone-500 dark:text-zinc-400">
              {team.school?.name && (
                <span className="flex items-center gap-1">
                  <GraduationCap size={14} />
                  {team.school.name}
                </span>
              )}
              {team.game?.name && (
                <span className="flex items-center gap-1">
                  <Trophy size={14} />
                  {team.game.name}
                </span>
              )}
            </div>
            <div className="mt-2">
              <StatusBadge status={team.status} />
            </div>
          </div>
        </div>
      </div>

      {/* Members */}
      <div className="rounded-2xl border border-stone-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 p-6 mb-6">
        <h2 className="text-sm font-bold uppercase tracking-widest text-stone-500 dark:text-zinc-400 mb-4">
          Anggota Tim
        </h2>
        {members.length > 0 ? (
          <div className="space-y-2">
            {members.map((m) => (
              <div
                key={m.id}
                className="flex items-center gap-3 rounded-lg p-2 hover:bg-stone-50 dark:hover:bg-zinc-800"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-esi-red/10 font-bold text-esi-red">
                  {m.full_name?.[0] ?? '?'}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-stone-900 dark:text-zinc-100 truncate">
                    {m.full_name ?? '-'}
                  </p>
                  <p className="text-xs text-stone-500 dark:text-zinc-400">
                    {m.role === 'captain' ? 'Kapten' : m.role === 'substitute' ? 'Cadangan' : 'Anggota'}
                  </p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-stone-400 text-center py-4">Belum ada anggota</p>
        )}
      </div>

      {/* Tournaments in this event */}
      {tournaments.length > 0 && (
        <div className="rounded-2xl border border-stone-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 p-6">
          <h2 className="text-sm font-bold uppercase tracking-widest text-stone-500 dark:text-zinc-400 mb-4">
            Turnamen di {event.short_name || event.name}
          </h2>
          <div className="space-y-2">
            {tournaments.map((t) => (
              <Link
                key={t.id}
                href={`/events/${event.slug}/tournaments`}
                className="block rounded-lg border border-stone-200 dark:border-zinc-700 p-3 hover:border-esi-red transition-colors"
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-semibold text-stone-900 dark:text-zinc-100 truncate">
                      {t.name}
                    </p>
                    <p className="text-xs text-stone-500">{t.format}</p>
                  </div>
                  <StatusBadge status={t.status} />
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
