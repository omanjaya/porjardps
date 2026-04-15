'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams } from 'next/navigation'
import { toast } from 'sonner'
import { api } from '@/lib/api'
import { useAuthStore } from '@/store/auth-store'
import { PageHeader } from '@/components/shared/PageHeader'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
import { Plus, Play, ArrowRight, CheckCircle, Clock, Trash } from '@phosphor-icons/react'
import Link from 'next/link'
import type { Tournament, TournamentStageConfig } from '@/types'

const STAGE_TYPES = [
  { value: 'swiss', label: 'Swiss System' },
  { value: 'round_robin', label: 'Round Robin' },
  { value: 'group_stage', label: 'Group Stage' },
  { value: 'single_elimination', label: 'Single Elimination' },
  { value: 'double_elimination', label: 'Double Elimination' },
  { value: 'battle_royale', label: 'Battle Royale' },
]

const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-stone-100 text-stone-600 dark:bg-zinc-800 dark:text-zinc-400',
  active: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400',
  completed: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400',
}

const STATUS_LABELS: Record<string, string> = {
  pending: 'Menunggu',
  active: 'Aktif',
  completed: 'Selesai',
}

function stageLink(tournamentId: string, stageType: string): string {
  switch (stageType) {
    case 'swiss':
      return `/admin/tournaments/${tournamentId}/swiss`
    case 'round_robin':
    case 'group_stage':
      return `/admin/tournaments/${tournamentId}/groups`
    case 'single_elimination':
    case 'double_elimination':
      return `/admin/tournaments/${tournamentId}/bracket`
    case 'battle_royale':
      return `/admin/tournaments/${tournamentId}/lobbies`
    default:
      return `/admin/tournaments/${tournamentId}`
  }
}

export default function AdminStagesPage() {
  const { isAuthenticated, isLoading: authLoading } = useAuthStore()
  const params = useParams<{ id: string }>()
  const [tournament, setTournament] = useState<Tournament | null>(null)
  const [stages, setStages] = useState<TournamentStageConfig[]>([])
  const [loading, setLoading] = useState(true)
  const [operating, setOperating] = useState(false)

  // Add stage dialog
  const [showAdd, setShowAdd] = useState(false)
  const [newName, setNewName] = useState('')
  const [newType, setNewType] = useState('swiss')
  const [newOrder, setNewOrder] = useState(1)
  const [adding, setAdding] = useState(false)

  // Confirm delete
  const [deleteTarget, setDeleteTarget] = useState<TournamentStageConfig | null>(null)

  const loadData = useCallback(async () => {
    if (!isAuthenticated || authLoading) return
    try {
      const [t, s] = await Promise.all([
        api.get<Tournament>(`/tournaments/${params.id}`),
        api.get<TournamentStageConfig[]>(`/tournaments/${params.id}/stages`).catch(() => [] as TournamentStageConfig[]),
      ])
      setTournament(t)
      setStages((s ?? []).sort((a, b) => a.stage_order - b.stage_order))
    } catch {
      toast.error('Gagal memuat data stages')
    } finally {
      setLoading(false)
    }
  }, [params.id, isAuthenticated, authLoading])

  useEffect(() => { loadData() }, [loadData])

  const handleAddStage = async () => {
    if (!newName.trim()) return
    setAdding(true)
    try {
      await api.post(`/admin/tournaments/${params.id}/stages`, {
        name: newName.trim(),
        stage_type: newType,
        stage_order: newOrder,
        config: {},
      })
      toast.success('Stage berhasil ditambahkan')
      setShowAdd(false)
      setNewName('')
      setNewOrder(stages.length + 2)
      loadData()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Gagal menambahkan stage')
    } finally {
      setAdding(false)
    }
  }

  const handleDeleteStage = async () => {
    if (!deleteTarget) return
    setOperating(true)
    try {
      await api.delete(`/admin/tournaments/${params.id}/stages/${deleteTarget.id}`)
      toast.success('Stage berhasil dihapus')
      setDeleteTarget(null)
      loadData()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Gagal menghapus stage')
    } finally {
      setOperating(false)
    }
  }

  const handleActivate = async (stageId: string) => {
    setOperating(true)
    try {
      await api.put(`/admin/tournaments/${params.id}/stages/${stageId}`, { status: 'active' })
      toast.success('Stage diaktifkan')
      loadData()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Gagal mengaktifkan stage')
    } finally {
      setOperating(false)
    }
  }

  const handleComplete = async (stageId: string) => {
    setOperating(true)
    try {
      await api.put(`/admin/tournaments/${params.id}/stages/${stageId}`, { status: 'completed' })
      toast.success('Stage ditandai selesai')
      loadData()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Gagal menyelesaikan stage')
    } finally {
      setOperating(false)
    }
  }

  const handleAdvance = async (stageId: string) => {
    setOperating(true)
    try {
      await api.post(`/admin/tournaments/${params.id}/stages/${stageId}/advance`)
      toast.success('Tim berhasil dimajukan ke stage berikutnya')
      loadData()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Gagal memajukan tim')
    } finally {
      setOperating(false)
    }
  }

  if (loading) {
    return (
      <>
        <Skeleton className="h-10 w-64 bg-stone-200" />
        <Skeleton className="mt-4 h-96 w-full bg-stone-200" />
      </>
    )
  }

  return (
    <>
      <PageHeader
        title="Multi-Stage"
        description={tournament?.name}
        breadcrumbs={[
          { label: 'Turnamen', href: '/admin/tournaments' },
          { label: tournament?.name ?? '', href: `/admin/tournaments/${params.id}` },
          { label: 'Stages' },
        ]}
        actions={
          <Button size="sm" onClick={() => { setNewOrder(stages.length + 1); setShowAdd(true) }} className="bg-esi-red hover:bg-esi-red/90">
            <Plus className="mr-1.5 h-4 w-4" /> Tambah Stage
          </Button>
        }
      />

      {stages.length === 0 ? (
        <div className="rounded-xl border-2 border-dashed border-stone-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 p-12 text-center">
          <Play size={48} className="mx-auto mb-3 text-stone-300 dark:text-zinc-600" />
          <p className="text-lg font-semibold text-stone-700 dark:text-zinc-300">Belum ada stage</p>
          <p className="text-sm text-stone-400 dark:text-zinc-500 mt-1 mb-4">
            Tambahkan stage pertama untuk memulai turnamen multi-stage
          </p>
          <Button onClick={() => { setNewOrder(1); setShowAdd(true) }} className="bg-esi-red hover:bg-esi-red/90">
            <Plus className="mr-1.5 h-4 w-4" /> Tambah Stage Pertama
          </Button>
        </div>
      ) : (
        <div className="relative">
          {/* Vertical timeline line */}
          <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-stone-200 dark:bg-zinc-700" />

          <div className="space-y-4">
            {stages.map((stage, idx) => {
              const typeLabel = STAGE_TYPES.find(t => t.value === stage.stage_type)?.label ?? stage.stage_type
              const hasNext = idx < stages.length - 1

              return (
                <div key={stage.id} className="relative pl-14">
                  {/* Circle on timeline */}
                  <div className={`absolute left-3.5 top-4 flex h-5 w-5 items-center justify-center rounded-full border-2 text-[10px] font-bold ${
                    stage.status === 'completed'
                      ? 'border-green-500 bg-green-500 text-white'
                      : stage.status === 'active'
                        ? 'border-esi-red bg-esi-red text-white'
                        : 'border-stone-300 dark:border-zinc-600 bg-white dark:bg-zinc-900 text-stone-500 dark:text-zinc-400'
                  }`}>
                    {stage.stage_order}
                  </div>

                  <div className="rounded-xl border border-stone-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 p-5 shadow-sm">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="text-sm font-bold text-stone-900 dark:text-zinc-100">{stage.name}</h3>
                          <Badge className={`${STATUS_COLORS[stage.status] ?? ''} text-[10px] px-1.5 py-0`}>
                            {STATUS_LABELS[stage.status] ?? stage.status}
                          </Badge>
                        </div>
                        <p className="text-xs text-stone-500 dark:text-zinc-400">
                          {typeLabel}
                          {stage.config?.advance_count ? ` \u00b7 Top ${stage.config.advance_count} lolos` : ''}
                        </p>
                      </div>

                      <div className="flex flex-wrap gap-1.5">
                        <Link href={stageLink(params.id, stage.stage_type)}>
                          <Button variant="outline" size="sm" className="h-7 text-xs">
                            <ArrowRight size={12} className="mr-1" /> Kelola
                          </Button>
                        </Link>

                        {stage.status === 'pending' && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-7 text-xs text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/30"
                            disabled={operating}
                            onClick={() => handleActivate(stage.id)}
                          >
                            <Play size={12} className="mr-1" /> Aktifkan
                          </Button>
                        )}

                        {stage.status === 'active' && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-7 text-xs text-green-600 hover:bg-green-50 dark:hover:bg-green-950/30"
                            disabled={operating}
                            onClick={() => handleComplete(stage.id)}
                          >
                            <CheckCircle size={12} className="mr-1" /> Selesai
                          </Button>
                        )}

                        {stage.status === 'completed' && hasNext && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-7 text-xs text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/30"
                            disabled={operating}
                            onClick={() => handleAdvance(stage.id)}
                          >
                            <ArrowRight size={12} className="mr-1" /> Advance
                          </Button>
                        )}

                        {stage.status === 'pending' && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-7 text-xs text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30"
                            disabled={operating}
                            onClick={() => setDeleteTarget(stage)}
                          >
                            <Trash size={12} />
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Add Stage Dialog */}
      <Dialog open={showAdd} onOpenChange={setShowAdd}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Tambah Stage Baru</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <label className="mb-1 block text-sm font-medium text-stone-700 dark:text-zinc-300">Nama Stage</label>
              <Input
                placeholder="Contoh: Fase Swiss, Playoff, Grand Final"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-stone-700 dark:text-zinc-300">Tipe</label>
              <Select value={newType} onValueChange={(v) => setNewType(v ?? '')}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STAGE_TYPES.map(t => (
                    <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-stone-700 dark:text-zinc-300">Urutan</label>
              <Input type="number" min={1} value={newOrder} onChange={(e) => setNewOrder(parseInt(e.target.value) || 1)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAdd(false)}>Batal</Button>
            <Button onClick={handleAddStage} disabled={adding || !newName.trim()} className="bg-esi-red hover:bg-esi-red/90">
              {adding ? 'Menambahkan...' : 'Tambah Stage'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm Dialog */}
      <Dialog open={!!deleteTarget} onOpenChange={(open) => { if (!open) setDeleteTarget(null) }}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Hapus Stage</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-stone-600 dark:text-zinc-400 py-2">
            Yakin ingin menghapus stage &ldquo;{deleteTarget?.name}&rdquo;? Aksi ini tidak bisa dibatalkan.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>Batal</Button>
            <Button onClick={handleDeleteStage} disabled={operating} className="bg-red-600 hover:bg-red-700 text-white">
              {operating ? 'Menghapus...' : 'Hapus'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
