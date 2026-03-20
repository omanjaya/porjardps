import { Skeleton } from '@/components/ui/skeleton'

export default function DashboardLoading() {
  return (
    <div className="space-y-6 p-6">
      {/* Welcome card skeleton */}
      <div className="rounded-xl border border-porjar-border bg-white p-5 shadow-sm">
        <div className="flex items-center gap-4">
          <Skeleton className="h-14 w-14 rounded-xl bg-porjar-border" />
          <div className="space-y-2">
            <Skeleton className="h-6 w-48 bg-porjar-border" />
            <Skeleton className="h-4 w-32 bg-porjar-border" />
          </div>
        </div>
      </div>

      {/* Team card skeleton */}
      <div className="rounded-xl border border-porjar-border bg-white p-5 shadow-sm">
        <Skeleton className="mb-3 h-5 w-24 bg-porjar-border" />
        <Skeleton className="h-24 w-full rounded-lg bg-porjar-border" />
      </div>

      {/* Quick links skeleton */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="flex flex-col items-center gap-2 rounded-xl border border-porjar-border bg-white p-4 shadow-sm"
          >
            <Skeleton className="h-10 w-10 rounded-lg bg-porjar-border" />
            <Skeleton className="h-3 w-16 bg-porjar-border" />
          </div>
        ))}
      </div>
    </div>
  )
}
