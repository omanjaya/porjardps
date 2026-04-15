'use client'

import { useState, useEffect, useCallback } from 'react'
import { toast } from 'sonner'
import {
  Trophy,
  FloppyDisk,
  Spinner,
} from '@phosphor-icons/react'
import { PageHeader } from '@/components/shared/PageHeader'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { api, ApiError } from '@/lib/api'
import { cn } from '@/lib/utils'
import type { Tournament, TournamentPenaltyConfig } from '@/types'

interface TournamentWithPenalties {
  tournament: Tournament
  yellow_point_deduction: number
  red_point_deduction: number
  red_is_disqualification: boolean
}

export default function AdminPenaltiesPage() {
  const [data, setData] = useState<TournamentWithPenalties[]>([])
  const [loading, setLoading] = useState(true)
  const [savingId, setSavingId] = useState<string | null>(null)

  const loadData = useCallback(async () => {
    try {
      const tournaments = await api.get<Tournament[]>('/tournaments')
      const all = tournaments ?? []

      const withPenalties: TournamentWithPenalties[] = await Promise.all(
        all.map(async (t) => {
          try {
            const configs = await api.get<TournamentPenaltyConfig[]>(`/admin/tournaments/${t.id}/penalty-config`)
            const yellow = (configs ?? []).find((c) => c.card_type === 'yellow')
            const red = (configs ?? []).find((c) => c.card_type === 'red')
            return {
              tournament: t,
              yellow_point_deduction: yellow?.point_deduction ?? 1,
              red_point_deduction: red?.point_deduction ?? 3,
              red_is_disqualification: red?.is_disqualification ?? false,
            }
          } catch {
            return {
              tournament: t,
              yellow_point_deduction: 1,
              red_point_deduction: 3,
              red_is_disqualification: false,
            }
          }
        })
      )

      setData(withPenalties)
    } catch (err) {
      console.error('Gagal memuat data:', err)
      toast.error('Gagal memuat konfigurasi penalti')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadData()
  }, [loadData])

  function updateField(
    tournamentId: string,
    field: keyof Omit<TournamentWithPenalties, 'tournament'>,
    value: number | boolean
  ) {
    setData((prev) =>
      prev.map((item) =>
        item.tournament.id === tournamentId ? { ...item, [field]: value } : item
      )
    )
  }

  async function handleSave(item: TournamentWithPenalties) {
    setSavingId(item.tournament.id)
    try {
      await api.put(`/admin/tournaments/${item.tournament.id}/penalty-config`, {
        yellow_point_deduction: item.yellow_point_deduction,
        red_point_deduction: item.red_point_deduction,
        red_is_disqualification: item.red_is_disqualification,
      })
      toast.success('Konfigurasi penalti berhasil disimpan')
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Gagal menyimpan konfigurasi')
    } finally {
      setSavingId(null)
    }
  }

  return (
    <>
      <PageHeader
        title="Konfigurasi Penalti Kartu"
        description="Atur poin pengurangan kartu kuning dan merah per turnamen"
        breadcrumbs={[
          { label: 'Pengaturan', href: '/admin/settings' },
          { label: 'Penalti' },
        ]}
      />

      {loading ? (
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-48 rounded-xl bg-stone-200" />
          ))}
        </div>
      ) : data.length > 0 ? (
        <div className="space-y-4">
          {data.map((item) => {
            const isSaving = savingId === item.tournament.id
            return (
              <section
                key={item.tournament.id}
                className="rounded-xl border border-esi-border bg-white dark:bg-zinc-900 p-4 sm:p-6 shadow-sm"
              >
                <div className="mb-4 flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-esi-red/10">
                    <Trophy size={20} weight="duotone" className="text-esi-red" />
                  </div>
                  <div>
                    <h2 className="text-base font-semibold text-esi-text">{item.tournament.name}</h2>
                    <p className="text-xs text-esi-muted capitalize">{item.tournament.format} · {item.tournament.status}</p>
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  {/* Yellow card */}
                  <div className="rounded-lg border border-yellow-200 bg-yellow-50/50 p-4">
                    <div className="mb-3 flex items-center gap-2">
                      <span className="inline-block h-5 w-4 rounded-sm bg-yellow-400" />
                      <span className="text-sm font-bold text-yellow-800">Kartu Kuning</span>
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-medium text-yellow-700">
                        Pengurangan Poin
                      </label>
                      <Input
                        type="number"
                        min={0}
                        max={100}
                        value={item.yellow_point_deduction}
                        onChange={(e) =>
                          updateField(
                            item.tournament.id,
                            'yellow_point_deduction',
                            Math.max(0, e.target.value === '' ? 0 : parseInt(e.target.value))
                          )
                        }
                        className="h-9 w-24 border-yellow-300 bg-white dark:bg-zinc-900 text-sm focus:border-yellow-500 focus:ring-yellow-400/20"
                      />
                    </div>
                  </div>

                  {/* Red card */}
                  <div className="rounded-lg border border-red-200 bg-red-50 dark:bg-red-950/30 p-4">
                    <div className="mb-3 flex items-center gap-2">
                      <span className="inline-block h-5 w-4 rounded-sm bg-red-500" />
                      <span className="text-sm font-bold text-red-800">Kartu Merah</span>
                    </div>
                    <div className="space-y-3">
                      <div>
                        <label className="mb-1 block text-xs font-medium text-red-700">
                          Pengurangan Poin
                        </label>
                        <Input
                          type="number"
                          min={0}
                          max={100}
                          value={item.red_point_deduction}
                          onChange={(e) =>
                            updateField(
                              item.tournament.id,
                              'red_point_deduction',
                              Math.max(0, e.target.value === '' ? 0 : parseInt(e.target.value))
                            )
                          }
                          className="h-9 w-24 border-red-300 bg-white dark:bg-zinc-900 text-sm focus:border-red-500 focus:ring-red-400/20"
                        />
                      </div>
                      <div className="flex items-center justify-between rounded-lg border border-red-200 bg-white dark:bg-zinc-900 px-3 py-2">
                        <div>
                          <p className="text-xs font-medium text-red-800">Diskualifikasi</p>
                          <p className="text-[11px] text-red-600">Tim langsung didiskualifikasi</p>
                        </div>
                        <button
                          type="button"
                          role="switch"
                          aria-checked={item.red_is_disqualification}
                          onClick={() =>
                            updateField(
                              item.tournament.id,
                              'red_is_disqualification',
                              !item.red_is_disqualification
                            )
                          }
                          className={cn(
                            'relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-2',
                            item.red_is_disqualification ? 'bg-red-500' : 'bg-stone-200'
                          )}
                        >
                          <span
                            className={cn(
                              'pointer-events-none inline-block h-5 w-5 rounded-full bg-white dark:bg-zinc-900 shadow-lg ring-0 transition-transform duration-200 ease-in-out',
                              item.red_is_disqualification ? 'translate-x-5' : 'translate-x-0'
                            )}
                          />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mt-4 flex justify-end">
                  <Button
                    onClick={() => handleSave(item)}
                    disabled={isSaving}
                    className="bg-esi-red text-white hover:bg-esi-red/90"
                    size="sm"
                  >
                    {isSaving ? (
                      <Spinner size={14} className="mr-1 animate-spin" />
                    ) : (
                      <FloppyDisk size={14} className="mr-1" />
                    )}
                    {isSaving ? 'Menyimpan...' : 'Simpan'}
                  </Button>
                </div>
              </section>
            )
          })}
        </div>
      ) : (
        <div className="rounded-xl border border-stone-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 p-10 text-center shadow-sm">
          <Trophy size={40} weight="duotone" className="mx-auto mb-3 text-esi-border" />
          <p className="text-sm text-esi-muted">Belum ada turnamen terdaftar</p>
        </div>
      )}
    </>
  )
}
