'use client'

import Link from 'next/link'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@/components/ui/tooltip'
import {
  Trophy, PencilSimple, Spinner, Medal,
  Archive, Rows, UsersThree, UsersFour, Lightning, Warning,
  ClipboardText, CloudArrowUp, EyeSlash,
} from '@phosphor-icons/react'
import type { Event } from '@/types'
import type { EventHealthEntry } from './types'

const STATUS_LABEL: Record<Event['status'], string> = {
  draft: 'Draft',
  published: 'Published',
  ongoing: 'Ongoing',
  completed: 'Completed',
  archived: 'Archived',
}

const STATUS_VARIANT: Record<Event['status'], 'default' | 'secondary' | 'destructive' | 'outline'> = {
  draft: 'secondary',
  published: 'default',
  ongoing: 'default',
  completed: 'outline',
  archived: 'outline',
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '-'
  return new Date(dateStr).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })
}

export function EventHealthCard({
  event, health, checked, onToggle, archivingId, onArchive,
  publishingId, onTogglePublish,
}: {
  event: Event
  health: EventHealthEntry | undefined
  checked: boolean
  onToggle: () => void
  archivingId: string | null
  onArchive: (event: Event) => void
  publishingId?: string | null
  onTogglePublish?: (event: Event) => void
}) {
  const t = health?.tournaments
  const attentionTotal = health?.attention.total ?? 0
  const liveMatches = health?.live_matches ?? 0

  return (
    <Card
      size="sm"
      className={`ring-1 ${checked ? 'ring-esi-red/60 bg-red-50/40 dark:bg-red-950/20' : 'ring-stone-200 dark:ring-zinc-700'} !py-0 overflow-visible`}
    >
      <div className="flex flex-col gap-3 p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3 min-w-0">
            <input
              type="checkbox"
              className="mt-1.5 h-4 w-4 shrink-0 accent-esi-red"
              checked={checked}
              onChange={onToggle}
              aria-label={`Pilih ${event.name}`}
            />
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg" style={{ background: event.primary_color + '20' }}>
              <Trophy size={18} weight="fill" style={{ color: event.primary_color }} />
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <Link href={`/admin/events/${event.id}`} className="font-semibold text-esi-text hover:underline truncate">
                  {event.name}
                </Link>
                <Badge variant={STATUS_VARIANT[event.status]}>{STATUS_LABEL[event.status]}</Badge>
                {attentionTotal > 0 && (
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger>
                        <Badge variant="destructive" className="gap-1">
                          <Warning size={12} weight="fill" />
                          {attentionTotal}
                        </Badge>
                      </TooltipTrigger>
                      <TooltipContent>
                        {health?.attention.disputed_submissions ?? 0} disputed · {health?.attention.overdue_matches ?? 0} overdue
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                )}
                {liveMatches > 0 && (
                  <Badge className="gap-1 bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 border-transparent animate-pulse">
                    <Lightning size={12} weight="fill" />
                    {liveMatches} live
                  </Badge>
                )}
              </div>
              <p className="text-xs text-esi-muted mt-0.5">
                {formatDate(event.start_date)} – {formatDate(event.end_date)}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-0.5 shrink-0">
            {onTogglePublish && (event.status === 'draft' || event.status === 'published') && (
              <Button
                variant="ghost" size="sm"
                title={event.status === 'draft' ? 'Publish event' : 'Kembalikan ke draft'}
                disabled={publishingId === event.id}
                onClick={() => onTogglePublish(event)}
              >
                {publishingId === event.id
                  ? <Spinner size={16} className="animate-spin" />
                  : event.status === 'draft'
                    ? <CloudArrowUp size={16} />
                    : <EyeSlash size={16} />
                }
              </Button>
            )}
            <Link href={`/admin/events/${event.id}/registrations`}>
              <Button variant="ghost" size="sm" title="Pendaftar Event">
                <ClipboardText size={16} />
              </Button>
            </Link>
            <Link href={`/admin/events/${event.id}/teams`}>
              <Button variant="ghost" size="sm" title="Kelola & Assign Tim">
                <UsersFour size={16} />
              </Button>
            </Link>
            <Link href={`/admin/events/${event.id}/sections`}>
              <Button variant="ghost" size="sm" title="Sections">
                <Rows size={16} />
              </Button>
            </Link>
            <Link href={`/admin/events/${event.id}/admins`}>
              <Button variant="ghost" size="sm" title="Admin Event">
                <UsersThree size={16} />
              </Button>
            </Link>
            <Link href={`/admin/events/${event.id}/point-rules`}>
              <Button variant="ghost" size="sm" title="Point Rules">
                <Medal size={16} />
              </Button>
            </Link>
            <Link href={`/admin/events/${event.id}/edit`}>
              <Button variant="ghost" size="sm" title="Edit event">
                <PencilSimple size={16} />
              </Button>
            </Link>
            {event.status === 'completed' && (
              <Button
                variant="ghost" size="sm" title="Arsipkan event"
                disabled={archivingId === event.id}
                onClick={() => onArchive(event)}
              >
                {archivingId === event.id
                  ? <Spinner size={16} className="animate-spin" />
                  : <Archive size={16} />
                }
              </Button>
            )}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 rounded-lg bg-stone-50 dark:bg-zinc-800/50 px-3 py-2 text-xs text-esi-muted">
          <span>
            <b className="text-esi-text">{t?.total ?? 0}</b> turnamen
            {t && t.total > 0 && (
              <> · {t.ongoing} ongoing / {t.completed} selesai / {t.upcoming} upcoming</>
            )}
          </span>
          <span className="text-stone-300 dark:text-zinc-600">|</span>
          <span><b className="text-esi-text">{health?.teams_total ?? 0}</b> tim</span>
        </div>
      </div>
    </Card>
  )
}
