'use client'
import { Gear, Check } from '@phosphor-icons/react'
import { useState, useRef, useEffect } from 'react'
import { cn } from '@/lib/utils'

interface ColumnToggleProps {
  columns: { key: string; label: string }[]
  visible: Record<string, boolean>
  onToggle: (key: string) => void
}

export function ColumnToggle({ columns, visible, onToggle }: ColumnToggleProps) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (!ref.current?.contains(e.target as Node)) setOpen(false)
    }
    if (open) document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [open])

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        aria-label="Tampilkan/sembunyikan kolom"
        aria-expanded={open}
        aria-controls="column-toggle-panel"
        className="inline-flex items-center gap-1.5 rounded-lg border border-stone-200 dark:border-zinc-700 px-3 py-2 text-sm font-semibold text-stone-600 dark:text-zinc-400 hover:bg-stone-50 dark:hover:bg-zinc-800"
      >
        <Gear size={14} /> Kolom
      </button>
      {open && (
        <div id="column-toggle-panel" className="absolute right-0 top-full mt-1 w-52 rounded-lg border border-stone-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 shadow-lg z-50 p-1">
          {columns.map(col => (
            <button
              key={col.key}
              onClick={() => onToggle(col.key)}
              className={cn(
                'flex w-full items-center gap-2 rounded-md px-3 py-1.5 text-sm text-left hover:bg-stone-100 dark:hover:bg-zinc-800',
                visible[col.key] ? 'text-stone-900 dark:text-zinc-100' : 'text-stone-400 dark:text-zinc-500'
              )}
            >
              <Check size={14} className={visible[col.key] ? 'opacity-100' : 'opacity-0'} />
              {col.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
