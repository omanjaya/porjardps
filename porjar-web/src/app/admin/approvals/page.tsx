'use client'

import { useState } from 'react'
import { AdminLayout } from '@/components/layouts/AdminLayout'
import { PageHeader } from '@/components/shared/PageHeader'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { EmptyState } from '@/components/shared/EmptyState'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import { CheckCircle, XCircle, Users, GraduationCap } from '@phosphor-icons/react'
import Link from 'next/link'

import { usePendingTeams } from './hooks/usePendingTeams'
import { usePendingSchools } from './hooks/usePendingSchools'

type TabKey = 'teams' | 'schools'

interface RejectTarget {
  kind: 'team' | 'school'
  id: string
  name: string
}

export default function AdminApprovalsPage() {
  const [tab, setTab] = useState<TabKey>('teams')
  const teamsHook = usePendingTeams()
  const schoolsHook = usePendingSchools()

  const [rejectTarget, setRejectTarget] = useState<RejectTarget | null>(null)
  const [rejectReason, setRejectReason] = useState('')

  function openReject(target: RejectTarget) {
    setRejectTarget(target)
    setRejectReason('')
  }

  async function confirmReject() {
    if (!rejectTarget) return
    const ok =
      rejectTarget.kind === 'team'
        ? await teamsHook.reject(rejectTarget.id, rejectTarget.name, rejectReason)
        : await schoolsHook.reject(rejectTarget.id, rejectReason)
    if (ok) {
      setRejectTarget(null)
      setRejectReason('')
    }
  }

  const teamsCount = teamsHook.teams.length
  const schoolsCount = schoolsHook.requests.length

  const tabs: { key: TabKey; label: string; count: number }[] = [
    { key: 'teams', label: 'Tim Pending', count: teamsCount },
    { key: 'schools', label: 'Sekolah Pending', count: schoolsCount },
  ]

  return (
    <AdminLayout>
      <PageHeader
        title="Pusat Persetujuan"
        description="Review pending team registrations, school requests, dan lainnya"
      />

      <div className="mb-4 flex flex-wrap gap-2 border-b border-stone-200 dark:border-zinc-700">
        {tabs.map((t) => {
          const active = tab === t.key
          return (
            <button
              key={t.key}
              type="button"
              onClick={() => setTab(t.key)}
              className={`-mb-px border-b-2 px-3 py-2 text-sm font-medium transition-colors ${
                active
                  ? 'border-esi-red text-esi-red'
                  : 'border-transparent text-stone-500 hover:text-stone-800 dark:text-zinc-400 dark:hover:text-zinc-100'
              }`}
            >
              {t.label} ({t.count})
            </button>
          )
        })}
      </div>

      {tab === 'teams' && (
        <section>
          {teamsHook.loading ? (
            <Skeleton className="h-64 w-full bg-stone-200" />
          ) : teamsCount === 0 ? (
            <EmptyState icon={Users} title="Tidak Ada Tim Pending" description="Semua pendaftaran tim sudah diproses." />
          ) : (
            <>
              {/* Mobile cards */}
              <div className="grid gap-3 md:hidden">
                {teamsHook.teams.map((team) => (
                  <div
                    key={team.id}
                    className="rounded-xl border border-stone-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 p-4 shadow-sm"
                  >
                    <div className="font-semibold text-stone-900 dark:text-zinc-100">{team.name}</div>
                    <div className="mt-1 text-xs text-stone-500 dark:text-zinc-400">
                      {team.school?.name ?? '-'} · {team.game.name}
                    </div>
                    <div className="mt-1 text-xs text-stone-500 dark:text-zinc-400">
                      Kapten: {team.captain?.full_name ?? '-'}
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <Link href={`/admin/teams`} className="text-xs text-blue-600 hover:underline">
                        Lihat Detail
                      </Link>
                      <Button
                        size="xs"
                        className="bg-green-600 hover:bg-green-700"
                        disabled={teamsHook.processingId === team.id}
                        onClick={() => teamsHook.approve(team.id, team.name)}
                      >
                        <CheckCircle size={14} className="mr-1" /> Setujui
                      </Button>
                      <Button
                        size="xs"
                        variant="destructive"
                        disabled={teamsHook.processingId === team.id}
                        onClick={() => openReject({ kind: 'team', id: team.id, name: team.name })}
                      >
                        <XCircle size={14} className="mr-1" /> Tolak
                      </Button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Desktop table */}
              <div className="hidden md:block overflow-x-auto rounded-xl border border-stone-200 dark:border-zinc-700">
                <table className="w-full text-sm">
                  <thead className="bg-stone-50 dark:bg-zinc-800/50 text-left text-xs uppercase text-stone-500 dark:text-zinc-400">
                    <tr>
                      <th className="px-4 py-2.5">Tim</th>
                      <th className="px-4 py-2.5">Sekolah</th>
                      <th className="px-4 py-2.5">Game</th>
                      <th className="px-4 py-2.5">Kapten</th>
                      <th className="px-4 py-2.5 text-right">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-200 dark:divide-zinc-700">
                    {teamsHook.teams.map((team) => (
                      <tr key={team.id} className="bg-white dark:bg-zinc-900">
                        <td className="px-4 py-3 font-medium text-stone-900 dark:text-zinc-100">{team.name}</td>
                        <td className="px-4 py-3 text-stone-600 dark:text-zinc-300">{team.school?.name ?? '-'}</td>
                        <td className="px-4 py-3 text-stone-600 dark:text-zinc-300">{team.game.name}</td>
                        <td className="px-4 py-3 text-stone-600 dark:text-zinc-300">{team.captain?.full_name ?? '-'}</td>
                        <td className="px-4 py-3">
                          <div className="flex justify-end gap-2">
                            <Link
                              href={`/admin/teams`}
                              className="rounded-md border border-stone-300 dark:border-zinc-600 px-2.5 py-1 text-xs text-stone-700 dark:text-zinc-200 hover:bg-stone-50 dark:hover:bg-zinc-800"
                            >
                              Lihat Detail
                            </Link>
                            <Button
                              size="xs"
                              className="bg-green-600 hover:bg-green-700"
                              disabled={teamsHook.processingId === team.id}
                              onClick={() => teamsHook.approve(team.id, team.name)}
                            >
                              <CheckCircle size={14} className="mr-1" /> Setujui
                            </Button>
                            <Button
                              size="xs"
                              variant="destructive"
                              disabled={teamsHook.processingId === team.id}
                              onClick={() => openReject({ kind: 'team', id: team.id, name: team.name })}
                            >
                              <XCircle size={14} className="mr-1" /> Tolak
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </section>
      )}

      {tab === 'schools' && (
        <section>
          {schoolsHook.loading ? (
            <Skeleton className="h-64 w-full bg-stone-200" />
          ) : schoolsCount === 0 ? (
            <EmptyState
              icon={GraduationCap}
              title="Tidak Ada Permintaan Sekolah"
              description="Semua permintaan sekolah sudah diproses."
            />
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              {schoolsHook.requests.map((req) => (
                <div
                  key={req.id}
                  className="rounded-xl border border-stone-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 p-4 shadow-sm"
                >
                  <div className="font-semibold text-stone-900 dark:text-zinc-100">{req.name}</div>
                  <div className="mt-1 text-xs text-stone-500 dark:text-zinc-400">
                    Level: {req.level}
                  </div>
                  <div className="mt-1 text-xs text-stone-500 dark:text-zinc-400">
                    Diajukan oleh: {req.requester_name ?? req.requested_by}
                  </div>
                  <div className="mt-1 text-xs text-stone-500 dark:text-zinc-400">
                    {new Date(req.created_at).toLocaleDateString('id-ID')}
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Button
                      size="xs"
                      className="bg-green-600 hover:bg-green-700"
                      disabled={schoolsHook.processingId === req.id}
                      onClick={() => schoolsHook.approve(req.id)}
                    >
                      <CheckCircle size={14} className="mr-1" /> Setujui
                    </Button>
                    <Button
                      size="xs"
                      variant="destructive"
                      disabled={schoolsHook.processingId === req.id}
                      onClick={() => openReject({ kind: 'school', id: req.id, name: req.name })}
                    >
                      <XCircle size={14} className="mr-1" /> Tolak
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      <Dialog open={rejectTarget !== null} onOpenChange={(open) => !open && setRejectTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Tolak {rejectTarget?.kind === 'team' ? 'Tim' : 'Permintaan Sekolah'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            <p className="text-sm text-stone-600 dark:text-zinc-400">
              {rejectTarget?.name}
            </p>
            <Textarea
              placeholder="Alasan penolakan..."
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              rows={4}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectTarget(null)}>
              Batal
            </Button>
            <Button variant="destructive" onClick={confirmReject}>
              Tolak
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  )
}
