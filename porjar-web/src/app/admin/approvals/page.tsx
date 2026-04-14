'use client'

import { useMemo, useState } from 'react'
import { toast } from 'sonner'
import { api } from '@/lib/api'
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

  // Bulk selection (teams tab only)
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [bulkRejectOpen, setBulkRejectOpen] = useState(false)
  const [bulkRejectReason, setBulkRejectReason] = useState('')
  const [bulkProcessing, setBulkProcessing] = useState(false)

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

  // Bulk helpers
  const pendingTeamIds = useMemo(() => teamsHook.teams.map((t) => t.id), [teamsHook.teams])
  const allSelected = pendingTeamIds.length > 0 && selectedIds.length === pendingTeamIds.length
  const someSelected = selectedIds.length > 0 && !allSelected

  function toggleOne(id: string) {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    )
  }

  function toggleAll() {
    setSelectedIds(allSelected ? [] : [...pendingTeamIds])
  }

  function clearSelection() {
    setSelectedIds([])
  }

  async function bulkApprove() {
    if (selectedIds.length === 0 || bulkProcessing) return
    const ids = [...selectedIds]
    setBulkProcessing(true)
    try {
      const results = await Promise.allSettled(
        ids.map((id) => api.put(`/admin/teams/${id}/approve`))
      )
      const ok = results.filter((r) => r.status === 'fulfilled').length
      const fail = results.length - ok
      if (ok > 0) toast.success(`${ok} tim disetujui`)
      if (fail > 0) toast.error(`${fail} tim gagal disetujui`)
      clearSelection()
      await teamsHook.reload()
    } finally {
      setBulkProcessing(false)
    }
  }

  function openBulkReject() {
    if (selectedIds.length === 0) return
    setBulkRejectReason('')
    setBulkRejectOpen(true)
  }

  async function confirmBulkReject() {
    if (!bulkRejectReason.trim()) {
      toast.error('Alasan penolakan wajib diisi')
      return
    }
    const ids = [...selectedIds]
    const reason = bulkRejectReason.trim()
    setBulkProcessing(true)
    try {
      const results = await Promise.allSettled(
        ids.map((id) => api.put(`/admin/teams/${id}/reject`, { reason }))
      )
      const ok = results.filter((r) => r.status === 'fulfilled').length
      const fail = results.length - ok
      if (ok > 0) toast.success(`${ok} tim ditolak`)
      if (fail > 0) toast.error(`${fail} tim gagal ditolak`)
      clearSelection()
      setBulkRejectOpen(false)
      setBulkRejectReason('')
      await teamsHook.reload()
    } finally {
      setBulkProcessing(false)
    }
  }

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
              onClick={() => {
                setTab(t.key)
                if (t.key !== 'teams') clearSelection()
              }}
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
        <section className={selectedIds.length > 0 ? 'pb-32 sm:pb-24' : undefined}>
          {teamsHook.loading ? (
            <Skeleton className="h-64 w-full bg-stone-200" />
          ) : teamsCount === 0 ? (
            <EmptyState icon={Users} title="Tidak Ada Tim Pending" description="Semua pendaftaran tim sudah diproses." />
          ) : (
            <>
              {/* Mobile cards */}
              <div className="grid gap-3 md:hidden">
                {/* Mobile select-all */}
                <label className="flex items-center gap-2 rounded-lg border border-stone-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 py-2 text-sm text-stone-700 dark:text-zinc-200">
                  <input
                    type="checkbox"
                    className="h-4 w-4 accent-esi-red"
                    checked={allSelected}
                    ref={(el) => {
                      if (el) el.indeterminate = someSelected
                    }}
                    onChange={toggleAll}
                    aria-label="Pilih semua tim"
                  />
                  <span>
                    {selectedIds.length > 0
                      ? `${selectedIds.length} dipilih`
                      : 'Pilih semua'}
                  </span>
                </label>
                {teamsHook.teams.map((team) => {
                  const checked = selectedIds.includes(team.id)
                  return (
                    <div
                      key={team.id}
                      className={`rounded-xl border p-4 shadow-sm transition-colors ${
                        checked
                          ? 'border-esi-red bg-red-50/30 dark:border-esi-red dark:bg-red-950/20'
                          : 'border-stone-200 dark:border-zinc-700 bg-white dark:bg-zinc-900'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <input
                          type="checkbox"
                          className="mt-1 h-4 w-4 accent-esi-red"
                          checked={checked}
                          onChange={() => toggleOne(team.id)}
                          aria-label={`Pilih ${team.name}`}
                        />
                        <div className="min-w-0 flex-1">
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
                      </div>
                    </div>
                  )
                })}
              </div>

              {/* Desktop table */}
              <div className="hidden md:block overflow-x-auto rounded-xl border border-stone-200 dark:border-zinc-700">
                <table className="w-full text-sm">
                  <thead className="bg-stone-50 dark:bg-zinc-800/50 text-left text-xs uppercase text-stone-500 dark:text-zinc-400">
                    <tr>
                      <th className="w-10 px-4 py-2.5">
                        <input
                          type="checkbox"
                          className="h-4 w-4 accent-esi-red"
                          checked={allSelected}
                          ref={(el) => {
                            if (el) el.indeterminate = someSelected
                          }}
                          onChange={toggleAll}
                          aria-label="Pilih semua tim"
                        />
                      </th>
                      <th className="px-4 py-2.5">Tim</th>
                      <th className="px-4 py-2.5">Sekolah</th>
                      <th className="px-4 py-2.5">Game</th>
                      <th className="px-4 py-2.5">Kapten</th>
                      <th className="px-4 py-2.5 text-right">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-200 dark:divide-zinc-700">
                    {teamsHook.teams.map((team) => {
                      const checked = selectedIds.includes(team.id)
                      return (
                        <tr
                          key={team.id}
                          className={
                            checked
                              ? 'bg-red-50/40 dark:bg-red-950/20'
                              : 'bg-white dark:bg-zinc-900'
                          }
                        >
                          <td className="px-4 py-3">
                            <input
                              type="checkbox"
                              className="h-4 w-4 accent-esi-red"
                              checked={checked}
                              onChange={() => toggleOne(team.id)}
                              aria-label={`Pilih ${team.name}`}
                            />
                          </td>
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
                      )
                    })}
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

      {/* Single reject dialog */}
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

      {/* Bulk reject dialog */}
      <Dialog open={bulkRejectOpen} onOpenChange={(open) => !open && setBulkRejectOpen(false)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Tolak {selectedIds.length} Tim</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            <p className="text-sm text-stone-600 dark:text-zinc-400">
              Alasan yang sama akan diterapkan ke semua tim yang dipilih.
            </p>
            <Textarea
              placeholder="Alasan penolakan..."
              value={bulkRejectReason}
              onChange={(e) => setBulkRejectReason(e.target.value)}
              rows={4}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBulkRejectOpen(false)} disabled={bulkProcessing}>
              Batal
            </Button>
            <Button variant="destructive" onClick={confirmBulkReject} loading={bulkProcessing}>
              Tolak Semua
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Sticky bulk action bar */}
      {tab === 'teams' && selectedIds.length > 0 && (
        <div className="fixed bottom-0 left-0 right-0 border-t border-stone-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 shadow-lg p-4 z-50">
          <div className="mx-auto flex max-w-7xl flex-col items-stretch justify-between gap-3 sm:flex-row sm:items-center">
            <p className="text-sm text-stone-700 dark:text-zinc-200">
              <b>{selectedIds.length}</b> tim dipilih
            </p>
            <div className="flex flex-col gap-2 sm:flex-row">
              <Button
                variant="outline"
                onClick={clearSelection}
                disabled={bulkProcessing}
              >
                Batal
              </Button>
              <Button
                variant="destructive"
                onClick={openBulkReject}
                disabled={bulkProcessing}
              >
                <XCircle size={14} className="mr-1" /> Tolak Semua
              </Button>
              <Button
                className="bg-green-600 hover:bg-green-700 text-white"
                onClick={bulkApprove}
                loading={bulkProcessing}
              >
                <CheckCircle size={14} className="mr-1" /> Setujui Semua
              </Button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  )
}
