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

const statusConfig: Record<StatusType, { label: string; className: string }> = {
  pending: {
    label: 'Pending',
    className: 'bg-amber-50 text-amber-700 border-amber-200',
  },
  approved: {
    label: 'Approved',
    className: 'bg-green-50 text-green-700 border-green-200',
  },
  active: {
    label: 'Active',
    className: 'bg-green-50 text-green-700 border-green-200',
  },
  rejected: {
    label: 'Rejected',
    className: 'bg-red-50 text-red-700 border-red-200',
  },
  eliminated: {
    label: 'Eliminated',
    className: 'bg-red-50 text-red-700 border-red-200',
  },
  live: {
    label: 'LIVE',
    className: 'bg-red-50 text-red-700 border-red-200',
  },
  completed: {
    label: 'Completed',
    className: 'bg-stone-100 text-stone-600 border-stone-200',
  },
  scheduled: {
    label: 'Scheduled',
    className: 'bg-blue-50 text-blue-700 border-blue-200',
  },
  upcoming: {
    label: 'Akan Datang',
    className: 'bg-blue-50 text-blue-700 border-blue-200',
  },
  ongoing: {
    label: 'Berlangsung',
    className: 'bg-cyan-50 text-cyan-700 border-cyan-200',
  },
  registration: {
    label: 'Registrasi',
    className: 'bg-amber-50 text-amber-700 border-amber-200',
  },
  cancelled: {
    label: 'Dibatalkan',
    className: 'bg-stone-100 text-stone-500 border-stone-200',
  },
  bye: {
    label: 'BYE',
    className: 'bg-stone-100 text-stone-500 border-stone-200',
  },
  postponed: {
    label: 'Postponed',
    className: 'bg-amber-50 text-amber-700 border-amber-200',
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
    className: 'bg-stone-100 text-stone-500 border-stone-200',
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
        <span className="relative flex h-2 w-2">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-500 opacity-75" />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-red-600" />
        </span>
      )}
      {label ?? config.label}
    </span>
  )
}
