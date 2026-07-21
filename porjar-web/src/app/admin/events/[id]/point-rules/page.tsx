'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams } from 'next/navigation'
import { api } from '@/lib/api'
import { useAuthStore } from '@/store/auth-store'
import { PageHeader } from '@/components/shared/PageHeader'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import { toast } from 'sonner'
import { Plus, Trash, FloppyDisk } from '@phosphor-icons/react'
import type { EventPointRule, Event } from '@/types'

interface RuleRow {
  rank_position: number
  points: number
}

const DEFAULT_RULES: RuleRow[] = [
  { rank_position: 1, points: 100 },
  { rank_position: 2, points: 75 },
  { rank_position: 3, points: 50 },
  { rank_position: 4, points: 40 },
  { rank_position: 5, points: 30 },
  { rank_position: 6, points: 20 },
  { rank_position: 7, points: 20 },
  { rank_position: 8, points: 20 },
  { rank_position: 9, points: 10 },
  { rank_position: 10, points: 10 },
  { rank_position: 11, points: 10 },
  { rank_position: 12, points: 10 },
  { rank_position: 13, points: 10 },
  { rank_position: 14, points: 10 },
  { rank_position: 15, points: 10 },
  { rank_position: 16, points: 10 },
]

export default function PointRulesPage() {
  const params = useParams<{ id: string }>()
  const { isAuthenticated, isLoading: authLoading } = useAuthStore()
  const [event, setEvent] = useState<Event | null>(null)
  const [rules, setRules] = useState<RuleRow[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const loadData = useCallback(async () => {
    if (!isAuthenticated || authLoading) return
    try {
      const [eventData, rulesData] = await Promise.all([
        api.get<Event>(`/admin/events/${params.id}`),
        api.get<EventPointRule[]>(`/admin/events/${params.id}/point-rules`),
      ])
      setEvent(eventData ?? null)
      setRules(
        (rulesData ?? []).map((r) => ({
          rank_position: r.rank_position,
          points: r.points,
        }))
      )
    } catch {
      toast.error('Gagal memuat data')
    } finally {
      setLoading(false)
    }
  }, [params.id, isAuthenticated, authLoading])

  useEffect(() => {
    loadData()
  }, [loadData])

  const addRow = () => {
    const nextRank = rules.length > 0 ? Math.max(...rules.map((r) => r.rank_position)) + 1 : 1
    setRules([...rules, { rank_position: nextRank, points: 0 }])
  }

  const removeRow = (idx: number) => {
    setRules(rules.filter((_, i) => i !== idx))
  }

  const updateRow = (idx: number, field: 'rank_position' | 'points', value: number) => {
    setRules(rules.map((r, i) => (i === idx ? { ...r, [field]: value } : r)))
  }

  const loadDefaultTemplate = async () => {
    setSaving(true)
    try {
      await api.put(`/admin/events/${params.id}/point-rules`, { rules: DEFAULT_RULES })
      toast.success('Template default berhasil dimuat')
      await loadData()
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Gagal memuat template'
      toast.error(message)
    } finally {
      setSaving(false)
    }
  }

  const handleSave = async () => {
    if (rules.length === 0) {
      toast.error('Tambahkan minimal satu rule')
      return
    }
    setSaving(true)
    try {
      await api.put(`/admin/events/${params.id}/point-rules`, { rules })
      toast.success('Point rules berhasil disimpan')
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Gagal menyimpan'
      toast.error(message)
    } finally {
      setSaving(false)
    }
  }

  if (authLoading || loading) {
    return (
      <>
        <div className="space-y-4">
          <Skeleton className="h-10 w-64 bg-stone-100 dark:bg-zinc-800" />
          <Skeleton className="h-64 w-full bg-stone-100 dark:bg-zinc-800" />
        </div>
      </>
    )
  }

  return (
    <>
      <PageHeader
        title="Point Rules"
        description={event ? `Konfigurasi poin untuk ${event.name}` : 'Konfigurasi poin event'}
        breadcrumbs={[
          { label: 'Events', href: '/admin/events' },
          { label: event?.name ?? '...', href: `/admin/events/${params.id}` },
          { label: 'Point Rules' },
        ]}
        actions={
          <div className="flex gap-2">
            <Button variant="outline" onClick={addRow}>
              <Plus size={14} className="mr-1.5" /> Tambah
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              <FloppyDisk size={14} className="mr-1.5" /> {saving ? 'Menyimpan...' : 'Simpan'}
            </Button>
          </div>
        }
      />

      <div className="rounded-xl border border-stone-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="border-stone-200 dark:border-zinc-700 bg-esi-red/5 hover:bg-esi-red/5">
                <TableHead className="w-32 text-stone-600 dark:text-zinc-400 font-semibold">Juara Ke-</TableHead>
                <TableHead className="w-40 text-stone-600 dark:text-zinc-400 font-semibold">Poin</TableHead>
                <TableHead className="w-20 text-stone-600 dark:text-zinc-400 font-semibold">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rules.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={3} className="text-center py-8 text-stone-400 dark:text-zinc-500">
                    <p className="mb-3">Belum ada rules. Klik &quot;Tambah&quot; untuk menambahkan.</p>
                    <Button variant="outline" size="sm" onClick={loadDefaultTemplate} disabled={saving}>
                      {saving ? 'Memuat...' : 'Muat Template Default'}
                    </Button>
                  </TableCell>
                </TableRow>
              ) : (
                rules.map((rule, idx) => (
                  <TableRow key={idx} className="border-stone-100 dark:border-zinc-800">
                    <TableCell>
                      <Input
                        type="number"
                        min={1}
                        value={rule.rank_position}
                        onChange={(e) => updateRow(idx, 'rank_position', parseInt(e.target.value) || 1)}
                        className="w-24 bg-white dark:bg-zinc-800"
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        min={0}
                        value={rule.points}
                        onChange={(e) => updateRow(idx, 'points', parseInt(e.target.value) || 0)}
                        className="w-32 bg-white dark:bg-zinc-800"
                      />
                    </TableCell>
                    <TableCell>
                      <Button variant="ghost" size="sm" onClick={() => removeRow(idx)} className="text-red-500 hover:text-red-700">
                        <Trash size={14} />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      <div className="mt-6 rounded-lg border border-stone-200 dark:border-zinc-700 bg-stone-50 dark:bg-zinc-800 p-4">
        <h4 className="text-sm font-semibold text-stone-700 dark:text-zinc-300 mb-2">Cara Kerja</h4>
        <ul className="text-sm text-stone-500 dark:text-zinc-400 space-y-1 list-disc list-inside">
          <li>Ketika tournament selesai, sistem otomatis mendistribusikan poin berdasarkan ranking akhir.</li>
          <li>Setiap anggota tim yang menang juga mendapat poin personal yang sama.</li>
          <li>Admin bisa trigger ulang distribusi poin dari halaman tournament.</li>
        </ul>
      </div>
    </>
  )
}
