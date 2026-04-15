'use client'

import { useEffect, useState } from 'react'
import { Buildings } from '@phosphor-icons/react'
import { Skeleton } from '@/components/ui/skeleton'
import { EmptyState } from '@/components/shared/EmptyState'
import { useEvent } from '@/contexts/EventContext'
import { api } from '@/lib/api'
import type { School } from '@/types'

export default function EventSchoolsPage() {
  const event = useEvent()
  const [schools, setSchools] = useState<School[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    api
      .get<School[] | { data?: School[] }>(`/schools?event_id=${event.id}&per_page=200`)
      .then((res) => {
        if (cancelled) return
        const list: School[] = Array.isArray(res)
          ? res
          : Array.isArray((res as { data?: School[] })?.data)
            ? (res as { data: School[] }).data
            : []
        setSchools(list)
      })
      .catch(() => setSchools([]))
      .finally(() => !cancelled && setLoading(false))
    return () => {
      cancelled = true
    }
  }, [event.id])

  return (
    <>
      <div className="mb-6 sm:mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-esi-red/10">
            <Buildings size={22} weight="duotone" className="text-esi-red" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-stone-900 dark:text-zinc-100">Sekolah Peserta</h1>
            <p className="text-sm text-stone-500 dark:text-zinc-400">Sekolah yang berpartisipasi</p>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
          {[1,2,3,4,5,6].map(i => (
            <Skeleton key={i} className="h-40 rounded-xl bg-stone-100 dark:bg-zinc-800" />
          ))}
        </div>
      ) : schools.length === 0 ? (
        <EmptyState icon={Buildings} title="Belum ada sekolah" description="Belum ada sekolah yang berpartisipasi dalam event ini." />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {schools.map((s) => (
            <div
              key={s.id}
              className="rounded-xl border border-stone-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 p-4 flex items-center gap-3"
            >
              <Buildings size={28} style={{ color: event.primary_color }} />
              <div className="flex-1 min-w-0">
                <h3 className="font-bold text-stone-800 dark:text-zinc-100 truncate">{s.name}</h3>
                {(s as unknown as { city?: string }).city && (
                  <p className="text-xs text-stone-500 truncate">
                    {(s as unknown as { city?: string }).city}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  )
}
