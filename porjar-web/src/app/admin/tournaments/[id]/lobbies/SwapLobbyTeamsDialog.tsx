'use client'

import { useState, useEffect } from 'react'
import { toast } from 'sonner'
import { api } from '@/lib/api'
import { FormDialog } from '@/components/shared/FormDialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { ArrowsLeftRight } from '@phosphor-icons/react'
import type { BRLobby } from '@/types'

interface SwapLobbyTeamsDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  tournamentId: string
  lobbies: BRLobby[]
  lobbyTeams: Record<string, { id: string; name: string }[]>
  onSuccess: () => void
}

export function SwapLobbyTeamsDialog({
  open,
  onOpenChange,
  tournamentId,
  lobbies,
  lobbyTeams,
  onSuccess,
}: SwapLobbyTeamsDialogProps) {
  const [lobbyAId, setLobbyAId] = useState('')
  const [teamAId, setTeamAId] = useState('')
  const [lobbyBId, setLobbyBId] = useState('')
  const [teamBId, setTeamBId] = useState('')
  const [swapping, setSwapping] = useState(false)

  // Reset on open
  useEffect(() => {
    if (open) {
      setLobbyAId('')
      setTeamAId('')
      setLobbyBId('')
      setTeamBId('')
    }
  }, [open])

  // Reset team selection when lobby changes
  useEffect(() => { setTeamAId('') }, [lobbyAId])
  useEffect(() => { setTeamBId('') }, [lobbyBId])

  const swappableLobbies = lobbies.filter(
    (l) => l.status === 'pending' || l.status === 'scheduled'
  )

  const teamsA = lobbyAId ? (lobbyTeams[lobbyAId] ?? []) : []
  const teamsB = lobbyBId ? (lobbyTeams[lobbyBId] ?? []) : []

  const teamAName = teamsA.find((t) => t.id === teamAId)?.name ?? ''
  const teamBName = teamsB.find((t) => t.id === teamBId)?.name ?? ''
  const lobbyAName = swappableLobbies.find((l) => l.id === lobbyAId)?.lobby_name ?? ''
  const lobbyBName = swappableLobbies.find((l) => l.id === lobbyBId)?.lobby_name ?? ''

  const canSwap = !!(lobbyAId && teamAId && lobbyBId && teamBId && lobbyAId !== lobbyBId)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!canSwap) return
    setSwapping(true)
    try {
      await api.post(`/admin/tournaments/${tournamentId}/lobbies/swap-teams`, {
        team_a_id: teamAId,
        lobby_a_id: lobbyAId,
        team_b_id: teamBId,
        lobby_b_id: lobbyBId,
      })
      toast.success(`${teamAName} ↔ ${teamBName} berhasil ditukar`)
      onOpenChange(false)
      onSuccess()
    } catch {
      toast.error('Gagal menukar tim')
    } finally {
      setSwapping(false)
    }
  }

  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Tukar Tim Antar POT"
      description="Pilih satu tim dari masing-masing POT untuk ditukar posisinya. Hanya POT berstatus pending atau scheduled yang bisa ditukar."
      onSubmit={handleSubmit}
      submitting={swapping}
      submitDisabled={!canSwap}
      submitLabel="Tukar Tim"
      maxWidth="lg"
    >
      <div className="grid grid-cols-[1fr_auto_1fr] items-start gap-3">
        {/* Side A */}
        <div className="space-y-2">
          <p className="text-xs font-semibold text-stone-500 dark:text-zinc-400 uppercase tracking-wide">
            POT Asal
          </p>
          <Select value={lobbyAId} onValueChange={(v) => setLobbyAId(v ?? '')}>
            <SelectTrigger className="w-full text-sm">
              <SelectValue placeholder="Pilih POT..." />
            </SelectTrigger>
            <SelectContent>
              {swappableLobbies.map((l) => (
                <SelectItem key={l.id} value={l.id} className="text-sm">
                  {l.lobby_name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={teamAId} onValueChange={(v) => setTeamAId(v ?? '')} disabled={!lobbyAId || teamsA.length === 0}>
            <SelectTrigger className="w-full text-sm">
              <SelectValue placeholder={teamsA.length === 0 ? 'Belum ada tim' : 'Pilih tim...'} />
            </SelectTrigger>
            <SelectContent>
              {teamsA.map((t) => (
                <SelectItem key={t.id} value={t.id} className="text-sm">
                  {t.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Arrow */}
        <div className="flex items-center justify-center pt-10">
          <ArrowsLeftRight size={20} className="text-stone-400 dark:text-zinc-500" />
        </div>

        {/* Side B */}
        <div className="space-y-2">
          <p className="text-xs font-semibold text-stone-500 dark:text-zinc-400 uppercase tracking-wide">
            POT Tujuan
          </p>
          <Select value={lobbyBId} onValueChange={(v) => setLobbyBId(v ?? '')}>
            <SelectTrigger className="w-full text-sm">
              <SelectValue placeholder="Pilih POT..." />
            </SelectTrigger>
            <SelectContent>
              {swappableLobbies
                .filter((l) => l.id !== lobbyAId)
                .map((l) => (
                  <SelectItem key={l.id} value={l.id} className="text-sm">
                    {l.lobby_name}
                  </SelectItem>
                ))}
            </SelectContent>
          </Select>

          <Select value={teamBId} onValueChange={(v) => setTeamBId(v ?? '')} disabled={!lobbyBId || teamsB.length === 0}>
            <SelectTrigger className="w-full text-sm">
              <SelectValue placeholder={teamsB.length === 0 ? 'Belum ada tim' : 'Pilih tim...'} />
            </SelectTrigger>
            <SelectContent>
              {teamsB.map((t) => (
                <SelectItem key={t.id} value={t.id} className="text-sm">
                  {t.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Preview */}
      {canSwap && (
        <div className="rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 px-4 py-2.5 text-sm text-amber-800 dark:text-amber-300">
          <strong>{teamAName}</strong> ({lobbyAName}) ↔ <strong>{teamBName}</strong> ({lobbyBName})
        </div>
      )}
    </FormDialog>
  )
}
