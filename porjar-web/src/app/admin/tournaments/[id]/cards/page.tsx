'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { useParams } from 'next/navigation'
import { toast } from 'sonner'
import {
  IdentificationCard,
  CheckCircle,
  XCircle,
  Funnel,
  Spinner,
} from '@phosphor-icons/react'
import { PageHeader } from '@/components/shared/PageHeader'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { api, ApiError } from '@/lib/api'
import { cn } from '@/lib/utils'
import type { Tournament, MatchCard } from '@/types'

type CardFilter = 'all' | 'yellow' | 'red'

export default function AdminTournamentCardsPage() {
  const params = useParams<{ id: string }>()
  const [tournament, setTournament] = useState<Tournament | null>(null)
  const [cards, setCards] = useState<MatchCard[]>([])
  const [loading, setLoading] = useState(true)
  const [cardFilter, setCardFilter] = useState<CardFilter>('all')
  const [teamFilter, setTeamFilter] = useState('all')

  // Revoke dialog
  const [revokeTarget, setRevokeTarget] = useState<{ id: string; teamName: string } | null>(null)
  const [revoking, setRevoking] = useState(false)

  // Revoke all
  const [revokeAllConfirm, setRevokeAllConfirm] = useState(false)
  const [revokingAll, setRevokingAll] = useState(false)

  const loadData = useCallback(async () => {
    try {
      const [tournamentData, cardsData] = await Promise.all([
        api.get<Tournament>(`/tournaments/${params.id}`),
        api.get<MatchCard[]>(`/admin/tournaments/${params.id}/cards`),
      ])
      setTournament(tournamentData)
      setCards(cardsData ?? [])
    } catch (err) {
      console.error('Gagal memuat data:', err)
      toast.error(err instanceof Error ? err.message : 'Gagal memuat data kartu')
    } finally {
      setLoading(false)
    }
  }, [params.id])

  useEffect(() => {
    loadData()
  }, [loadData])

  const teams = useMemo(() => {
    const names = [...new Set(cards.map((c) => c.team_name).filter(Boolean))]
    return names.sort()
  }, [cards])

  const filtered = useMemo(() => {
    return cards.filter((c) => {
      if (cardFilter !== 'all' && c.card_type !== cardFilter) return false
      if (teamFilter !== 'all' && c.team_name !== teamFilter) return false
      return true
    })
  }, [cards, cardFilter, teamFilter])

  async function handleRevoke() {
    if (!revokeTarget) return
    setRevoking(true)
    try {
      await api.post(`/admin/cards/${revokeTarget.id}/revoke`)
      toast.success('Kartu berhasil dicabut')
      setRevokeTarget(null)
      await loadData()
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Gagal mencabut kartu')
    } finally {
      setRevoking(false)
    }
  }

  const activeCards = useMemo(() => cards.filter((c) => !c.is_revoked), [cards])

  async function handleRevokeAll() {
    setRevokingAll(true)
    let success = 0
    let failed = 0
    for (const card of activeCards) {
      try {
        await api.post(`/admin/cards/${card.id}/revoke`)
        success++
      } catch {
        failed++
      }
    }
    if (success > 0) toast.success(`${success} kartu berhasil dicabut`)
    if (failed > 0) toast.error(`${failed} kartu gagal dicabut`)
    setRevokeAllConfirm(false)
    setRevokingAll(false)
    await loadData()
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
        title="Riwayat Kartu"
        description={tournament ? `Semua kartu pelanggaran di turnamen ${tournament.name}` : 'Riwayat kartu pelanggaran'}
        breadcrumbs={[
          { label: 'Turnamen', href: '/admin/tournaments' },
          { label: tournament?.name ?? '...', href: `/admin/tournaments/${params.id}` },
          { label: 'Kartu' },
        ]}
      />

      {/* Filters */}
      <div className="mb-4 flex flex-wrap items-center gap-3 rounded-xl border border-stone-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 p-4 shadow-sm">
        <div className="flex items-center gap-2">
          <Funnel size={16} className="text-esi-muted" />
          <span className="text-xs font-semibold uppercase text-esi-muted">Filter</span>
        </div>

        {/* Card type filter */}
        <div className="flex gap-1">
          {([
            { value: 'all', label: 'Semua' },
            { value: 'yellow', label: 'Kuning' },
            { value: 'red', label: 'Merah' },
          ] as const).map((f) => (
            <button
              key={f.value}
              onClick={() => setCardFilter(f.value)}
              className={cn(
                'rounded-lg px-3 py-1 text-xs font-medium transition-colors',
                cardFilter === f.value
                  ? 'bg-esi-red/10 text-esi-red'
                  : 'text-esi-muted hover:bg-esi-bg'
              )}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* Revoke all */}
        {activeCards.length > 0 && (
          <Button
            size="sm"
            variant="outline"
            className="border-red-200 text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30"
            onClick={() => setRevokeAllConfirm(true)}
          >
            <XCircle size={14} className="mr-1" />
            Cabut Semua ({activeCards.length})
          </Button>
        )}

        {/* Team filter */}
        {teams.length > 0 && (
          <div className="ml-auto">
            <select
              value={teamFilter}
              onChange={(e) => setTeamFilter(e.target.value)}
              className="rounded-lg border border-stone-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 py-1 text-xs text-stone-700 dark:text-zinc-300 focus:border-esi-red focus:outline-none"
            >
              <option value="all">Semua Tim</option>
              {teams.map((t) => (
                <option key={t} value={t!}>{t}</option>
              ))}
            </select>
          </div>
        )}
      </div>

      {filtered.length > 0 ? (
        <div className="rounded-xl border border-stone-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-stone-200 dark:border-zinc-700 hover:bg-transparent bg-stone-50 dark:bg-zinc-800/50">
                  <TableHead className="text-stone-600 dark:text-zinc-400 uppercase text-xs tracking-wider">Waktu</TableHead>
                  <TableHead className="text-stone-600 dark:text-zinc-400 uppercase text-xs tracking-wider">Tim</TableHead>
                  <TableHead className="text-stone-600 dark:text-zinc-400 uppercase text-xs tracking-wider">Kartu</TableHead>
                  <TableHead className="text-stone-600 dark:text-zinc-400 uppercase text-xs tracking-wider">Poin</TableHead>
                  <TableHead className="text-stone-600 dark:text-zinc-400 uppercase text-xs tracking-wider">Alasan</TableHead>
                  <TableHead className="text-stone-600 dark:text-zinc-400 uppercase text-xs tracking-wider">Wasit</TableHead>
                  <TableHead className="text-stone-600 dark:text-zinc-400 uppercase text-xs tracking-wider">Status</TableHead>
                  <TableHead className="text-right text-stone-600 dark:text-zinc-400 uppercase text-xs tracking-wider">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((card) => (
                  <TableRow key={card.id} className="border-stone-100 dark:border-zinc-700 hover:bg-stone-50 dark:hover:bg-zinc-800 dark:bg-zinc-800/50">
                    <TableCell className="text-sm text-stone-600 dark:text-zinc-400 whitespace-nowrap">
                      {new Date(card.created_at).toLocaleDateString('id-ID', {
                        day: 'numeric',
                        month: 'short',
                      })}
                      <br />
                      <span className="text-[11px] text-stone-400 dark:text-zinc-500">
                        {new Date(card.created_at).toLocaleTimeString('id-ID', {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span className="font-medium text-stone-900 dark:text-zinc-100">{card.team_name ?? '-'}</span>
                    </TableCell>
                    <TableCell>
                      <span
                        className={cn(
                          'inline-flex items-center gap-1 rounded px-2 py-0.5 text-xs font-bold',
                          card.card_type === 'yellow'
                            ? 'bg-yellow-100 text-yellow-800'
                            : 'bg-red-100 text-red-800'
                        )}
                      >
                        <span
                          className={cn(
                            'inline-block h-3.5 w-2.5 rounded-sm',
                            card.card_type === 'yellow' ? 'bg-yellow-400' : 'bg-red-500'
                          )}
                        />
                        {card.card_type === 'yellow' ? 'Kuning' : 'Merah'}
                      </span>
                    </TableCell>
                    <TableCell className="text-sm tabular-nums text-stone-600 dark:text-zinc-400">
                      -{card.point_deduction}
                    </TableCell>
                    <TableCell className="text-sm text-stone-600 dark:text-zinc-400 max-w-[180px] truncate">
                      {card.reason}
                    </TableCell>
                    <TableCell className="text-sm text-stone-600 dark:text-zinc-400">
                      {card.issuer_name ?? '-'}
                    </TableCell>
                    <TableCell>
                      {card.is_revoked ? (
                        <span className="inline-flex items-center gap-1 rounded-full border border-red-200 bg-red-50 dark:bg-red-950/30 px-2.5 py-0.5 text-xs font-medium text-red-700">
                          <XCircle size={12} weight="fill" />
                          Dicabut
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-full border border-green-200 bg-green-50 dark:bg-green-950/30 px-2.5 py-0.5 text-xs font-medium text-green-700">
                          <CheckCircle size={12} weight="fill" />
                          Aktif
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      {!card.is_revoked && (
                        <Button
                          size="xs"
                          variant="outline"
                          className="border-red-200 text-red-500 hover:bg-red-50 dark:bg-red-950/30"
                          onClick={() => setRevokeTarget({ id: card.id, teamName: card.team_name ?? 'Tim' })}
                        >
                          Revoke
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      ) : (
        <div className="rounded-xl border border-stone-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 p-10 text-center shadow-sm">
          <IdentificationCard size={40} weight="duotone" className="mx-auto mb-3 text-esi-border" />
          <p className="text-sm text-esi-muted">
            {cardFilter !== 'all' || teamFilter !== 'all'
              ? 'Tidak ada kartu yang cocok dengan filter'
              : 'Belum ada kartu pelanggaran di turnamen ini'}
          </p>
        </div>
      )}

      {/* Revoke Confirmation */}
      <ConfirmDialog
        open={!!revokeTarget}
        title="Cabut Kartu"
        description={`Yakin ingin mencabut kartu untuk tim "${revokeTarget?.teamName}"? Poin yang dikurangi akan dikembalikan.`}
        confirmLabel={revoking ? 'Mencabut...' : 'Cabut Kartu'}
        onConfirm={handleRevoke}
        onCancel={() => setRevokeTarget(null)}
        loading={revoking}
        variant="destructive"
      />

      {/* Revoke All Confirmation */}
      <ConfirmDialog
        open={revokeAllConfirm}
        title="Cabut Semua Kartu Aktif"
        description={`Yakin ingin mencabut semua ${activeCards.length} kartu aktif? Semua poin yang dikurangi akan dikembalikan.`}
        confirmLabel={revokingAll ? 'Mencabut...' : `Cabut Semua (${activeCards.length})`}
        onConfirm={handleRevokeAll}
        onCancel={() => setRevokeAllConfirm(false)}
        loading={revokingAll}
        variant="destructive"
      />
    </>
  )
}
