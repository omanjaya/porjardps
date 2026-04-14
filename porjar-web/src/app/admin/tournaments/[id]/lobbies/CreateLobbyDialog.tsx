'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { Input } from '@/components/ui/input'
import { FormDialog } from '@/components/shared/FormDialog'
import type { TeamSummary } from '@/types'

interface CreateLobbyDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  teams: TeamSummary[]
  defaultLobbyNumber: number
  defaultNumMaps?: number
  defaultMapNames?: string[]
  onCreate: (data: {
    lobby_name: string
    day_number: number
    lobby_number: number
    num_maps: number
    map_names: string[]
    room_id: string
    room_password: string
    scheduled_at: string
    selected_teams: string[]
  }) => Promise<void>
}

export function CreateLobbyDialog({
  open,
  onOpenChange,
  teams,
  defaultLobbyNumber,
  defaultNumMaps = 1,
  defaultMapNames = [],
  onCreate,
}: CreateLobbyDialogProps) {
  const [lobbyName, setLobbyName] = useState('')
  const [lobbyDay, setLobbyDay] = useState(1)
  const [lobbyNumber, setLobbyNumber] = useState(defaultLobbyNumber)
  const [numMaps, setNumMaps] = useState(defaultNumMaps)
  const [mapNames, setMapNames] = useState<string[]>(defaultMapNames)
  const [scheduledAt, setScheduledAt] = useState('')
  const [selectedTeams, setSelectedTeams] = useState<string[]>([])
  const [creating, setCreating] = useState(false)

  function handleNumMapsChange(n: number) {
    setNumMaps(n)
    setMapNames((prev) => {
      const next = [...prev]
      while (next.length < n) next.push('')
      return next.slice(0, n)
    })
  }

  function resetForm() {
    setLobbyName('')
    setLobbyDay(1)
    setLobbyNumber(defaultLobbyNumber)
    setNumMaps(defaultNumMaps)
    setMapNames(defaultMapNames)
    setScheduledAt('')
    setSelectedTeams([])
  }

  function toggleTeamSelection(teamId: string) {
    setSelectedTeams((prev) =>
      prev.includes(teamId) ? prev.filter((id) => id !== teamId) : [...prev, teamId]
    )
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (lobbyDay < 1) { toast.error('Day number harus minimal 1'); return }
    if (lobbyNumber < 1) { toast.error('Nomor POT harus minimal 1'); return }
    if (numMaps < 1 || numMaps > 10) { toast.error('Jumlah map harus antara 1 dan 10'); return }
    setCreating(true)
    try {
      await onCreate({
        lobby_name: lobbyName,
        day_number: lobbyDay,
        lobby_number: lobbyNumber,
        num_maps: numMaps,
        map_names: mapNames.filter(Boolean),
        room_id: '',
        room_password: '',
        scheduled_at: scheduledAt,
        selected_teams: selectedTeams,
      })
      resetForm()
    } finally {
      setCreating(false)
    }
  }

  function handleOpenChange(nextOpen: boolean) {
    if (!nextOpen) {
      resetForm()
    }
    onOpenChange(nextOpen)
  }

  return (
    <FormDialog
      open={open}
      onOpenChange={handleOpenChange}
      title="Buat POT Baru"
      onSubmit={handleSubmit}
      submitting={creating}
      submitDisabled={!lobbyName.trim()}
      submitLabel="Buat POT"
      maxWidth="lg"
    >
      {/* Basic info */}
      <div className="grid grid-cols-3 gap-3">
        <div className="col-span-3">
          <label className="mb-1 block text-xs font-medium text-stone-500 dark:text-zinc-400">Nama POT</label>
          <Input
            value={lobbyName}
            onChange={(e) => setLobbyName(e.target.value)}
            placeholder="POT 1 - Day 1"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-stone-500 dark:text-zinc-400">Day Number</label>
          <Input
            type="number"
            min={1}
            value={lobbyDay}
            onChange={(e) => setLobbyDay(parseInt(e.target.value) || 1)}
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-stone-500 dark:text-zinc-400">Nomor POT</label>
          <Input
            type="number"
            min={1}
            value={lobbyNumber}
            onChange={(e) => setLobbyNumber(parseInt(e.target.value) || 1)}
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-stone-500 dark:text-zinc-400">Jumlah Map</label>
          <Input
            type="number"
            min={1}
            max={10}
            value={numMaps}
            onChange={(e) => handleNumMapsChange(Math.min(10, Math.max(1, parseInt(e.target.value) || 1)))}
          />
        </div>
      </div>

      {/* Map names */}
      {numMaps > 1 && (
        <div>
          <label className="mb-1 block text-xs font-medium text-stone-500 dark:text-zinc-400">Nama Map (opsional)</label>
          <div className="space-y-2">
            {Array.from({ length: numMaps }, (_, i) => (
              <div key={i} className="flex items-center gap-2">
                <span className="w-14 shrink-0 text-xs text-stone-400 dark:text-zinc-500">Map {i + 1}</span>
                <Input
                  placeholder={`mis. Erangel`}
                  value={mapNames[i] ?? ''}
                  onChange={(e) => {
                    const next = [...mapNames]
                    next[i] = e.target.value
                    setMapNames(next)
                  }}
                  className="text-sm"
                />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Scheduled time */}
      <div>
        <label className="mb-1 block text-xs font-medium text-stone-500 dark:text-zinc-400">Jadwal</label>
        <Input
          type="datetime-local"
          value={scheduledAt}
          onChange={(e) => setScheduledAt(e.target.value)}
        />
      </div>

      {/* Team assignment */}
      <div>
        <label className="mb-1 block text-xs font-medium text-stone-500 dark:text-zinc-400">
          Tim ({selectedTeams.length}/{teams.length} dipilih)
        </label>
        <div className="max-h-40 overflow-y-auto rounded-lg border border-stone-200 dark:border-zinc-700 bg-stone-50 dark:bg-zinc-800/50 p-2 space-y-1">
          <button
            type="button"
            onClick={() =>
              setSelectedTeams(
                selectedTeams.length === teams.length
                  ? []
                  : teams.map((t) => t.id)
              )
            }
            className="w-full text-left text-xs text-stone-500 dark:text-zinc-400 hover:text-stone-900 dark:hover:text-zinc-100 px-2 py-1 rounded hover:bg-stone-100 dark:hover:bg-zinc-700"
          >
            {selectedTeams.length === teams.length ? 'Hapus Semua' : 'Pilih Semua'}
          </button>
          {teams.map((team) => (
            <label
              key={team.id}
              className="flex items-center gap-2 rounded px-2 py-1 hover:bg-stone-100 dark:hover:bg-zinc-700 cursor-pointer"
            >
              <input
                type="checkbox"
                checked={selectedTeams.includes(team.id)}
                onChange={() => toggleTeamSelection(team.id)}
                className="rounded border-stone-300 dark:border-zinc-600"
              />
              <span className="text-sm text-stone-700 dark:text-zinc-300">{team.name}</span>
            </label>
          ))}
        </div>
      </div>
    </FormDialog>
  )
}
