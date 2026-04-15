import { cn } from '@/lib/utils'

type StatusType =
  | 'pending'
  | 'approved'
  | 'active'
  | 'rejected'
  | 'eliminated'
  | 'live'
  | 'completed'
  | 'scheduled'
  | 'upcoming'
  | 'ongoing'
  | 'cancelled'
  | 'registration'
  | 'bye'
  | 'postponed'
  | 'draft'
  | 'published'

const statusConfig: Record<StatusType, { label: string; className: string }> = {
  pending: {
    label: 'Menunggu',
    className: 'bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-800',
  },
  approved: {
    label: 'Disetujui',
    className: 'bg-green-50 dark:bg-green-950/30 text-green-700 dark:text-green-400 border-green-200 dark:border-green-800',
  },
  active: {
    label: 'Aktif',
    className: 'bg-green-50 dark:bg-green-950/30 text-green-700 dark:text-green-400 border-green-200 dark:border-green-800',
  },
  rejected: {
    label: 'Ditolak',
    className: 'bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-400 border-red-200 dark:border-red-800',
  },
  eliminated: {
    label: 'Tereliminasi',
    className: 'bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-400 border-red-200 dark:border-red-800',
  },
  live: {
    label: 'Live',
    className: 'bg-esi-red/10 dark:bg-red-950/30 text-esi-red dark:text-red-400 border-esi-red/20 dark:border-red-800',
  },
  completed: {
    label: 'Selesai',
    className: 'bg-stone-100 dark:bg-zinc-800 text-stone-600 dark:text-zinc-400 border-stone-200 dark:border-zinc-700',
  },
  scheduled: {
    label: 'Terjadwal',
    className: 'bg-blue-50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-800',
  },
  upcoming: {
    label: 'Akan Datang',
    className: 'bg-blue-50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-800',
  },
  ongoing: {
    label: 'Berlangsung',
    className: 'bg-cyan-50 dark:bg-cyan-950/30 text-cyan-700 dark:text-cyan-400 border-cyan-200 dark:border-cyan-800',
  },
  registration: {
    label: 'Registrasi',
    className: 'bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-800',
  },
  cancelled: {
    label: 'Dibatalkan',
    className: 'bg-stone-100 dark:bg-zinc-800 text-stone-600 dark:text-zinc-400 border-stone-200 dark:border-zinc-700',
  },
  bye: {
    label: 'BYE',
    className: 'bg-stone-100 dark:bg-zinc-800 text-stone-600 dark:text-zinc-400 border-stone-200 dark:border-zinc-700',
  },
  postponed: {
    label: 'Ditunda',
    className: 'bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-800',
  },
  draft: {
    label: 'Draf',
    className: 'bg-stone-100 dark:bg-zinc-800 text-stone-600 dark:text-zinc-400 border-stone-200 dark:border-zinc-700',
  },
  published: {
    label: 'Dipublikasi',
    className: 'bg-blue-50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-800',
  },
}

interface StatusBadgeProps {
  status: string
  label?: string
  className?: string
}

export function StatusBadge({ status, label, className }: StatusBadgeProps) {
  const config = statusConfig[status as StatusType] ?? {
    label: status,
    className: 'bg-stone-100 dark:bg-zinc-800 text-stone-600 dark:text-zinc-400 border-stone-200 dark:border-zinc-700',
  }

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium',
        config.className,
        className
      )}
    >
      {status === 'live' && (
        <>
          <span className="relative flex h-2 w-2" aria-hidden="true">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-500 opacity-75" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-red-600" />
          </span>
          <span className="sr-only">Live</span>
        </>
      )}
      {label ?? config.label}
    </span>
  )
}
