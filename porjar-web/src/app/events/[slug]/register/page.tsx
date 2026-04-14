'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { api } from '@/lib/api'
import { useEvent } from '@/contexts/EventContext'
import { useAuthStore } from '@/store/auth-store'
import { PageHeader } from '@/components/shared/PageHeader'
import { Button } from '@/components/ui/button'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import { Skeleton } from '@/components/ui/skeleton'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { ProfileCompletionGate } from '@/components/shared/ProfileCompletionGate'
import { toast } from 'sonner'
import { CheckCircle, Users, Medal, ArrowRight, SignIn, CalendarBlank, Trophy, UsersThree } from '@phosphor-icons/react'
import { relativeTime } from '@/lib/relativeTime'
import type { EventRegistration } from '@/types'

interface MyTeam {
  id: string
  name: string
  game: { id: string; name: string }
  school_name?: string | null
}

export default function EventRegisterPage() {
  const event = useEvent()
  const router = useRouter()
  const { isAuthenticated, isLoading: authLoading } = useAuthStore()
  const [myTeams, setMyTeams] = useState<MyTeam[]>([])
  const [registrations, setRegistrations] = useState<EventRegistration[]>([])
  const [regCount, setRegCount] = useState(0)
  const [selectedTeamId, setSelectedTeamId] = useState<string>('')
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [justRegistered, setJustRegistered] = useState<string | null>(null)
  const [justRegisteredTeamId, setJustRegisteredTeamId] = useState<string | null>(null)

  const loadData = useCallback(async () => {
    try {
      const regData = await api.get<{ registrations: EventRegistration[]; count: number }>(
        `/events/${event.id}/registrations`
      )
      setRegistrations(regData.registrations ?? [])
      setRegCount(regData.count ?? 0)

      if (isAuthenticated && !authLoading) {
        const teams = await api.get<MyTeam[]>('/teams/my')
        setMyTeams(Array.isArray(teams) ? teams : [])
      }
    } catch {
      console.error('Gagal memuat data')
    } finally {
      setLoading(false)
    }
  }, [event.id, isAuthenticated, authLoading])

  useEffect(() => {
    loadData()
  }, [loadData])

  const handleRegister = async () => {
    if (!selectedTeamId) {
      toast.error('Pilih tim terlebih dahulu')
      return
    }
    setSubmitting(true)
    try {
      await api.post(`/events/${event.id}/register`, { team_id: selectedTeamId })
      const teamName = myTeams.find(t => t.id === selectedTeamId)?.name ?? 'Tim'
      setJustRegistered(teamName)
      setJustRegisteredTeamId(selectedTeamId)
      setSelectedTeamId('')
      loadData()
      toast.success(`${teamName} berhasil didaftarkan!`)
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Gagal mendaftarkan tim'
      toast.error(message)
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-64 bg-stone-100 dark:bg-zinc-800" />
        <Skeleton className="h-64 w-full bg-stone-100 dark:bg-zinc-800" />
      </div>
    )
  }

  return (
    <>
      <PageHeader
        title="Registrasi Tim"
        description={`Daftarkan tim kamu ke ${event.name}`}
        breadcrumbs={[
          { label: 'Event', href: `/events/${event.slug}` },
          { label: 'Registrasi Tim' },
        ]}
      />

      {/* Success confirmation after registration */}
      {justRegistered && (
        <div className="mb-6 rounded-xl border border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-950 p-5">
          <div className="flex items-start gap-3">
            <CheckCircle size={24} weight="fill" className="text-green-600 dark:text-green-400 mt-0.5 shrink-0" />
            <div>
              <p className="font-semibold text-green-800 dark:text-green-200">
                {justRegistered} berhasil terdaftar!
              </p>
              <p className="mt-1 text-sm text-green-700 dark:text-green-300">
                Tim kamu sekarang terdaftar di {event.name}. Selanjutnya:
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <Link href={`/leaderboards`}>
                  <Button variant="outline" size="sm" className="gap-1.5 border-green-300 dark:border-green-700 text-green-700 dark:text-green-300">
                    <Medal size={14} /> Lihat Leaderboard
                  </Button>
                </Link>
                <Link href={`/events/${event.slug}`}>
                  <Button variant="outline" size="sm" className="gap-1.5 border-green-300 dark:border-green-700 text-green-700 dark:text-green-300">
                    <ArrowRight size={14} /> Halaman Event
                  </Button>
                </Link>
                <Link href="/dashboard/events">
                  <Button variant="outline" size="sm" className="gap-1.5 border-green-300 dark:border-green-700 text-green-700 dark:text-green-300">
                    <ArrowRight size={14} /> Event Saya
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Next steps cards after successful registration */}
      {justRegistered && (
        <div className="mb-6">
          <h3 className="mb-3 text-sm font-bold uppercase tracking-wide text-stone-700 dark:text-zinc-300">Langkah Selanjutnya</h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <Link href={`/events/${event.slug}/schedule`} className="group flex items-start gap-3 rounded-xl border border-stone-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 p-4 transition hover:shadow-md hover:-translate-y-0.5">
              <CalendarBlank size={24} className="text-esi-red shrink-0" />
              <div>
                <p className="font-semibold text-stone-900 dark:text-zinc-100 text-sm">Lihat Jadwal Pertandingan</p>
                <p className="text-xs text-stone-500 dark:text-zinc-400 mt-0.5">Cek jadwal match tim kamu</p>
              </div>
            </Link>
            <Link href={`/events/${event.slug}/tournaments`} className="group flex items-start gap-3 rounded-xl border border-stone-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 p-4 transition hover:shadow-md hover:-translate-y-0.5">
              <Trophy size={24} className="text-esi-red shrink-0" />
              <div>
                <p className="font-semibold text-stone-900 dark:text-zinc-100 text-sm">Lihat Bracket Turnamen</p>
                <p className="text-xs text-stone-500 dark:text-zinc-400 mt-0.5">Pantau jalannya turnamen</p>
              </div>
            </Link>
            {justRegisteredTeamId && (
              <Link href={`/dashboard/teams/${justRegisteredTeamId}`} className="group flex items-start gap-3 rounded-xl border border-stone-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 p-4 transition hover:shadow-md hover:-translate-y-0.5">
                <UsersThree size={24} className="text-esi-red shrink-0" />
                <div>
                  <p className="font-semibold text-stone-900 dark:text-zinc-100 text-sm">Kelola Anggota Tim</p>
                  <p className="text-xs text-stone-500 dark:text-zinc-400 mt-0.5">Tambah atau atur anggota</p>
                </div>
              </Link>
            )}
          </div>
        </div>
      )}

      {/* Registration Count */}
      <div className="mb-6 flex items-center gap-2 rounded-lg border border-stone-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-4 py-3">
        <Users size={18} className="text-esi-red" />
        <span className="text-sm text-stone-600 dark:text-zinc-400">
          <strong className="text-stone-900 dark:text-zinc-100">{regCount}</strong> tim terdaftar
        </span>
      </div>

      {/* Login prompt for unauthenticated users */}
      {!authLoading && !isAuthenticated && (
        <div className="mb-8 rounded-xl border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-950 p-5">
          <div className="flex items-center gap-3">
            <SignIn size={20} className="text-blue-600 dark:text-blue-400" />
            <div className="flex-1">
              <p className="font-medium text-blue-800 dark:text-blue-200">Login untuk mendaftarkan tim</p>
              <p className="text-sm text-blue-600 dark:text-blue-400">Kamu harus login terlebih dahulu untuk mendaftarkan tim ke event ini.</p>
            </div>
            <Button size="sm" onClick={() => router.push('/login')} className="bg-blue-600 hover:bg-blue-700 text-white">
              Login
            </Button>
          </div>
        </div>
      )}

      {/* Register Form */}
      {isAuthenticated && event.registration_open && (
        <ProfileCompletionGate from="event-register">
        <div className="mb-8 rounded-xl border border-stone-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 p-6 shadow-sm">
          <h3 className="mb-4 text-lg font-semibold text-stone-900 dark:text-zinc-100">Daftarkan Tim</h3>
          {event.requires_school && (
            <p className="mb-3 text-sm text-amber-600 dark:text-amber-400">
              Event ini mengharuskan tim terdaftar di sekolah. Pastikan tim kamu sudah terhubung dengan sekolah.
            </p>
          )}
          <div className="flex flex-col sm:flex-row gap-3">
            <Select value={selectedTeamId} onValueChange={(val) => setSelectedTeamId(val ?? '')}>
              <SelectTrigger className="w-full sm:w-[300px] bg-white dark:bg-zinc-800 border-stone-200 dark:border-zinc-700">
                <SelectValue placeholder="Pilih Tim" />
              </SelectTrigger>
              <SelectContent>
                {myTeams.map((t) => (
                  <SelectItem key={t.id} value={t.id}>
                    {t.name} ({t.game.name})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button onClick={handleRegister} disabled={submitting || !selectedTeamId}>
              {submitting ? 'Mendaftarkan...' : 'Registrasi Tim'}
            </Button>
          </div>
          {myTeams.length === 0 && (
            <p className="mt-3 text-sm text-stone-400 dark:text-zinc-500">
              Kamu belum punya tim. <Link href="/dashboard/teams/create" className="text-esi-red hover:underline">Buat tim dulu</Link>
            </p>
          )}
        </div>
        </ProfileCompletionGate>
      )}

      {!event.registration_open && isAuthenticated && (
        <div className="mb-8 rounded-lg border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950 px-4 py-3 text-sm text-amber-700 dark:text-amber-300">
          Pendaftaran belum dibuka atau sudah ditutup.
        </div>
      )}

      {/* Registered Teams */}
      <div className="rounded-xl border border-stone-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 overflow-hidden shadow-sm">
        <div className="px-4 py-3 border-b border-stone-200 dark:border-zinc-700">
          <h3 className="font-semibold text-stone-900 dark:text-zinc-100">Tim Terdaftar</h3>
        </div>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="border-stone-200 dark:border-zinc-700 bg-esi-red/5 hover:bg-esi-red/5">
                <TableHead className="w-16 text-stone-600 dark:text-zinc-400 font-semibold">#</TableHead>
                <TableHead className="text-stone-600 dark:text-zinc-400 font-semibold">Tim</TableHead>
                <TableHead className="text-stone-600 dark:text-zinc-400 font-semibold">Sekolah</TableHead>
                <TableHead className="text-stone-600 dark:text-zinc-400 font-semibold">Status</TableHead>
                <TableHead className="text-stone-600 dark:text-zinc-400 font-semibold">Tanggal Daftar</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {registrations.length === 0 ? (
                <TableRow><TableCell colSpan={5} className="text-center py-8 text-stone-400 dark:text-zinc-500">Belum ada tim terdaftar</TableCell></TableRow>
              ) : registrations.map((reg, idx) => (
                <TableRow key={reg.id} className="border-stone-100 dark:border-zinc-800 hover:bg-stone-50 dark:hover:bg-zinc-800/50">
                  <TableCell className="font-medium text-stone-700 dark:text-zinc-300">{idx + 1}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <CheckCircle size={14} weight="fill" className="text-green-500" />
                      <span className="font-medium text-stone-900 dark:text-zinc-100">{reg.team.name}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-stone-500 dark:text-zinc-400">{reg.team.school_name ?? '-'}</TableCell>
                  <TableCell>
                    {reg.team.status ? <StatusBadge status={reg.team.status} /> : <span className="text-stone-400 dark:text-zinc-500 text-xs">—</span>}
                  </TableCell>
                  <TableCell className="text-stone-500 dark:text-zinc-400">
                    <div>
                      {new Date(reg.registered_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </div>
                    {reg.team.status === 'pending' && (
                      <div className="text-[11px] text-amber-600 dark:text-amber-400">
                        Diajukan {relativeTime(reg.registered_at)}
                      </div>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    </>
  )
}
