'use client'

import { useState } from 'react'
import {
  CheckCircle, Clock, Circle, ArrowCounterClockwise,
  Image as ImageIcon,
} from '@phosphor-icons/react'
import { cn } from '@/lib/utils'
import type { GroupMatch } from '@/types'

// toDatetimeLocal converts an ISO/RFC3339 string to datetime-local input value (YYYY-MM-DDTHH:MM)
export function toDatetimeLocal(iso?: string | null): string {
  if (!iso) return ''
  try {
    const d = new Date(iso)
    const pad = (n: number) => String(n).padStart(2, '0')
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
  } catch { return '' }
}

// formatScheduled shows a short display string e.g. "26 Mar 09:00"
export function formatScheduled(iso?: string | null): string {
  if (!iso) return ''
  try {
    return new Date(iso).toLocaleString('id-ID', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
  } catch { return '' }
}

interface GroupMatchCardProps {
  match: GroupMatch
  groupId: string
  onSave: (id: string, gid: string, sa: number, sb: number, scheduledAt?: string) => void
  onSetLive: (id: string, gid: string) => void
  onResetSubmissions?: (id: string) => void
  onViewSubmissions?: (match: GroupMatch) => void
}

export function GroupMatchCard({ match, groupId, onSave, onSetLive, onResetSubmissions, onViewSubmissions }: GroupMatchCardProps) {
  const [editing, setEditing] = useState(false)
  const [saStr, setSaStr] = useState(String(match.score_a))
  const [sbStr, setSbStr] = useState(String(match.score_b))
  const [scheduledLocal, setScheduledLocal] = useState(toDatetimeLocal(match.scheduled_at))
  const completed = match.status === 'completed'
  const isLive = match.status === 'live'

  const openEdit = () => {
    setSaStr(String(match.score_a))
    setSbStr(String(match.score_b))
    setScheduledLocal(toDatetimeLocal(match.scheduled_at))
    setEditing(true)
  }

  const handleSave = () => {
    let scheduledAt: string | undefined
    if (scheduledLocal) {
      try { scheduledAt = new Date(scheduledLocal).toISOString() } catch { /* ignore */ }
    }
    onSave(match.id, groupId, parseInt(saStr) || 0, parseInt(sbStr) || 0, scheduledAt)
    setEditing(false)
  }

  return (
    <div className={cn(
      'rounded-lg border px-3 py-2.5 transition-all',
      completed ? 'border-green-200 bg-green-50 dark:bg-green-950/30' : isLive ? 'border-red-300 bg-red-50 dark:border-red-800 dark:bg-red-950/30' : 'border-stone-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 hover:border-stone-300 dark:border-zinc-600'
    )}>
      <div className="flex items-center gap-2">
        <span className="text-[9px] font-bold text-stone-400 dark:text-zinc-500 bg-stone-100 dark:bg-zinc-800 rounded px-1.5 py-0.5">R{match.round}</span>
        {completed && <CheckCircle size={12} weight="fill" className="text-green-500" />}
        {isLive && (
          <span className="inline-flex items-center gap-1 rounded-full bg-red-600 px-1.5 py-0.5 text-[9px] font-bold text-white animate-pulse">
            <Circle size={6} weight="fill" /> LIVE
          </span>
        )}
        {!completed && !isLive && <Clock size={12} className="text-stone-300 dark:text-zinc-600" />}
        {!completed && !isLive && (
          <button
            onClick={() => onSetLive(match.id, groupId)}
            className="text-[9px] font-medium text-stone-400 dark:text-zinc-500 hover:text-red-500 dark:hover:text-red-400 transition-colors"
            title="Set LIVE"
          >
            LIVE
          </button>
        )}
        {!completed && match.scheduled_at && (
          <span className="text-[9px] text-stone-400 dark:text-zinc-500">Jadwal: {formatScheduled(match.scheduled_at)}</span>
        )}
        {(completed || isLive) && onViewSubmissions && (
          <button
            onClick={() => onViewSubmissions(match)}
            className="text-[9px] font-medium text-blue-500 hover:text-blue-600 transition-colors ml-auto bg-blue-50 dark:bg-blue-950/30 rounded px-1.5 py-0.5"
            title="Lihat submissions"
          >
            <ImageIcon size={10} className="inline mr-0.5" />
            Submissions
          </button>
        )}
        {(completed || isLive) && onResetSubmissions && (
          <button
            onClick={() => onResetSubmissions(match.id)}
            className={cn("text-[9px] font-medium text-amber-500 hover:text-amber-600 transition-colors", !onViewSubmissions && "ml-auto")}
            title="Reset submissions & skor"
          >
            <ArrowCounterClockwise size={12} />
          </button>
        )}
      </div>
      <div className="flex items-center justify-between mt-1.5">
        <span className="text-xs font-medium text-stone-700 dark:text-zinc-300 truncate flex-1">{match.team_a?.name ?? 'TBD'}</span>
        {editing ? (
          <div className="flex items-center gap-1 mx-2">
            <input type="number" min={0} value={saStr} onFocus={e => e.target.select()}
              onChange={e => setSaStr(e.target.value)}
              className="w-10 h-7 text-center text-xs font-bold border border-stone-300 dark:border-zinc-600 rounded focus:border-esi-red focus:outline-none" />
            <span className="text-[10px] text-stone-400 dark:text-zinc-500">-</span>
            <input type="number" min={0} value={sbStr} onFocus={e => e.target.select()}
              onChange={e => setSbStr(e.target.value)}
              className="w-10 h-7 text-center text-xs font-bold border border-stone-300 dark:border-zinc-600 rounded focus:border-esi-red focus:outline-none" />
          </div>
        ) : (
          <button onClick={openEdit} className="mx-2 rounded bg-stone-100 dark:bg-zinc-800 px-2.5 py-1 text-xs font-bold text-stone-600 dark:text-zinc-400 hover:bg-stone-200 tabular-nums">
            {completed ? `${match.score_a} - ${match.score_b}` : '_ - _'}
          </button>
        )}
        <span className="text-xs font-medium text-stone-700 dark:text-zinc-300 truncate flex-1 text-right">{match.team_b?.name ?? 'TBD'}</span>
      </div>
      {editing && (
        <>
          <div className="mt-2">
            <label className="text-[9px] text-stone-400 dark:text-zinc-500 uppercase tracking-wide font-semibold">Jadwal (opsional)</label>
            <input
              type="datetime-local"
              value={scheduledLocal}
              onChange={e => setScheduledLocal(e.target.value)}
              className="mt-0.5 w-full h-7 text-xs border border-stone-300 dark:border-zinc-600 rounded px-2 focus:border-esi-red focus:outline-none bg-white dark:bg-zinc-900 text-stone-700 dark:text-zinc-300"
            />
          </div>
          <div className="flex justify-end gap-1.5 mt-2">
            <button onClick={() => setEditing(false)} className="text-[10px] text-stone-400 dark:text-zinc-500 hover:text-stone-600 dark:text-zinc-400 px-2 py-0.5">Batal</button>
            <button onClick={handleSave}
              className="text-[10px] font-bold text-white bg-esi-red rounded px-2.5 py-0.5 hover:bg-esi-red/90">Simpan</button>
          </div>
        </>
      )}
    </div>
  )
}
