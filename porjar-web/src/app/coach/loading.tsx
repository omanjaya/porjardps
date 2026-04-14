import { Skeleton } from '@/components/ui/skeleton'

export default function CoachLoading() {
  return (
    <div className="space-y-6 p-6">
      {/* Page header skeleton */}
      <div className="space-y-2">
        <Skeleton className="h-8 w-48 bg-esi-border" />
        <Skeleton className="h-4 w-64 bg-esi-border" />
      </div>

      {/* Stats row skeleton */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div
            key={i}
            className="rounded-xl border border-esi-border bg-white dark:bg-zinc-900 p-5 shadow-sm"
          >
            <div className="flex items-center gap-4">
              <Skeleton className="h-12 w-12 rounded-xl bg-esi-border" />
              <div className="space-y-1.5">
                <Skeleton className="h-7 w-14 bg-esi-border" />
                <Skeleton className="h-4 w-20 bg-esi-border" />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Content skeleton */}
      <div className="rounded-xl border border-esi-border bg-white dark:bg-zinc-900 p-5 shadow-sm">
        <Skeleton className="mb-4 h-6 w-32 bg-esi-border" />
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-16 rounded-lg bg-esi-border" />
          ))}
        </div>
      </div>
    </div>
  )
}
