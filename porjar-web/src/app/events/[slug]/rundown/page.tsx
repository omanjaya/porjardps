'use client'

import { ListNumbers, ListBullets } from '@phosphor-icons/react'
import { EmptyState } from '@/components/shared/EmptyState'
import { useEvent } from '@/contexts/EventContext'

interface RundownItem {
  time: string
  title: string
  description?: string
}

export default function EventRundownPage() {
  const event = useEvent()
  const rundown = (event as unknown as { rundown?: RundownItem[] }).rundown ?? []

  return (
    <>
      <div className="mb-6 sm:mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-esi-red/10">
            <ListBullets size={22} weight="duotone" className="text-esi-red" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-stone-900 dark:text-zinc-100">Rundown Acara</h1>
            <p className="text-sm text-stone-500 dark:text-zinc-400">Susunan acara {event.name}</p>
          </div>
        </div>
      </div>

      {rundown.length === 0 ? (
        <EmptyState
          icon={ListNumbers}
          title="Rundown belum tersedia"
          description="Susunan acara untuk event ini belum dipublikasikan."
        />
      ) : (
        <div className="relative pl-6 border-l-2 border-stone-200 dark:border-zinc-700 space-y-5">
          {rundown.map((item, idx) => (
            <div key={idx} className="relative">
              <div
                className="absolute -left-[31px] top-0.5 h-4 w-4 rounded-full border-4 border-white dark:border-zinc-950"
                style={{ backgroundColor: event.primary_color }}
              />
              <div className="rounded-xl border border-stone-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 p-4">
                <div className="flex items-baseline gap-3">
                  <span
                    className="text-sm font-black tabular-nums"
                    style={{ color: event.primary_color }}
                  >
                    {item.time}
                  </span>
                  <h3 className="font-bold text-stone-800 dark:text-zinc-100">{item.title}</h3>
                </div>
                {item.description && (
                  <p className="text-sm text-stone-500 dark:text-zinc-400 mt-1">
                    {item.description}
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
