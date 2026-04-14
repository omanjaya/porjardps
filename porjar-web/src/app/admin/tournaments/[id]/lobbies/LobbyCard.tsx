'use client'

import { StatusBadge } from '@/components/shared/StatusBadge'
import { Button } from '@/components/ui/button'
import {
  Clock,
  Users,
  Play,
  CheckCircle,
  Trash,
  PencilSimple,
} from '@phosphor-icons/react'
import type { BRLobby } from '@/types'

interface LobbyCardProps {
  lobby: BRLobby
  lobbyTeams: { id: string; name: string }[]
  onSetLive: (lobby: BRLobby) => void
  onComplete: (lobby: BRLobby) => void
  onInputResults: (lobby: BRLobby) => void
  onEdit: (lobby: BRLobby) => void
  onDelete: (lobby: BRLobby) => void
  expandedLobby: string | null
  setExpandedLobby: (id: string | null) => void
}


export function LobbyCard({
  lobby,
  lobbyTeams,
  onSetLive,
  onComplete,
  onInputResults,
  onEdit,
  onDelete,
  expandedLobby,
  setExpandedLobby,
}: LobbyCardProps) {
  return (
    <div className="rounded-xl border border-stone-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 shadow-sm overflow-hidden">
      {/* Card header */}
      <div className="flex items-start gap-4 px-4 py-3">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-stone-100 dark:bg-zinc-800 text-sm font-bold text-stone-600 dark:text-zinc-400">
          #{lobby.lobby_number}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className="font-semibold text-stone-900 dark:text-zinc-100">{lobby.lobby_name}</p>
            <StatusBadge status={lobby.status} />
          </div>
          <div className="mt-1 flex items-center gap-4 text-xs text-stone-400 dark:text-zinc-500">
            <span>Day {lobby.day_number}</span>
            {(lobby.num_maps ?? 1) > 1 && (
              <span className="rounded bg-blue-100 dark:bg-blue-950/40 px-1.5 py-0.5 text-[10px] font-semibold text-blue-600 dark:text-blue-400">
                {lobby.num_maps} Map
                {(lobby.map_names ?? []).length > 0 && (
                  <span className="ml-1 font-normal opacity-75">({(lobby.map_names ?? []).filter(Boolean).join(', ')})</span>
                )}
              </span>
            )}
            {lobby.scheduled_at && (
              <div className="flex items-center gap-1">
                <Clock size={10} />
                <span>
                  {new Date(lobby.scheduled_at).toLocaleString('id-ID', {
                    day: 'numeric',
                    month: 'short',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </span>
              </div>
            )}
            <div className="flex items-center gap-1">
              <Users size={10} />
              <span>{lobbyTeams.length || (lobby.results ?? []).length} tim</span>
            </div>
          </div>

        </div>
      </div>

      {/* Teams in POT */}
      {lobbyTeams.length > 0 && (
        <div className="border-t border-stone-100 dark:border-zinc-700 px-4 py-2">
          <button
            onClick={() => setExpandedLobby(expandedLobby === lobby.id ? null : lobby.id)}
            className="flex items-center gap-1 text-[11px] font-semibold text-stone-500 dark:text-zinc-400 hover:text-stone-700 dark:text-zinc-300 transition-colors"
          >
            <Users size={12} />
            {lobbyTeams.length} tim
            <span className="text-stone-400 dark:text-zinc-500">{expandedLobby === lobby.id ? '\u25B2' : '\u25BC'}</span>
          </button>
          {expandedLobby === lobby.id && (
            <div className="mt-2 grid grid-cols-2 sm:grid-cols-3 gap-1">
              {lobbyTeams.map((t, idx) => (
                <div key={t.id} className="flex items-center gap-1.5 rounded bg-stone-50 dark:bg-zinc-800/50 px-2 py-1">
                  <span className="text-[9px] font-bold text-stone-400 dark:text-zinc-500 w-4">{idx + 1}.</span>
                  <span className="text-[11px] text-stone-700 dark:text-zinc-300 truncate">{t.name}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Quick actions */}
      <div className="flex items-center gap-1.5 border-t border-stone-100 dark:border-zinc-700 px-4 py-2 bg-stone-50 dark:bg-zinc-800/50">
        {lobby.status === 'pending' || lobby.status === 'scheduled' ? (
          <Button
            variant="outline"
            onClick={() => onSetLive(lobby)}
            className="h-7 border-stone-300 dark:border-zinc-600 text-green-600 hover:bg-green-50 dark:bg-green-950/30 text-xs px-2"
          >
            <Play size={12} className="mr-1" />
            Set Live
          </Button>
        ) : null}

        {lobby.status === 'live' ? (
          <Button
            variant="outline"
            onClick={() => onComplete(lobby)}
            className="h-7 border-stone-300 dark:border-zinc-600 text-blue-600 hover:bg-blue-50 dark:bg-blue-950/30 text-xs px-2"
          >
            <CheckCircle size={12} className="mr-1" />
            Complete
          </Button>
        ) : null}

        <Button
          variant="outline"
          onClick={() => onInputResults(lobby)}
          className="h-7 border-stone-300 dark:border-zinc-600 text-stone-600 dark:text-zinc-400 text-xs px-2"
        >
          <PencilSimple size={12} className="mr-1" />
          Input Hasil
        </Button>

        <Button
          variant="outline"
          onClick={() => onEdit(lobby)}
          className="h-7 border-stone-300 dark:border-zinc-600 text-stone-500 dark:text-zinc-400 text-xs px-2"
        >
          Edit
        </Button>

        <div className="flex-1" />

        <Button
          variant="outline"
          onClick={() => onDelete(lobby)}
          className="h-7 border-stone-300 dark:border-zinc-600 text-red-500 hover:bg-red-50 dark:bg-red-950/30 text-xs px-2"
        >
          <Trash size={12} />
        </Button>
      </div>
    </div>
  )
}
