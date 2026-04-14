'use client'

import { Trophy, ArrowRight } from '@phosphor-icons/react'

export function BracketPosition({ path }: { path: string[] }) {
  return (
    <div className="rounded-xl border border-esi-border bg-white dark:bg-zinc-900 p-3 sm:p-5 shadow-sm">
      <h2 className="mb-3 flex items-center gap-2 text-sm font-bold text-esi-text">
        <Trophy size={18} weight="bold" className="text-esi-red" />
        Posisi di Bracket
      </h2>
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        {path.map((step, i) => (
          <div key={i} className="flex shrink-0 items-center gap-2">
            {i > 0 && (
              <ArrowRight size={14} className="text-stone-400 dark:text-zinc-500" />
            )}
            <span
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold ${
                i === path.length - 1
                  ? 'bg-esi-red/10 text-esi-red border border-esi-red/20'
                  : 'bg-stone-100 dark:bg-zinc-800 text-stone-600 dark:text-zinc-400'
              }`}
            >
              {step}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
