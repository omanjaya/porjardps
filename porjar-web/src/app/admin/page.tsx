'use client'

import { useEffect, useState, useMemo } from 'react'
import Link from 'next/link'
import {
  Trophy, Users, CalendarBlank, Clock, Lightning, GameController,
  CheckCircle, ClipboardText, CalendarPlus, UploadSimple,
  GraduationCap, UsersFour, ArrowRight, Sword,
} from '@phosphor-icons/react'
import { Skeleton } from '@/components/ui/skeleton'
import { LiveScoreCard } from '@/components/modules/match/LiveScoreCard'
import { api } from '@/lib/api'
import { relativeTime } from '@/lib/relativeTime'
import { useAuthStore } from '@/store/auth-store'
import { GAME_CONFIG } from '@/constants/games'
import type { Icon } from '@phosphor-icons/react'
import type { BracketMatch, Schedule, Tournament, GameSlug } from '@/types'

// ── Helpers ──

interface ActivityLog {
  id: string; action: string; entity_type: string
  details: Record<string, unknown> | null; created_at: string
}

function formatLog(log: ActivityLog): string {
  const d = log.details as Record<string, string> | null
  const n = d?.name ?? d?.team_name ?? d?.title ?? ''
  const map: Record<string, string> = {
    'team.approved': `Tim "${n}" disetujui`,
    'team.rejected': `Tim "${n}" ditolak`,
    'submission.approved': 'Submission disetujui',
    'tournament.created': `Turnamen "${n}" dibuat`,
    'match.completed': 'Pertandingan selesai',
  }
  return map[log.action] ?? `${log.action.split('.')[1] ?? log.action}`
}

const FMT: Record<string, string> = {
  single_elimination: 'Single Elim', double_elimination: 'Double Elim',
  battle_royale_points: 'Battle Royale', round_robin: 'Round Robin',
}

// ── Page ──

export default function AdminDashboardPage() {
  const { user, isAuthenticated, isLoading: authLoading } = useAuthStore()
  const [stats, setStats] = useState({ tournaments: 0, teams: 0, today: 0, pending: 0, players: 0, schools: 0 })
  const [live, setLive] = useState<BracketMatch[]>([])
  const [schedules, setSchedules] = useState<Schedule[]>([])
  const [activity, setActivity] = useState<{ id: string; time: string; text: string }[]>([])
  const [tournaments, setTournaments] = useState<Tournament[]>([])
  const [loading, setLoading] = useState(true)

  const today = useMemo(() => {
    const d = new Date()
    const days = ['Minggu','Senin','Selasa','Rabu','Kamis','Jumat','Sabtu']
    const months = ['Jan','Feb','Mar','Apr','Mei','Jun','Jul','Agu','Sep','Okt','Nov','Des']
    return `${days[d.getDay()]}, ${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`
  }, [])

  useEffect(() => {
    if (!isAuthenticated || authLoading) return
    ;(async () => {
      try {
        const [dash, sched, logs, tours] = await Promise.all([
          api.get<any>('/admin/dashboard').catch(() => null),
          api.get<Schedule[]>('/schedules/today').catch(() => []),
          api.get<ActivityLog[]>('/admin/activity').catch(() => []),
          api.get<Tournament[]>('/tournaments?per_page=10').catch(() => []),
        ])
        const s = sched ?? [], a = logs ?? [], t = tours ?? []
        if (dash) setStats({ tournaments: dash.active_tournaments, teams: dash.total_teams, today: s.length, pending: dash.pending_teams, players: dash.total_participants ?? 0, schools: dash.total_schools ?? 0 })
        setSchedules(s); setTournaments(t)
        setActivity(a.slice(0, 8).map(l => ({ id: l.id, time: relativeTime(l.created_at), text: formatLog(l) })))
        try { setLive((await api.get<BracketMatch[]>('/matches/live')) ?? []) } catch {}
      } finally { setLoading(false) }
    })()
  }, [isAuthenticated, authLoading])

  return (
    <>
      {/* ── Header ── */}
      <div className="flex items-center justify-between mb-4 sm:mb-6">
        <div>
          <h1 className="text-lg sm:text-xl font-bold text-stone-900 dark:text-zinc-100">Dashboard</h1>
          <p className="text-xs sm:text-sm text-stone-500 dark:text-zinc-400">Halo, {user?.full_name ?? 'Admin'} — {today}</p>
        </div>
      </div>

      {/* ── Stats ── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 sm:gap-3 mb-4 sm:mb-6">
        <StatCard label="Turnamen" value={stats.tournaments} icon={Trophy} href="/admin/tournaments" color="text-esi-red" bg="bg-red-50 dark:bg-red-950/30" loading={loading} />
        <StatCard label="Tim" value={stats.teams} icon={Users} href="/admin/teams" color="text-blue-600" bg="bg-blue-50 dark:bg-blue-950/30" loading={loading} />
        <StatCard label="Hari Ini" value={stats.today} icon={CalendarBlank} color="text-amber-600" bg="bg-amber-50 dark:bg-amber-950/30" loading={loading} />
        <StatCard label="Pending" value={stats.pending} icon={Clock} href="/admin/submissions" color="text-orange-600" bg="bg-orange-50 dark:bg-orange-950/30" loading={loading} />
        <StatCard label="Peserta" value={stats.players} icon={UsersFour} href="/admin/users" color="text-violet-600" bg="bg-violet-50 dark:bg-violet-950/30" loading={loading} />
        <StatCard label="Sekolah" value={stats.schools} icon={GraduationCap} href="/admin/schools" color="text-emerald-600" bg="bg-emerald-50 dark:bg-emerald-950/30" loading={loading} />
      </div>

      {/* ── Quick Actions ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        <QuickAction label="Approve Tim" href="/admin/teams" icon={CheckCircle} color="text-emerald-600" />
        <QuickAction label="Verifikasi" href="/admin/submissions" icon={ClipboardText} color="text-blue-600" />
        <QuickAction label="Buat Jadwal" href="/admin/schedules" icon={CalendarPlus} color="text-amber-600" />
        <QuickAction label="Import" href="/admin/import" icon={UploadSimple} color="text-violet-600" />
      </div>

      {/* ── Main Grid: Tournaments + Live ── */}
      <div className="grid gap-4 lg:grid-cols-5 mb-6">
        {/* Turnamen */}
        <div className="lg:col-span-3 rounded-xl border border-stone-200 dark:border-zinc-700 bg-white dark:bg-zinc-900">
          <div className="flex items-center justify-between px-4 py-3 border-b border-stone-100 dark:border-zinc-700">
            <h2 className="text-sm font-semibold text-stone-800 dark:text-zinc-200">Turnamen</h2>
            <Link href="/admin/tournaments" className="text-xs text-esi-red hover:underline">Semua →</Link>
          </div>
          <div className="p-2">
            {loading ? (
              <div className="space-y-2 p-2">{[1,2,3].map(i => <Skeleton key={i} className="h-12 rounded-lg bg-stone-50 dark:bg-zinc-800/50" />)}</div>
            ) : (tournaments ?? []).length > 0 ? (
              <div className="space-y-1">
                {tournaments.map(t => {
                  const cfg = t.game?.slug ? GAME_CONFIG[t.game.slug as GameSlug] : null
                  return (
                    <Link key={t.id} href={`/admin/tournaments/${t.id}`} className="flex items-center gap-3 rounded-lg px-3 py-2.5 hover:bg-stone-50 dark:hover:bg-zinc-800 transition-colors">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-stone-50 dark:bg-zinc-800/50 border border-stone-100 dark:border-zinc-700">
                        {cfg ? <img src={cfg.logo} alt="" className="h-5 w-5 object-contain" /> : <Trophy size={14} className="text-stone-400 dark:text-zinc-500" />}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-stone-800 dark:text-zinc-200 truncate">{t.name}</p>
                        <p className="text-[11px] text-stone-400 dark:text-zinc-500">{FMT[t.format] ?? t.format} · {t.team_count ?? 0} tim</p>
                      </div>
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${
                        t.status === 'ongoing' ? 'bg-red-50 dark:bg-red-950/30 text-esi-red' :
                        t.status === 'completed' ? 'bg-green-50 dark:bg-green-950/30 text-green-600' :
                        'bg-stone-100 dark:bg-zinc-800 text-stone-500 dark:text-zinc-400'
                      }`}>{t.status}</span>
                    </Link>
                  )
                })}
              </div>
            ) : (
              <div className="py-8 text-center">
                <Trophy size={24} className="mx-auto mb-1 text-stone-300 dark:text-zinc-600" />
                <p className="text-xs text-stone-400 dark:text-zinc-500">Belum ada turnamen</p>
              </div>
            )}
          </div>
        </div>

        {/* Live */}
        <div className="lg:col-span-2 rounded-xl border border-stone-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 flex flex-col max-h-[500px]">
          <div className="flex items-center gap-1.5 px-4 py-3 border-b border-stone-100 dark:border-zinc-700 shrink-0">
            <span className="relative flex h-2 w-2"><span className="absolute h-full w-full animate-ping rounded-full bg-red-400 opacity-60" /><span className="relative h-2 w-2 rounded-full bg-red-500" /></span>
            <h2 className="text-sm font-semibold text-stone-800 dark:text-zinc-200">Live</h2>
            {live.length > 0 && <span className="ml-auto text-[11px] text-stone-400 dark:text-zinc-500">{live.length} match</span>}
          </div>
          <div className="p-3 overflow-y-auto flex-1">
            {loading ? (
              <div className="space-y-2">{[1,2].map(i => <Skeleton key={i} className="h-28 rounded-lg bg-stone-50 dark:bg-zinc-800/50" />)}</div>
            ) : live.length > 0 ? (
              <div className="space-y-2">
                {live.map(m => <LiveScoreCard key={m.id} match={m} />)}
              </div>
            ) : (
              <div className="py-10 text-center">
                <GameController size={24} className="mx-auto mb-1 text-stone-300 dark:text-zinc-600" />
                <p className="text-xs text-stone-400 dark:text-zinc-500">Tidak ada match live</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Bottom: Activity + Schedule ── */}
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-xl border border-stone-200 dark:border-zinc-700 bg-white dark:bg-zinc-900">
          <div className="px-4 py-3 border-b border-stone-100 dark:border-zinc-700">
            <h2 className="text-sm font-semibold text-stone-800 dark:text-zinc-200">Aktivitas Terbaru</h2>
          </div>
          <div className="p-4">
            {loading ? (
              <div className="space-y-3">{[1,2,3].map(i => <Skeleton key={i} className="h-4 bg-stone-50 dark:bg-zinc-800/50" />)}</div>
            ) : activity.length > 0 ? (
              <div className="space-y-3">
                {activity.map(a => (
                  <div key={a.id} className="flex gap-2.5">
                    <div className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-esi-red" />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm text-stone-700 dark:text-zinc-300">{a.text}</p>
                      <p className="text-[11px] text-stone-400 dark:text-zinc-500">{a.time}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-stone-400 dark:text-zinc-500 text-center py-8">Belum ada aktivitas</p>
            )}
          </div>
        </div>

        <div className="rounded-xl border border-stone-200 dark:border-zinc-700 bg-white dark:bg-zinc-900">
          <div className="px-4 py-3 border-b border-stone-100 dark:border-zinc-700">
            <h2 className="text-sm font-semibold text-stone-800 dark:text-zinc-200">Jadwal Hari Ini</h2>
          </div>
          <div className="p-4">
            {loading ? (
              <div className="space-y-2">{[1,2,3].map(i => <Skeleton key={i} className="h-10 rounded bg-stone-50 dark:bg-zinc-800/50" />)}</div>
            ) : schedules.length > 0 ? (
              <div className="space-y-2">
                {schedules.map(s => (
                  <div key={s.id} className="flex items-center gap-3 rounded-lg bg-stone-50 dark:bg-zinc-800/50 px-3 py-2.5">
                    <span className="text-sm font-bold text-esi-red tabular-nums w-12">
                      {new Date(s.scheduled_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-stone-700 dark:text-zinc-300 truncate">{s.title}</p>
                      {s.venue && <p className="text-[11px] text-stone-400 dark:text-zinc-500">{s.venue}</p>}
                    </div>
                    {s.status === 'ongoing' && <span className="rounded bg-esi-red px-1.5 py-0.5 text-[9px] font-bold text-white">LIVE</span>}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-stone-400 dark:text-zinc-500 text-center py-8">Tidak ada jadwal</p>
            )}
          </div>
        </div>
      </div>
    </>
  )
}

// ── Components ──

function StatCard({ label, value, icon: I, href, color, bg, loading }: {
  label: string; value: number; icon: Icon; href?: string; color: string; bg: string; loading: boolean
}) {
  const content = (
    <>
      <div className={`h-10 w-10 rounded-lg ${bg} flex items-center justify-center mb-2`}>
        <I size={20} weight="duotone" className={color} />
      </div>
      {loading
        ? <Skeleton className="h-6 w-10 bg-stone-100 dark:bg-zinc-800 mb-1" />
        : <p className="text-2xl font-bold tabular-nums text-stone-900 dark:text-zinc-100">{value}</p>
      }
      <p className="text-xs text-stone-500 dark:text-zinc-400 mt-0.5">{label}</p>
    </>
  )
  const cls = "rounded-xl border border-stone-200 bg-white p-4 transition-all hover:shadow-md hover:border-stone-300"
  return href
    ? <Link href={href} className={cls}>{content}</Link>
    : <div className={cls}>{content}</div>
}

function QuickAction({ label, href, icon: I, color }: {
  label: string; href: string; icon: Icon; color: string
}) {
  return (
    <Link href={href} className="group flex items-center gap-2.5 rounded-xl border border-stone-200 bg-white px-4 py-3 transition-all hover:shadow-md hover:border-esi-red/30">
      <I size={18} weight="duotone" className={color} />
      <span className="text-sm font-medium text-stone-700 flex-1">{label}</span>
      <ArrowRight size={14} className="text-stone-300 group-hover:text-esi-red group-hover:translate-x-0.5 transition-all" />
    </Link>
  )
}
