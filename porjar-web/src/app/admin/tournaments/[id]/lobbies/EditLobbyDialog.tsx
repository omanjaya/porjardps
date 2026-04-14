'use client'

import { useState, useEffect } from 'react'
import { Input } from '@/components/ui/input'
import { FormDialog } from '@/components/shared/FormDialog'
import type { BRLobby } from '@/types'

interface EditLobbyDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  lobby: BRLobby | null
  onSave: (lobbyId: string, data: {
    lobby_name: string
    num_maps: number
    map_names: string[]
    scheduled_at: string
  }) => Promise<void>
}

export function EditLobbyDialog({ open, onOpenChange, lobby, onSave }: EditLobbyDialogProps) {
  const [lobbyName, setLobbyName] = useState('')
  const [numMaps, setNumMaps] = useState(1)
  const [mapNames, setMapNames] = useState<string[]>([])
  const [scheduledAt, setScheduledAt] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (lobby) {
      setLobbyName(lobby.lobby_name)
      setNumMaps(lobby.num_maps ?? 1)
      setMapNames(lobby.map_names ?? [])
      setScheduledAt(lobby.scheduled_at ? lobby.scheduled_at.slice(0, 16) : '')
    }
  }, [lobby])

  function handleNumMapsChange(n: number) {
    setNumMaps(n)
    setMapNames((prev) => {
      const next = [...prev]
      while (next.length < n) next.push('')
      return next.slice(0, n)
    })
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!lobby) return
    setSaving(true)
    try {
      await onSave(lobby.id, {
        lobby_name: lobbyName,
        num_maps: numMaps,
        map_names: mapNames.filter(Boolean),
        scheduled_at: scheduledAt,
      })
      onOpenChange(false)
    } finally {
      setSaving(false)
    }
  }

  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Edit POT"
      onSubmit={handleSubmit}
      submitting={saving}
      submitDisabled={!lobbyName.trim()}
    >
      <div>
        <label className="mb-1 block text-xs font-medium text-stone-500 dark:text-zinc-400">Nama POT</label>
        <Input
          value={lobbyName}
          onChange={(e) => setLobbyName(e.target.value)}
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="mb-1 block text-xs font-medium text-stone-500 dark:text-zinc-400">Jumlah Map</label>
          <Input
            type="number"
            min={1}
            max={5}
            value={numMaps}
            onChange={(e) => handleNumMapsChange(Math.min(5, Math.max(1, parseInt(e.target.value) || 1)))}
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-stone-500 dark:text-zinc-400">Jadwal</label>
          <Input
            type="datetime-local"
            value={scheduledAt}
            onChange={(e) => setScheduledAt(e.target.value)}
          />
        </div>
      </div>

      {numMaps > 0 && (
        <div>
          <label className="mb-1 block text-xs font-medium text-stone-500 dark:text-zinc-400">
            Nama Map {numMaps === 1 ? '(opsional)' : ''}
          </label>
          <div className="space-y-2">
            {Array.from({ length: numMaps }, (_, i) => (
              <div key={i} className="flex items-center gap-2">
                <span className="w-14 shrink-0 text-xs text-stone-400 dark:text-zinc-500">Map {i + 1}</span>
                <Input
                  placeholder="mis. Erangel"
                  value={mapNames[i] ?? ''}
                  onChange={(e) => {
                    const next = [...mapNames]
                    while (next.length <= i) next.push('')
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
    </FormDialog>
  )
}
