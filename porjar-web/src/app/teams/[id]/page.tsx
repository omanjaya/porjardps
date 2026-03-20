'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import {
  Shield,
  Users,
  Trophy,
  Crown,
  UserCircle,
  ArrowsClockwise,
  Buildings,
  WarningCircle,
  TShirt,
  GameController,
  CaretLeft,
  Ranking,
} from '@phosphor-icons/react'
import { api } from '@/lib/api'
import { PublicLayout } from '@/components/layouts/PublicLayout'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { Skeleton } from '@/components/ui/skeleton'
import { GAME_CONFIG } from '@/constants/games'
import { cn, mediaUrl } from '@/lib/utils'
import type { TeamDetail, TeamMember, GameSlug } from '@/types'

const roleConfig: Record<string, { label: string; textColor: string; bgColor: string; borderColor: string; ring: string }> = {
  captain: {
    label: 'Kapten',
    textColor: 'text-amber-700',
    bgColor: 'bg-amber-50',
    borderColor: 'border-amber-200',
    ring: 'ring-2 ring-amber-400/30',
  },
  member: {
    label: 'Anggota',
    textColor: 'text-blue-700',
    bgColor: 'bg-blue-50',
    borderColor: 'border-blue-200',
    ring: 'ring-1 ring-stone-200',
  },
  substitute: {
    label: 'Cadangan',
    textColor: 'text-stone-500',
    bgColor: 'bg-stone-100',
    borderColor: 'border-stone-200',
    ring: 'ring-1 ring-stone-100',
  },
}

const roleIcons: Record<string, typeof Crown> = {
  captain: Crown,
  member: UserCircle,
  substitute: ArrowsClockwise,
}

function getInitials(name: string): string {
  return name.split(/\s+/).slice(0, 2).map((w) => w[0] ?? '').join('').toUpperCase()
}

/** Derive a stable hue (0–360) from a name string */
function nameToHue(name: string): number {
  let hash = 0
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash)
  }
  return Math.abs(hash) % 360
}

function MemberAvatar({ name, role, gameColor }: { name: string; role: string; gameColor?: string }) {
  const rc = roleConfig[role] ?? roleConfig.member
  const initials = getInitials(name)
  return (
    <div className={cn(
      'flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl font-heading text-sm font-black',
      role === 'captain' ? 'bg-amber-100 text-amber-700' : 'bg-stone-100 text-stone-500',
      rc.ring
    )}>
      {initials}
    </div>
  )
}

// ─── Pro Player Card ───────────────────────────────────────────────────────────

interface PlayerCardProps {
  member: TeamMember
  index: number
  gameAccentColor?: string
}

function PlayerCard({ member, index, gameAccentColor }: PlayerCardProps) {
  const isCaptain = member.role === 'captain'
  const isSubstitute = member.role === 'substitute'
  const initials = getInitials(member.full_name)
  const hue = nameToHue(member.full_name)

  const displayName = member.in_game_name || member.full_name
  const realName = (member.in_game_name && member.in_game_name !== member.full_name)
    ? member.full_name
    : null

  return (
    <div
      className={cn(
        'group relative flex w-40 shrink-0 snap-start flex-col overflow-hidden rounded-2xl',
        'border border-white/10 bg-gradient-to-b from-slate-800 to-slate-900',
        'cursor-default transition-all duration-300',
        'hover:scale-[1.04] hover:shadow-lg hover:shadow-black/40',
        isCaptain && 'hover:shadow-amber-500/20',
        'animate-in fade-in slide-in-from-bottom-3 duration-500 fill-mode-both',
      )}
      style={{ animationDelay: `${200 + index * 80}ms` }}
    >
      {/* Glow ring on hover */}
      <div className={cn(
        'pointer-events-none absolute inset-0 rounded-2xl opacity-0 transition-opacity duration-300 group-hover:opacity-100',
        isCaptain
          ? 'ring-2 ring-inset ring-amber-400/50'
          : 'ring-1 ring-inset ring-white/20',
      )} />

      {/* Captain badge — top-right corner */}
      {isCaptain && (
        <div className="absolute right-2 top-2 z-20 flex h-6 w-6 items-center justify-center rounded-full bg-amber-400 shadow-md shadow-amber-400/40">
          <Crown size={12} weight="fill" className="text-slate-900" />
        </div>
      )}

      {/* Substitute badge */}
      {isSubstitute && (
        <div className="absolute right-2 top-2 z-20 rounded-full bg-slate-700 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-slate-400 ring-1 ring-slate-600">
          SUB
        </div>
      )}

      {/* Photo / Initials area — 70% height */}
      <div
        className="relative flex h-[168px] w-full items-center justify-center overflow-hidden"
        style={{
          background: `linear-gradient(160deg, hsl(${hue},40%,22%) 0%, hsl(${hue},30%,13%) 100%)`,
        }}
      >
        {/* Subtle radial glow behind initials */}
        <div
          className="pointer-events-none absolute inset-0 opacity-40"
          style={{
            background: `radial-gradient(ellipse at 50% 60%, hsl(${hue},60%,40%) 0%, transparent 70%)`,
          }}
        />

        {/* Initials */}
        <span
          className="relative z-10 select-none font-heading text-5xl font-black tracking-tight text-white/80"
          style={{ textShadow: `0 2px 24px hsl(${hue},60%,30%)` }}
        >
          {initials}
        </span>

        {/* Jersey number chip — bottom-left of photo area */}
        {member.jersey_number != null && (
          <div className="absolute bottom-2 left-2 z-10 flex items-center gap-1 rounded-lg bg-black/50 px-1.5 py-0.5 backdrop-blur-sm">
            <TShirt size={10} className="text-white/60" />
            <span className="text-[10px] font-bold text-white/80">
              #{member.jersey_number}
            </span>
          </div>
        )}

        {/* Gradient fade into card body */}
        <div className="absolute bottom-0 left-0 right-0 h-8 bg-gradient-to-t from-slate-900/80 to-transparent" />
      </div>

      {/* Card body — 30% height */}
      <div className="flex flex-1 flex-col gap-0.5 px-3 pb-3 pt-2">
        {/* Role label (for non-captain, non-substitute) */}
        {!isCaptain && !isSubstitute && (
          <span className="text-[9px] font-bold uppercase tracking-widest text-slate-500">
            Pemain
          </span>
        )}
        {isCaptain && (
          <span className="text-[9px] font-bold uppercase tracking-widest text-amber-400/80">
            Kapten
          </span>
        )}

        {/* In-game name — primary label */}
        <p className="truncate font-heading text-sm font-black leading-tight text-white">
          {displayName}
        </p>

        {/* Real name under IGN */}
        {realName && (
          <p className="truncate text-[10px] text-slate-500 leading-tight">
            {realName}
          </p>
        )}

        {/* In-game ID */}
        {member.in_game_id && (
          <p className="mt-0.5 truncate font-mono text-[9px] text-amber-400/70">
            {member.in_game_id}
          </p>
        )}
      </div>
    </div>
  )
}

// ─── Roster Section ────────────────────────────────────────────────────────────

function RosterSection({
  members,
  gameAccentColor,
  gameConfig,
}: {
  members: TeamMember[]
  gameAccentColor?: string
  gameConfig: typeof GAME_CONFIG[keyof typeof GAME_CONFIG] | null
}) {
  const sorted = [...members].sort((a, b) => {
    const order = { captain: 0, member: 1, substitute: 2 }
    return (order[a.role as keyof typeof order] ?? 1) - (order[b.role as keyof typeof order] ?? 1)
  })

  return (
    <div
      className="mb-5 animate-in fade-in slide-in-from-bottom-4 duration-500 fill-mode-both"
      style={{ animationDelay: '80ms' }}
    >
      {/* Section header */}
      <div className="mb-3 flex items-center gap-2.5">
        <div className={cn(
          'flex h-7 w-7 items-center justify-center rounded-xl',
          gameConfig?.bgColor ?? 'bg-slate-800',
        )}>
          <Users size={14} weight="bold" className={gameConfig?.color ?? 'text-slate-400'} />
        </div>
        <h2 className="font-heading text-base font-black text-stone-900">Roster</h2>
        <span className="rounded-full bg-stone-100 px-2 py-0.5 text-[11px] font-bold text-stone-500">
          {sorted.length} Pemain
        </span>
      </div>

      {/* Horizontal scroll container */}
      <div className="relative">
        {/* Fade-out mask on the right edge */}
        <div className="pointer-events-none absolute right-0 top-0 z-10 h-full w-12 bg-gradient-to-l from-stone-100/80 to-transparent" />

        <div className="flex gap-3 overflow-x-auto pb-3 scroll-smooth snap-x snap-mandatory [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {sorted.length === 0 ? (
            <div className="flex w-full flex-col items-center py-10 text-center">
              <Users size={32} weight="thin" className="mb-2 text-stone-300" />
              <p className="text-sm text-stone-500">Belum ada anggota</p>
            </div>
          ) : (
            sorted.map((member, i) => (
              <PlayerCard
                key={member.id}
                member={member}
                index={i}
                gameAccentColor={gameConfig?.color}
              />
            ))
          )}
        </div>
      </div>
    </div>
  )
}

export default function TeamDetailPage() {
  const params = useParams<{ id: string }>()
  const [team, setTeam] = useState<TeamDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function load() {
      try {
        const data = await api.get<TeamDetail>(`/teams/${params.id}`)
        setTeam(data)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Gagal memuat data tim')
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
          <Skeleton className="h-52 rounded-2xl bg-stone-100" />
          <Skeleton className="h-64 rounded-2xl bg-stone-100" />
          <Skeleton className="h-36 rounded-2xl bg-stone-100" />
        </div>
      </PublicLayout>
    )
  }

  if (error || !team) {
    return (
      <PublicLayout>
        <div className="flex flex-col items-center justify-center rounded-2xl border border-stone-100 bg-stone-50 py-24 text-center">
          <WarningCircle size={48} weight="thin" className="mb-3 text-stone-300" />
          <p className="text-base font-semibold text-stone-600">{error ? 'Terjadi Kesalahan' : 'Tim Tidak Ditemukan'}</p>
          <p className="mt-1 text-sm text-stone-400">{error ?? 'Tim yang kamu cari tidak ada atau sudah dihapus.'}</p>
          <Link href="/teams" className="mt-6 flex items-center gap-1.5 text-sm font-semibold text-porjar-red hover:underline">
            <CaretLeft size={14} />
            Kembali ke daftar tim
          </Link>
        </div>
      </PublicLayout>
    )
  }

  const gameSlug = team.game?.slug as GameSlug | undefined
  const gameConfig = gameSlug ? GAME_CONFIG[gameSlug] : null
  const GameIcon = gameConfig?.icon ?? GameController
  const sortedMembers = [...(team.members ?? [])].sort((a, b) => {
    const order = { captain: 0, member: 1, substitute: 2 }
    return (order[a.role as keyof typeof order] ?? 1) - (order[b.role as keyof typeof order] ?? 1)
  })
  const members = team.members ?? []

  return (
    <PublicLayout>
      {/* Breadcrumb */}
      <div className="mb-5 flex items-center gap-2 text-sm animate-in fade-in duration-300">
        <Link href="/teams" className="flex items-center gap-1 text-stone-400 hover:text-stone-600 transition-colors">
          <CaretLeft size={13} />
          Tim Peserta
        </Link>
        <span className="text-stone-300">/</span>
        <span className="font-medium text-stone-700 truncate">{team.name}</span>
      </div>

      {/* Hero banner */}
      <div
        className={cn(
          'relative mb-6 overflow-hidden rounded-2xl border shadow-md animate-in fade-in slide-in-from-bottom-4 duration-500',
          gameConfig?.borderColor ?? 'border-stone-200'
        )}
      >
        {/* Game art background */}
        {gameConfig?.bgImage && (
          <div
            className="pointer-events-none absolute inset-0 bg-cover bg-center"
            style={{ backgroundImage: `url(${gameConfig.bgImage})` }}
          />
        )}
        {/* Dark gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-r from-stone-900/90 via-stone-900/75 to-stone-900/40" />

        {/* Content */}
        <div className="relative flex flex-col gap-5 p-6 sm:flex-row sm:items-center sm:gap-8">
          {/* Logo */}
          <div className={cn(
            'flex h-24 w-24 shrink-0 items-center justify-center rounded-2xl border-2 overflow-hidden',
            gameConfig ? `${gameConfig.bgColor} border-white/20` : 'bg-stone-700 border-white/20'
          )}>
            {team.logo_url ? (
              <Image src={mediaUrl(team.logo_url)!} alt="" width={96} height={96} className="h-24 w-24 object-cover" unoptimized />
            ) : team.school?.logo_url ? (
              <Image src={mediaUrl(team.school.logo_url)!} alt={team.school.name} width={64} height={64} className="h-16 w-16 object-contain" unoptimized />
            ) : (
              <span className="font-heading text-3xl font-black text-white">
                {getInitials(team.name)}
              </span>
            )}
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <div className="mb-2 flex flex-wrap items-center gap-2">
              <StatusBadge status={team.status} />
              {gameConfig && (
                <span className={cn(
                  'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-bold',
                  'bg-white/10 text-white border border-white/20'
                )}>
                  <img src={gameConfig.logo} alt="" className="h-4 w-4 object-contain" />
                  {team.game?.name}
                </span>
              )}
            </div>

            <h1 className="font-heading text-2xl font-black tracking-tight text-white sm:text-3xl truncate">
              {team.name}
            </h1>

            <div className="mt-2 flex flex-wrap items-center gap-4 text-sm text-white/70">
              {team.school && (
                <span className="flex items-center gap-1.5">
                  <Buildings size={14} className="text-white/50" />
                  {team.school.name}
                  <span className="rounded bg-white/10 px-1.5 py-0.5 text-[10px] font-bold text-white/60">
                    {team.school.level}
                  </span>
                </span>
              )}
              <span className="flex items-center gap-1.5">
                <Users size={14} className="text-white/50" />
                {team.member_count} anggota
              </span>
              {team.seed != null && (
                <span className="flex items-center gap-1.5">
                  <Ranking size={14} className="text-white/50" />
                  Seed #{team.seed}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Bottom game color stripe */}
        <div className={cn('h-1 w-full', gameConfig?.stripeBg ?? 'bg-stone-600')} />
      </div>

      {/* Pro Player Roster Cards */}
      {members.length > 0 && (
        <RosterSection
          members={members}
          gameConfig={gameConfig}
        />
      )}

      <div className="grid gap-5 lg:grid-cols-3">
        {/* Members — takes 2 cols */}
        <div
          className="lg:col-span-2 animate-in fade-in slide-in-from-bottom-4 duration-500 fill-mode-both"
          style={{ animationDelay: '100ms' }}
        >
          <div className="rounded-2xl border border-stone-200 bg-white shadow-sm overflow-hidden">
            {/* Section header */}
            <div className={cn('flex items-center gap-3 border-b border-stone-100 px-5 py-4')}>
              <div className={cn('flex h-8 w-8 items-center justify-center rounded-xl', gameConfig?.bgColor ?? 'bg-stone-100')}>
                <Users size={16} weight="bold" className={gameConfig?.color ?? 'text-stone-500'} />
              </div>
              <h2 className="font-bold text-stone-900">Anggota Tim</h2>
              <span className="ml-auto rounded-full bg-stone-100 px-2.5 py-0.5 text-xs font-bold text-stone-500">
                {sortedMembers.length}
              </span>
            </div>

            {sortedMembers.length === 0 ? (
              <div className="flex flex-col items-center py-12 text-center">
                <Users size={36} weight="thin" className="mb-2 text-stone-300" />
                <p className="text-sm text-stone-500">Belum ada anggota</p>
              </div>
            ) : (
              <div className="divide-y divide-stone-50">
                {sortedMembers.map((member, i) => {
                  const rc = roleConfig[member.role] ?? roleConfig.member
                  const RoleIcon = roleIcons[member.role] ?? UserCircle

                  return (
                    <div
                      key={member.id}
                      className={cn(
                        'flex items-center gap-4 px-5 py-3.5 transition-colors hover:bg-stone-50/60',
                        'animate-in fade-in slide-in-from-left-2 duration-300 fill-mode-both',
                        member.role === 'captain' ? 'bg-amber-50/30' : ''
                      )}
                      style={{ animationDelay: `${150 + i * 50}ms` }}
                    >
                      {/* Avatar */}
                      <MemberAvatar name={member.full_name} role={member.role} />

                      {/* Info */}
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="truncate text-sm font-semibold text-stone-900">
                            {member.in_game_name || member.full_name}
                          </span>
                          <span className={cn(
                            'shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide',
                            rc.textColor, rc.bgColor, rc.borderColor
                          )}>
                            {rc.label}
                          </span>
                        </div>
                        <div className="mt-0.5 flex items-center gap-3">
                          {member.in_game_name && member.full_name !== member.in_game_name && (
                            <span className="text-xs text-stone-400">{member.full_name}</span>
                          )}
                          {member.in_game_id && (
                            <span className="text-[11px] text-stone-400 font-mono">
                              ID: {member.in_game_id}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Right side */}
                      <div className="flex items-center gap-3 shrink-0">
                        {member.jersey_number != null && (
                          <div className="flex items-center gap-1 rounded-lg border border-stone-200 bg-stone-50 px-2 py-1">
                            <TShirt size={12} className="text-stone-400" />
                            <span className="text-xs font-bold text-stone-600">
                              #{member.jersey_number}
                            </span>
                          </div>
                        )}
                        {member.role === 'captain' && (
                          <Crown size={16} weight="fill" className="text-amber-400" />
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>

        {/* Sidebar: tournaments */}
        <div
          className="animate-in fade-in slide-in-from-bottom-4 duration-500 fill-mode-both"
          style={{ animationDelay: '200ms' }}
        >
          <div className="rounded-2xl border border-stone-200 bg-white shadow-sm overflow-hidden">
            <div className="flex items-center gap-3 border-b border-stone-100 px-5 py-4">
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-amber-50">
                <Trophy size={16} weight="bold" className="text-amber-500" />
              </div>
              <h2 className="font-bold text-stone-900">Turnamen</h2>
              <span className="ml-auto rounded-full bg-stone-100 px-2.5 py-0.5 text-xs font-bold text-stone-500">
                {(team.tournaments ?? []).length}
              </span>
            </div>

            {(team.tournaments ?? []).length === 0 ? (
              <div className="flex flex-col items-center py-10 text-center">
                <Trophy size={32} weight="thin" className="mb-2 text-stone-300" />
                <p className="text-sm text-stone-500">Belum mengikuti turnamen</p>
              </div>
            ) : (
              <div className="divide-y divide-stone-50">
                {(team.tournaments ?? []).map((t, i) => (
                  <Link
                    key={t.id}
                    href={`/tournaments/${t.id}`}
                    className="flex items-center justify-between gap-3 px-5 py-3.5 transition-colors hover:bg-stone-50"
                    style={{ animationDelay: `${200 + i * 50}ms` }}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-amber-50">
                        <Trophy size={13} weight="fill" className="text-amber-400" />
                      </div>
                      <span className="truncate text-sm font-medium text-stone-800">
                        {t.name}
                      </span>
                    </div>
                    <StatusBadge status={t.status} />
                  </Link>
                ))}
              </div>
            )}
          </div>

          {/* Game info card */}
          {gameConfig && (
            <div
              className={cn(
                'mt-4 relative overflow-hidden rounded-2xl border p-5 animate-in fade-in duration-500 fill-mode-both',
                gameConfig.borderColor
              )}
              style={{ animationDelay: '300ms' }}
            >
              {gameConfig.bgImage && (
                <div
                  className="pointer-events-none absolute inset-0 bg-cover bg-center opacity-10"
                  style={{ backgroundImage: `url(${gameConfig.bgImage})` }}
                />
              )}
              <div className={cn('pointer-events-none absolute inset-0', gameConfig.bgColor, 'opacity-60')} />
              <div className="relative flex items-center gap-3">
                <div className={cn('flex h-12 w-12 items-center justify-center rounded-2xl', gameConfig.bgColor)}>
                  <Image src={gameConfig.logo} alt="" width={32} height={32} className="h-8 w-8 object-contain" />
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-stone-500">Cabang</p>
                  <p className={cn('font-heading text-base font-black', gameConfig.color)}>
                    {team.game?.name}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </PublicLayout>
  )
}
