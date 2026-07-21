'use client'

import Link from 'next/link'
import { Skeleton } from '@/components/ui/skeleton'
import { CalendarBlank, Lightning, Clock, Warning } from '@phosphor-icons/react'
import type { Icon } from '@phosphor-icons/react'
import type { CitywideHealth } from './types'

function Tile({
  label, value, icon: I, href, tone, pulse, loading,
}: {
  label: string
  value: number
  icon: Icon
  href?: string
  tone: 'neutral' | 'green' | 'amber' | 'red'
  pulse?: boolean
  loading: boolean
}) {
  const toneCls: Record<typeof tone, string> = {
    neutral: 'text-stone-600 dark:text-zinc-300 bg-stone-100 dark:bg-zinc-800',
    green: 'text-emerald-600 bg-emerald-50 dark:bg-emerald-950/30',
    amber: 'text-amber-600 bg-amber-50 dark:bg-amber-950/30',
    red: 'text-esi-red bg-red-50 dark:bg-red-950/30',
  }
  const valueCls: Record<typeof tone, string> = {
    neutral: 'text-stone-900 dark:text-zinc-100',
    green: 'text-emerald-600',
    amber: 'text-amber-600',
    red: 'text-esi-red',
  }

  const content = (
    <>
      <div className={`h-9 w-9 rounded-lg flex items-center justify-center mb-2 ${toneCls[tone]} ${pulse && value > 0 ? 'animate-pulse' : ''}`}>
        <I size={18} weight="duotone" />
      </div>
      {loading
        ? <Skeleton className="h-6 w-10 bg-stone-100 dark:bg-zinc-800 mb-1" />
        : <p className={`text-xl sm:text-2xl font-bold tabular-nums ${valueCls[tone]}`}>{value}</p>
      }
      <p className="text-xs text-stone-500 dark:text-zinc-400 mt-0.5">{label}</p>
    </>
  )

  const cls = 'rounded-xl border border-stone-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 p-3.5 sm:p-4 transition-all hover:shadow-md hover:border-stone-300 dark:hover:border-zinc-600'

  return href
    ? <Link href={href} className={cls}>{content}</Link>
    : <div className={cls}>{content}</div>
}

export function CitywideStrip({
  data, loading,
}: {
  data: CitywideHealth | null
  loading: boolean
}) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3 mb-4 sm:mb-6">
      <Tile
        label="Event Berlangsung"
        value={data?.events_ongoing ?? 0}
        icon={CalendarBlank}
        tone="neutral"
        loading={loading}
      />
      <Tile
        label="Live Matches"
        value={data?.live_matches ?? 0}
        icon={Lightning}
        href="/admin/live"
        tone="green"
        pulse
        loading={loading}
      />
      <Tile
        label="Pending Approval"
        value={data?.pending_approvals ?? 0}
        icon={Clock}
        href="/admin/approvals"
        tone="amber"
        loading={loading}
      />
      <Tile
        label="Disputed Submissions"
        value={data?.disputed_submissions ?? 0}
        icon={Warning}
        href="/admin/submissions"
        tone="red"
        loading={loading}
      />
    </div>
  )
}
