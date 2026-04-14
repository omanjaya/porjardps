'use client'

import { useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import {
  Users,
  Sword,
  GameController,
  Student,
  Lock,
  ArrowRight,
  Trophy,
  PhoneCall,
  EnvelopeSimple,
  MapPin,
  Calendar,
  CheckCircle,
  Hourglass,
  Warning,
} from '@phosphor-icons/react'
import { DashboardLayout } from '@/components/layouts/DashboardLayout'
import { AnimatedCard } from '@/components/shared/AnimatedCard'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { api } from '@/lib/api'
import type { Team } from '@/types'
import { useAuthStore } from '@/store/auth-store'
import { MatchCountdownBanner } from '@/components/shared/MatchCountdownBanner'
import { PushOptIn } from '@/components/shared/PushOptIn'
import { useDashboardData } from './hooks/useDashboardData'
import { useOnboardingChecklist } from './hooks/useOnboardingChecklist'
import { OnboardingChecklist } from './components/OnboardingChecklist'
import { DashboardStats } from './components/DashboardStats'
import { UpcomingTournamentsSection } from './components/UpcomingTournamentsSection'
import { PastMatchesSection } from './components/PastMatchesSection'
import { QuickLinksSection } from './components/QuickLinksSection'
import { MyEventsWidget } from './components/MyEventsWidget'

export default function DashboardPage() {
  const { user } = useAuthStore()
  const { data, pastMatches, eventSettings, myStanding, totalTeams } = useDashboardData()
  const searchParams = useSearchParams()
  const isWelcome = searchParams?.get('welcome') === '1'
  const { requiredDone } = useOnboardingChecklist(user, !!data?.team, {
    teamRegistered: !!data?.team?.tournament_id,
  })
  const showChecklist = !requiredDone
  const showCelebration = isWelcome && requiredDone

  // Load all user teams to surface pending/rejected statuses at dashboard level
  const [myTeams, setMyTeams] = useState<Team[]>([])
  useEffect(() => {
    let cancelled = false
    api
      .get<Team[]>('/teams/my')
      .then((t) => { if (!cancelled) setMyTeams(Array.isArray(t) ? t : []) })
      .catch(() => { if (!cancelled) setMyTeams([]) })
    return () => { cancelled = true }
  }, [])
  const pendingTeams = myTeams.filter((t) => t.status === 'pending')
  const rejectedTeams = myTeams.filter((t) => t.status === 'rejected')
  const primaryTeamStatus =
    data?.team?.status ??
    myTeams.find((t) => t.id === data?.team?.id)?.status ??
    (data?.team ? 'active' : undefined)

  return (
    <DashboardLayout>
      <MatchCountdownBanner nextMatch={data?.next_match} />
      <div className="grid grid-cols-1 gap-6">
        {/* Welcome hero (only on first login via ?welcome=1) */}
        {isWelcome && (
        <AnimatedCard delay={0}>
          <div className="rounded-xl border border-esi-border bg-white dark:bg-zinc-900 p-4 sm:p-6 shadow-sm">
            <div className="flex items-center gap-3 sm:gap-4">
              <div className="flex h-12 w-12 sm:h-14 sm:w-14 shrink-0 items-center justify-center rounded-xl bg-esi-red/10">
                <GameController size={24} weight="duotone" className="text-esi-red" />
              </div>
              <div className="min-w-0">
                <h1 className="text-lg sm:text-xl font-bold text-esi-text truncate">
                  Halo, {user?.full_name ?? 'Player'}!
                </h1>
                <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-esi-muted">
                  {data?.team ? (
                    <span>
                      Kamu terdaftar di{' '}
                      <span className="font-semibold text-esi-red">{data.team.game_name}</span>
                      {user?.tingkat && <> ({user.tingkat})</>}
                    </span>
                  ) : (
                    <span>Selamat datang di ESI Esport</span>
                  )}
                </div>
                <div className="mt-1.5 flex flex-wrap items-center gap-2">
                  {user?.tingkat && (
                    <span className="inline-flex items-center gap-1 rounded-full border border-blue-200 dark:border-blue-800/50 bg-blue-50 dark:bg-blue-950/30 px-2 py-0.5 text-xs font-medium text-blue-700 dark:text-blue-300">
                      <Student size={12} />
                      {user.tingkat}
                    </span>
                  )}
                  {data?.team && (
                    <span className="inline-flex items-center gap-1 rounded-full border border-esi-red/20 bg-esi-red/5 px-2 py-0.5 text-xs font-medium text-esi-red">
                      <Sword size={12} />
                      {data.team.game_name}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
        </AnimatedCard>
        )}

        {/* Force password change banner */}
        {user?.needs_password_change && (
          <Link
            href="/dashboard/change-password"
            className="flex items-center gap-3 rounded-xl border-2 border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-950/30 p-4 shadow-sm transition-all hover:border-amber-400 dark:hover:border-amber-600 hover:shadow-md"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-100 dark:bg-amber-900/50">
              <Lock size={22} weight="bold" className="text-amber-700 dark:text-amber-300" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-bold text-amber-900 dark:text-amber-200">Ubah password default kamu</p>
              <p className="text-xs text-amber-700 dark:text-amber-300">Demi keamanan, segera ubah password NISN menjadi password unik</p>
            </div>
            <ArrowRight size={18} className="text-amber-600" />
          </Link>
        )}

        {/* Pending/rejected team aggregate banners */}
        {rejectedTeams.length > 0 && (
          <Link
            href={`/dashboard/teams/${rejectedTeams[0].id}`}
            className="flex items-center gap-3 rounded-xl border-2 border-red-300 dark:border-red-800 bg-red-50 dark:bg-red-950/30 p-4 shadow-sm transition-all hover:border-red-400 hover:shadow-md"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-red-100 dark:bg-red-900/50">
              <Warning size={22} weight="bold" className="text-red-700 dark:text-red-300" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-red-900 dark:text-red-200">
                {rejectedTeams.length} tim kamu ditolak
              </p>
              <p className="text-xs text-red-700 dark:text-red-300 truncate">Klik untuk detail</p>
            </div>
            <ArrowRight size={18} className="text-red-600 shrink-0" />
          </Link>
        )}
        {pendingTeams.length > 0 && (
          <Link
            href={`/dashboard/teams/${pendingTeams[0].id}`}
            className="flex items-center gap-3 rounded-xl border-2 border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-950/30 p-4 shadow-sm transition-all hover:border-amber-400 hover:shadow-md"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-100 dark:bg-amber-900/50">
              <Hourglass size={22} weight="bold" className="text-amber-700 dark:text-amber-300" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-amber-900 dark:text-amber-200">
                {pendingTeams.length} tim kamu menunggu persetujuan
              </p>
              <p className="text-xs text-amber-700 dark:text-amber-300 truncate">Admin akan meninjau segera</p>
            </div>
            <ArrowRight size={18} className="text-amber-600 shrink-0" />
          </Link>
        )}

        {/* Celebration when all steps done and arriving via welcome link */}
        {showCelebration && (
          <AnimatedCard delay={25}>
            <div className="rounded-xl border border-emerald-200 dark:border-emerald-800/50 bg-gradient-to-br from-emerald-50 via-white to-esi-red/5 dark:from-emerald-950/30 dark:via-zinc-900 dark:to-esi-red/10 p-4 sm:p-6 shadow-sm">
              <div className="flex items-start gap-3 sm:gap-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-emerald-100 dark:bg-emerald-900/50">
                  <Trophy size={26} weight="duotone" className="text-emerald-600" />
                </div>
                <div className="min-w-0 flex-1">
                  <h2 className="text-lg sm:text-xl font-bold text-esi-text">Kamu sudah siap bertanding!</h2>
                  <p className="mt-1 text-sm text-esi-muted">
                    Semua langkah awal sudah lengkap. Pantau jadwal dan hasil pertandingan di bawah.
                  </p>
                </div>
              </div>
            </div>
          </AnimatedCard>
        )}

        {/* Onboarding checklist — auto-hides when required steps complete */}
        {showChecklist && (
          <OnboardingChecklist
            user={user}
            hasTeam={!!data?.team}
            teamRegistered={!!data?.team?.tournament_id}
            variant={isWelcome ? 'welcome' : 'default'}
          />
        )}

        {/* Push notification opt-in — no-op when VAPID not configured */}
        <PushOptIn />

        {/* Team Info Card — or prominent empty state */}
        {data && !data.team && (
          <AnimatedCard delay={50}>
            <div className="rounded-xl border-2 border-dashed border-esi-red/30 bg-gradient-to-br from-esi-red/5 via-white to-transparent dark:from-esi-red/10 dark:via-zinc-900 p-4 sm:p-6 shadow-sm">
              <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-esi-red/10">
                  <Users size={28} weight="duotone" className="text-esi-red" />
                </div>
                <div className="min-w-0 flex-1">
                  <h2 className="text-base sm:text-lg font-bold text-esi-text">Belum punya tim?</h2>
                  <p className="mt-1 text-sm text-esi-muted">
                    Buat tim baru atau minta captain untuk mengundang kamu sebelum turnamen mulai.
                  </p>
                </div>
                <Link
                  href="/dashboard/teams/create"
                  className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-lg bg-esi-red px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-esi-red/90"
                >
                  Buat Tim
                  <ArrowRight size={16} weight="bold" />
                </Link>
              </div>
            </div>
          </AnimatedCard>
        )}
        {data?.team && (
          <AnimatedCard delay={75}>
            <div className="rounded-xl border border-esi-border bg-white dark:bg-zinc-900 p-4 sm:p-6 shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <h2 className="flex items-center gap-2 text-base font-bold text-esi-text">
                  <Users size={18} weight="bold" />
                  Tim Saya
                </h2>
                <Link
                  href={`/dashboard/teams`}
                  className="text-xs font-semibold text-esi-red hover:underline"
                >
                  Detail
                </Link>
              </div>
              <div className="rounded-lg border border-esi-border bg-esi-bg p-4">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-sm font-bold text-esi-text">{data.team.name}</p>
                  {primaryTeamStatus && <StatusBadge status={primaryTeamStatus} />}
                  {(primaryTeamStatus === 'approved' || primaryTeamStatus === 'active') && (
                    <CheckCircle size={14} weight="fill" className="text-green-600" />
                  )}
                </div>
                <p className="text-xs text-esi-muted">{data.team.school_name}</p>
                {primaryTeamStatus === 'pending' && (
                  <div className="mt-2 flex items-start gap-2 rounded-md border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/30 px-2.5 py-2 text-xs text-amber-800 dark:text-amber-300">
                    <Hourglass size={14} weight="bold" className="mt-0.5 shrink-0" />
                    <span>Tim menunggu persetujuan admin</span>
                  </div>
                )}
                {primaryTeamStatus === 'rejected' && (
                  <div className="mt-2 flex items-start gap-2 rounded-md border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950/30 px-2.5 py-2 text-xs text-red-800 dark:text-red-300">
                    <Warning size={14} weight="bold" className="mt-0.5 shrink-0" />
                    <span>
                      Tim ditolak{data.team.rejection_reason ? `: ${data.team.rejection_reason}` : '. Silakan hubungi admin untuk informasi lebih lanjut.'}
                    </span>
                  </div>
                )}
                {data.team.members.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1">
                    {data.team.members.map((m) => (
                      <span
                        key={m.id}
                        className="rounded-md bg-white dark:bg-zinc-900 px-1.5 py-0.5 text-[10px] font-medium text-esi-muted border border-esi-border"
                      >
                        {m.full_name}
                        {m.role === 'captain' && ' (C)'}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </AnimatedCard>
        )}

        {/* My Events — shows events the user's team(s) are registered in */}
        <MyEventsWidget hasTeam={!!data?.team || myTeams.length > 0} />

        {/* Upcoming matches — high priority for active players */}
        {data && <UpcomingTournamentsSection data={data} />}

        <DashboardStats
          myStanding={myStanding}
          totalTeams={totalTeams}
          tournamentId={data?.team?.tournament_id}
        />

        {/* Info Turnamen */}
        {eventSettings && (eventSettings.event_name || eventSettings.organizer || eventSettings.contact_phone || eventSettings.contact_email) && (
          <AnimatedCard delay={450}>
            <div className="rounded-xl border border-esi-border bg-white dark:bg-zinc-900 p-3 sm:p-5 shadow-sm">
              <h2 className="flex items-center gap-2 text-base font-bold text-esi-text mb-3">
                <Trophy size={18} weight="bold" className="text-amber-500" />
                Info Turnamen
              </h2>
              <div className="space-y-2.5">
                {(eventSettings.event_name || eventSettings.organizer) && (
                  <div className="rounded-lg border border-esi-border bg-esi-bg p-3">
                    {eventSettings.event_name && (
                      <p className="text-sm font-bold text-esi-text">{eventSettings.event_name}</p>
                    )}
                    {eventSettings.organizer && (
                      <p className="text-xs text-esi-muted mt-0.5">Penyelenggara: {eventSettings.organizer}</p>
                    )}
                  </div>
                )}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {eventSettings.contact_phone && (
                    <a
                      href={`tel:${eventSettings.contact_phone}`}
                      className="flex items-center gap-2.5 rounded-lg border border-esi-border p-3 transition-colors hover:border-esi-red/30 hover:bg-esi-red/[0.02]"
                    >
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-green-50 dark:bg-green-950/30">
                        <PhoneCall size={16} className="text-green-600" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-[10px] font-semibold uppercase tracking-wider text-esi-muted">Telepon</p>
                        <p className="text-xs font-medium text-esi-text truncate">{eventSettings.contact_phone}</p>
                      </div>
                    </a>
                  )}
                  {eventSettings.contact_email && (
                    <a
                      href={`mailto:${eventSettings.contact_email}`}
                      className="flex items-center gap-2.5 rounded-lg border border-esi-border p-3 transition-colors hover:border-esi-red/30 hover:bg-esi-red/[0.02]"
                    >
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-blue-50 dark:bg-blue-950/30">
                        <EnvelopeSimple size={16} className="text-blue-600" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-[10px] font-semibold uppercase tracking-wider text-esi-muted">Email</p>
                        <p className="text-xs font-medium text-esi-text truncate">{eventSettings.contact_email}</p>
                      </div>
                    </a>
                  )}
                  {eventSettings.venue && (
                    <div className="flex items-center gap-2.5 rounded-lg border border-esi-border p-3">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-purple-50 dark:bg-purple-950/30">
                        <MapPin size={16} className="text-purple-600" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-[10px] font-semibold uppercase tracking-wider text-esi-muted">Lokasi</p>
                        <p className="text-xs font-medium text-esi-text truncate">{eventSettings.venue}</p>
                      </div>
                    </div>
                  )}
                  {(eventSettings.event_date_start || eventSettings.event_date_end) && (
                    <div className="flex items-center gap-2.5 rounded-lg border border-esi-border p-3">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-amber-50 dark:bg-amber-950/30">
                        <Calendar size={16} className="text-amber-600" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-[10px] font-semibold uppercase tracking-wider text-esi-muted">Tanggal</p>
                        <p className="text-xs font-medium text-esi-text">
                          {eventSettings.event_date_start
                            ? new Date(eventSettings.event_date_start).toLocaleDateString('id-ID', {
                                day: 'numeric',
                                month: 'short',
                                year: 'numeric',
                              })
                            : ''}
                          {eventSettings.event_date_start && eventSettings.event_date_end && ' - '}
                          {eventSettings.event_date_end
                            ? new Date(eventSettings.event_date_end).toLocaleDateString('id-ID', {
                                day: 'numeric',
                                month: 'short',
                                year: 'numeric',
                              })
                            : ''}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </AnimatedCard>
        )}

        {data && <PastMatchesSection pastMatches={pastMatches} data={data} />}

        <QuickLinksSection />
      </div>
    </DashboardLayout>
  )
}
