'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { toast } from 'sonner'
import { api } from '@/lib/api'
import { useAuthStore } from '@/store/auth-store'
import { AdminLayout } from '@/components/layouts/AdminLayout'
import { PageHeader } from '@/components/shared/PageHeader'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { EmptyState } from '@/components/shared/EmptyState'
import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'
import { GAME_CONFIG } from '@/constants/games'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { ApiError } from '@/lib/api'
import {
  Trophy, Plus, Users, TreeStructure, ChartBar, PencilSimple, Trash,
} from '@phosphor-icons/react'
import { useWebSocket } from '@/hooks/useWebSocket'
import type { Tournament, Game, GameSlug } from '@/types'
import { TournamentWizardDialog, TINGKAT_OPTIONS, FORMAT_LABELS } from './TournamentWizardDialog'
import { TournamentEditDialog } from './TournamentEditDialog'

export default function AdminTournamentsPage() {
  const { isAuthenticated, isLoading: authLoading } = useAuthStore()
  const [tournaments, setTournaments] = useState<Tournament[]>([])
  const [games, setGames] = useState<Game[]>([])
  const [loading, setLoading] = useState(true)
  const [createOpen, setCreateOpen] = useState(false)
  const [filterTingkat, setFilterTingkat] = useState<string | null>(null)
  const [filterGame, setFilterGame] = useState<string | null>(null)
  const [filterStatus, setFilterStatus] = useState<string | null>(null)
  const [page, setPage] = useState(1)
  const PAGE_SIZE = 12

  // Edit state
  const [editOpen, setEditOpen] = useState(false)
  const [editTournament, setEditTournament] = useState<Tournament | null>(null)

  // Delete state
  const [deleteTarget, setDeleteTarget] = useState<Tournament | null>(null)
  const [deleting, setDeleting] = useState(false)

  const { user } = useAuthStore()
  const isSuperadmin = user?.role === 'superadmin'

  function openEdit(t: Tournament) {
    setEditTournament(t)
    setEditOpen(true)
  }

  async function handleDelete() {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      await api.delete(`/admin/tournaments/${deleteTarget.id}`)
      toast.success('Turnamen berhasil dihapus')
      setDeleteTarget(null)
      load()
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Gagal menghapus turnamen')
    } finally {
      setDeleting(false)
    }
  }

  async function load() {
    try {
      const [tRes, g] = await Promise.all([
        api.getPaginated<Tournament[]>('/tournaments?per_page=100'),
        api.get<Game[]>('/games'),
      ])
      const t = Array.isArray(tRes.data) ? tRes.data : []
      setTournaments(t)
      setGames(g ?? [])
    } catch {
      toast.error('Gagal memuat data turnamen')
    } finally { setLoading(false) }
  }

  useEffect(() => {
    if (!isAuthenticated || authLoading) return
    load()
  }, [isAuthenticated, authLoading])

  useWebSocket({
    channels: ['live-scores'],
    messageTypes: ['tournament_update'],
    onMessage: () => { load() },
  })

  const filtered = useMemo(() => {
    setPage(1)
    return tournaments.filter(t => {
      if (filterTingkat) {
        const name = t.name?.toUpperCase() || ''
        if (!name.includes(filterTingkat)) return false
      }
      if (filterGame && t.game?.slug !== filterGame) return false
      if (filterStatus && t.status !== filterStatus) return false
      return true
    })
  }, [tournaments, filterTingkat, filterGame, filterStatus])

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE)
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  return (
    <AdminLayout>
      <PageHeader
        title="Kelola Turnamen"
        description="Buat dan kelola semua turnamen ESI Denpasar"
        actions={
          <Button onClick={() => setCreateOpen(true)} disabled={loading} className="bg-esi-red hover:bg-esi-red-dark text-white">
            <Plus size={16} className="mr-1.5" />
            Buat Turnamen
          </Button>
        }
      />

      {/* Filters */}
      <div className="mb-4 sm:mb-6 space-y-3">
        {/* Tingkat filter */}
        <div className="flex items-center gap-2 overflow-x-auto" style={{ scrollbarWidth: 'none' }}>
          <span className="shrink-0 text-xs font-semibold uppercase tracking-wider text-stone-400 dark:text-zinc-500 w-16">Tingkat</span>
          <button
            onClick={() => setFilterTingkat(null)}
            className={`shrink-0 rounded-lg border px-3 py-1.5 text-xs font-semibold transition-colors ${
              !filterTingkat ? 'border-esi-red bg-esi-red text-white' : 'border-stone-200 dark:border-zinc-700 text-stone-600 dark:text-zinc-400 hover:bg-stone-50 dark:hover:bg-zinc-800 dark:bg-zinc-800/50'
            }`}
          >
            Semua
          </button>
          {TINGKAT_OPTIONS.map(t => (
            <button
              key={t.value}
              onClick={() => setFilterTingkat(filterTingkat === t.value ? null : t.value)}
              className={`shrink-0 rounded-lg border px-3 py-1.5 text-xs font-semibold transition-colors ${
                filterTingkat === t.value ? 'border-esi-red bg-esi-red text-white' : 'border-stone-200 dark:border-zinc-700 text-stone-600 dark:text-zinc-400 hover:bg-stone-50 dark:hover:bg-zinc-800 dark:bg-zinc-800/50'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Game filter */}
        <div className="flex items-center gap-2 overflow-x-auto" style={{ scrollbarWidth: 'none' }}>
          <span className="shrink-0 text-xs font-semibold uppercase tracking-wider text-stone-400 dark:text-zinc-500 w-16">Game</span>
          <button
            onClick={() => setFilterGame(null)}
            className={`shrink-0 rounded-lg border px-3 py-1.5 text-xs font-semibold transition-colors ${
              !filterGame ? 'border-esi-red bg-esi-red text-white' : 'border-stone-200 dark:border-zinc-700 text-stone-600 dark:text-zinc-400 hover:bg-stone-50 dark:hover:bg-zinc-800 dark:bg-zinc-800/50'
            }`}
          >
            Semua
          </button>
          {games.map(g => (
            <button
              key={g.slug}
              onClick={() => setFilterGame(filterGame === g.slug ? null : g.slug)}
              className={`shrink-0 flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-semibold transition-colors ${
                filterGame === g.slug ? 'border-esi-red bg-esi-red text-white' : 'border-stone-200 dark:border-zinc-700 text-stone-600 dark:text-zinc-400 hover:bg-stone-50 dark:hover:bg-zinc-800 dark:bg-zinc-800/50'
              }`}
            >
              {GAME_CONFIG[g.slug as GameSlug]?.logo && (
                <img src={GAME_CONFIG[g.slug as GameSlug].logo} alt="" className="h-4 w-4 object-contain" />
              )}
              {g.name}
            </button>
          ))}
        </div>

        {/* Status filter */}
        <div className="flex items-center gap-2 overflow-x-auto" style={{ scrollbarWidth: 'none' }}>
          <span className="shrink-0 text-xs font-semibold uppercase tracking-wider text-stone-400 dark:text-zinc-500 w-16">Status</span>
          <button
            onClick={() => setFilterStatus(null)}
            className={`shrink-0 rounded-lg border px-3 py-1.5 text-xs font-semibold transition-colors ${
              !filterStatus ? 'border-esi-red bg-esi-red text-white' : 'border-stone-200 dark:border-zinc-700 text-stone-600 dark:text-zinc-400 hover:bg-stone-50 dark:hover:bg-zinc-800 dark:bg-zinc-800/50'
            }`}
          >
            Semua
          </button>
          {([
            { value: 'upcoming', label: 'Akan Datang' },
            { value: 'registration', label: 'Registrasi' },
            { value: 'ongoing', label: 'Berlangsung' },
            { value: 'completed', label: 'Selesai' },
            { value: 'cancelled', label: 'Dibatalkan' },
          ] as { value: string; label: string }[]).map(s => (
            <button
              key={s.value}
              onClick={() => setFilterStatus(filterStatus === s.value ? null : s.value)}
              className={`shrink-0 rounded-lg border px-3 py-1.5 text-xs font-semibold transition-colors ${
                filterStatus === s.value ? 'border-esi-red bg-esi-red text-white' : 'border-stone-200 dark:border-zinc-700 text-stone-600 dark:text-zinc-400 hover:bg-stone-50 dark:hover:bg-zinc-800 dark:bg-zinc-800/50'
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tournament list */}
      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-xl bg-stone-100 dark:bg-zinc-800" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState icon={Trophy} title="Belum Ada Turnamen" description="Buat turnamen pertama untuk memulai kompetisi." />
      ) : (
        <div className="space-y-3">
          {paginated.map((t) => {
            const gameSlug = t.game?.slug as GameSlug | undefined
            const config = gameSlug ? GAME_CONFIG[gameSlug] : null
            return (
              <div key={t.id} className="rounded-xl border border-stone-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 p-5 shadow-sm transition-all hover:shadow-md">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-start gap-4">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-stone-50 dark:bg-zinc-800/50 border border-stone-200 dark:border-zinc-700">
                      {config?.logo ? (
                        <img src={config.logo} alt={t.game?.name ?? ''} className="h-8 w-8 object-contain" />
                      ) : (
                        <Trophy size={24} weight="duotone" className="text-stone-400 dark:text-zinc-500" />
                      )}
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <Link href={`/admin/tournaments/${t.id}`} className="font-bold text-stone-900 dark:text-zinc-100 hover:text-esi-red transition-colors">{t.name}</Link>
                        <StatusBadge status={t.status} />
                      </div>
                      <div className="mt-1.5 flex flex-wrap items-center gap-3 text-xs text-stone-500 dark:text-zinc-400">
                        <span className="rounded bg-stone-100 dark:bg-zinc-800 px-2 py-0.5 font-medium text-stone-600 dark:text-zinc-400">
                          {FORMAT_LABELS[t.format] || t.format}
                        </span>
                        {t.format !== 'battle_royale_points' && <span>BO{t.best_of}</span>}
                        <span className="flex items-center gap-1"><Users size={12} />{t.team_count} tim</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    {t.format === 'group_stage_playoff' && (
                      <Link href={`/admin/tournaments/${t.id}/groups`}>
                        <Button variant="outline" size="sm" className="border-stone-300 dark:border-zinc-600 text-stone-600 dark:text-zinc-400">
                          <Users size={14} className="mr-1" /> Grup
                        </Button>
                      </Link>
                    )}
                    {(t.format !== 'battle_royale_points') ? (
                      <Link href={`/admin/tournaments/${t.id}/bracket`}>
                        <Button variant="outline" size="sm" className="border-stone-300 dark:border-zinc-600 text-stone-600 dark:text-zinc-400">
                          <TreeStructure size={14} className="mr-1" /> Bracket
                        </Button>
                      </Link>
                    ) : (
                      <Link href={`/admin/tournaments/${t.id}/lobbies`}>
                        <Button variant="outline" size="sm" className="border-stone-300 dark:border-zinc-600 text-stone-600 dark:text-zinc-400">
                          <ChartBar size={14} className="mr-1" /> POT
                        </Button>
                      </Link>
                    )}
                    <Button variant="outline" size="sm" className="border-stone-300 dark:border-zinc-600 text-stone-600 dark:text-zinc-400" onClick={() => openEdit(t)}>
                      <PencilSimple size={14} />
                    </Button>
                    {isSuperadmin && (
                      <Button variant="outline" size="sm" className="border-red-200 text-red-500 hover:bg-red-50 dark:bg-red-950/30" onClick={() => setDeleteTarget(t)}>
                        <Trash size={14} />
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="mt-4 flex items-center justify-between text-sm">
          <span className="text-stone-500 dark:text-zinc-400">
            {filtered.length} turnamen · halaman {page} dari {totalPages}
          </span>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page === 1}
              onClick={() => setPage(p => p - 1)}
              className="border-stone-300 dark:border-zinc-600"
            >
              ← Sebelumnya
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={page === totalPages}
              onClick={() => setPage(p => p + 1)}
              className="border-stone-300 dark:border-zinc-600"
            >
              Berikutnya →
            </Button>
          </div>
        </div>
      )}

      {/* Create Wizard Dialog */}
      <TournamentWizardDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        games={games}
        onCreated={load}
      />

      {/* Edit Tournament Dialog */}
      <TournamentEditDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        tournament={editTournament}
        onSaved={load}
      />

      {/* Delete Confirmation */}
      <ConfirmDialog
        open={!!deleteTarget}
        title="Hapus Turnamen"
        description={`Yakin ingin menghapus "${deleteTarget?.name}"? Semua data bracket dan match di turnamen ini akan ikut terhapus. Tindakan ini tidak bisa dibatalkan.`}
        confirmLabel={deleting ? 'Menghapus...' : 'Hapus'}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
        loading={deleting}
        variant="destructive"
      />
    </AdminLayout>
  )
}
