'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { ArrowsClockwise } from '@phosphor-icons/react'
import type { TeamSummary } from '@/types'

interface CreateLobbyDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  teams: TeamSummary[]
  defaultLobbyNumber: number
  onCreate: (data: {
    lobby_name: string
    day_number: number
    lobby_number: number
    room_id: string
    room_password: string
    scheduled_at: string
    selected_teams: string[]
  }) => Promise<void>
}

function generateRandomId(length: number): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
  return Array.from({ length }, () => chars[Math.floor(Math.random() * chars.length)]).join('')
}

export function CreateLobbyDialog({
  open,
  onOpenChange,
  teams,
  defaultLobbyNumber,
  onCreate,
}: CreateLobbyDialogProps) {
  const [lobbyName, setLobbyName] = useState('')
  const [lobbyDay, setLobbyDay] = useState(1)
  const [lobbyNumber, setLobbyNumber] = useState(defaultLobbyNumber)
  const [roomId, setRoomId] = useState('')
  const [roomPassword, setRoomPassword] = useState('')
  const [scheduledAt, setScheduledAt] = useState('')
  const [selectedTeams, setSelectedTeams] = useState<string[]>([])
  const [creating, setCreating] = useState(false)

  function resetForm() {
    setLobbyName('')
    setLobbyDay(1)
    setLobbyNumber(defaultLobbyNumber)
    setRoomId('')
    setRoomPassword('')
    setScheduledAt('')
    setSelectedTeams([])
  }

  function toggleTeamSelection(teamId: string) {
    setSelectedTeams((prev) =>
      prev.includes(teamId) ? prev.filter((id) => id !== teamId) : [...prev, teamId]
    )
  }

  async function handleCreate() {
    setCreating(true)
    try {
      await onCreate({
        lobby_name: lobbyName,
        day_number: lobbyDay,
        lobby_number: lobbyNumber,
        room_id: roomId,
        room_password: roomPassword,
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
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="bg-white border-stone-200 text-stone-900 max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-stone-900">Buat POT Baru</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          {/* Basic info */}
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className="mb-1 block text-xs font-medium text-stone-500">Nama POT</label>
              <Input
                value={lobbyName}
                onChange={(e) => setLobbyName(e.target.value)}
                placeholder="POT 1 - Day 1"
                className="bg-white border-stone-300 text-stone-900 focus:border-porjar-red focus:ring-porjar-red/20"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-stone-500">Day Number</label>
              <Input
                type="number"
                min={1}
                value={lobbyDay}
                onChange={(e) => setLobbyDay(parseInt(e.target.value) || 1)}
                className="bg-white border-stone-300 text-stone-900 focus:border-porjar-red focus:ring-porjar-red/20"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-stone-500">Nomor POT</label>
              <Input
                type="number"
                min={1}
                value={lobbyNumber}
                onChange={(e) => setLobbyNumber(parseInt(e.target.value) || 1)}
                className="bg-white border-stone-300 text-stone-900 focus:border-porjar-red focus:ring-porjar-red/20"
              />
            </div>
          </div>

          {/* Room credentials */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-stone-500">Room ID</label>
              <div className="flex gap-1.5">
                <Input
                  value={roomId}
                  onChange={(e) => setRoomId(e.target.value)}
                  placeholder="Room ID"
                  className="bg-white border-stone-300 text-stone-900 focus:border-porjar-red focus:ring-porjar-red/20"
                />
                <Button
                  variant="outline"
                  onClick={() => setRoomId(generateRandomId(8))}
                  className="h-9 px-2 border-stone-300 text-stone-500 shrink-0"
                  title="Generate random"
                >
                  <ArrowsClockwise size={14} />
                </Button>
              </div>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-stone-500">Room Password</label>
              <div className="flex gap-1.5">
                <Input
                  value={roomPassword}
                  onChange={(e) => setRoomPassword(e.target.value)}
                  placeholder="Password"
                  className="bg-white border-stone-300 text-stone-900 focus:border-porjar-red focus:ring-porjar-red/20"
                />
                <Button
                  variant="outline"
                  onClick={() => setRoomPassword(generateRandomId(6))}
                  className="h-9 px-2 border-stone-300 text-stone-500 shrink-0"
                  title="Generate random"
                >
                  <ArrowsClockwise size={14} />
                </Button>
              </div>
            </div>
          </div>

          {/* Scheduled time */}
          <div>
            <label className="mb-1 block text-xs font-medium text-stone-500">Jadwal</label>
            <Input
              type="datetime-local"
              value={scheduledAt}
              onChange={(e) => setScheduledAt(e.target.value)}
              className="bg-white border-stone-300 text-stone-900 focus:border-porjar-red focus:ring-porjar-red/20"
            />
          </div>

          {/* Team assignment */}
          <div>
            <label className="mb-1 block text-xs font-medium text-stone-500">
              Tim ({selectedTeams.length}/{teams.length} dipilih)
            </label>
            <div className="max-h-40 overflow-y-auto rounded-lg border border-stone-200 bg-stone-50 p-2 space-y-1">
              <button
                onClick={() =>
                  setSelectedTeams(
                    selectedTeams.length === teams.length
                      ? []
                      : teams.map((t) => t.id)
                  )
                }
                className="w-full text-left text-xs text-stone-500 hover:text-stone-900 px-2 py-1 rounded hover:bg-stone-100"
              >
                {selectedTeams.length === teams.length ? 'Hapus Semua' : 'Pilih Semua'}
              </button>
              {teams.map((team) => (
                <label
                  key={team.id}
                  className="flex items-center gap-2 rounded px-2 py-1 hover:bg-stone-100 cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={selectedTeams.includes(team.id)}
                    onChange={() => toggleTeamSelection(team.id)}
                    className="rounded border-stone-300"
                  />
                  <span className="text-sm text-stone-700">{team.name}</span>
                </label>
              ))}
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => handleOpenChange(false)}
            className="border-stone-300 text-stone-600"
          >
            Batal
          </Button>
          <Button onClick={handleCreate} disabled={creating || !lobbyName.trim()} className="bg-porjar-red hover:bg-porjar-red-dark text-white">
            {creating ? 'Membuat...' : 'Buat POT'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
