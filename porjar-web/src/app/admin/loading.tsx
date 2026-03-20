import { Skeleton } from '@/components/ui/skeleton'

export default function AdminLoading() {
  return (
    <div className="space-y-8 p-6">
      {/* Page header skeleton */}
      <div className="space-y-2">
        <Skeleton className="h-8 w-40 bg-porjar-border" />
        <Skeleton className="h-4 w-64 bg-porjar-border" />
      </div>

      {/* Stat cards skeleton */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="rounded-xl border border-porjar-border bg-white p-5 shadow-sm"
          >
            <div className="flex items-center gap-4">
              <Skeleton className="h-14 w-14 rounded-xl bg-porjar-border" />
              <div className="space-y-1.5">
                <Skeleton className="h-8 w-16 bg-porjar-border" />
                <Skeleton className="h-4 w-24 bg-porjar-border" />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Live matches skeleton */}
      <div>
        <Skeleton className="mb-4 h-6 w-40 bg-porjar-border" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 2 }).map((_, i) => (
            <Skeleton key={i} className="h-44 rounded-xl bg-porjar-border" />
          ))}
        </div>
      </div>

      {/* Bottom grid skeleton */}
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-xl border border-porjar-border bg-white p-5 shadow-sm">
          <Skeleton className="mb-4 h-6 w-36 bg-porjar-border" />
          <div className="space-y-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex gap-3">
                <Skeleton className="mt-2 h-2 w-2 shrink-0 rounded-full bg-porjar-border" />
                <div className="flex-1 space-y-1.5">
                  <Skeleton className="h-4 w-3/4 bg-porjar-border" />
                  <Skeleton className="h-3 w-20 bg-porjar-border" />
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="rounded-xl border border-porjar-border bg-white p-5 shadow-sm">
          <Skeleton className="mb-4 h-6 w-36 bg-porjar-border" />
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-16 rounded-lg bg-porjar-border" />
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
