'use client'

import { useState } from 'react'
import { Scales, CaretDown, BookOpen } from '@phosphor-icons/react'
import { EmptyState } from '@/components/shared/EmptyState'
import { useEvent } from '@/contexts/EventContext'

interface RuleSection {
  section: string
  content: string
}

export default function EventRulesPage() {
  const event = useEvent()
  const rules = (event as unknown as { rules_content?: RuleSection[] }).rules_content ?? []
  const [openIdx, setOpenIdx] = useState<number | null>(0)

  const fallbackRules: RuleSection[] = [
    {
      section: 'Umum',
      content:
        'Peraturan umum berlaku untuk semua peserta. Setiap peserta wajib mematuhi peraturan yang ditetapkan oleh panitia.',
    },
    {
      section: 'Pendaftaran',
      content:
        'Pendaftaran dilakukan secara online melalui website resmi. Setiap tim wajib mengisi data dengan lengkap dan benar.',
    },
    {
      section: 'Pertandingan',
      content:
        'Pertandingan akan dilakukan sesuai jadwal yang telah ditetapkan. Peserta wajib hadir minimal 15 menit sebelum pertandingan.',
    },
    {
      section: 'Diskualifikasi',
      content:
        'Pelanggaran terhadap peraturan dapat menyebabkan diskualifikasi tim atau pemain dari turnamen.',
    },
  ]

  const display = rules.length > 0 ? rules : fallbackRules

  return (
    <>
      <div className="mb-6 sm:mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-esi-red/10">
            <BookOpen size={22} weight="duotone" className="text-esi-red" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-stone-900 dark:text-zinc-100">Peraturan Event</h1>
            <p className="text-sm text-stone-500 dark:text-zinc-400">Aturan resmi {event.name}</p>
          </div>
        </div>
      </div>

      {display.length === 0 ? (
        <EmptyState
          icon={Scales}
          title="Belum ada peraturan"
          description="Peraturan untuk event ini belum dipublikasikan."
        />
      ) : (
        <div className="space-y-2">
          {display.map((r, idx) => (
            <div
              key={idx}
              className="rounded-xl border border-stone-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 overflow-hidden"
            >
              <button
                onClick={() => setOpenIdx(openIdx === idx ? null : idx)}
                className="w-full flex items-center justify-between gap-4 px-4 py-3.5 text-left hover:bg-stone-50 dark:hover:bg-zinc-800/50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <Scales size={18} style={{ color: event.primary_color }} />
                  <span className="font-bold text-stone-800 dark:text-zinc-100">
                    {r.section}
                  </span>
                </div>
                <CaretDown
                  size={14}
                  weight="bold"
                  className={`text-stone-400 transition-transform ${openIdx === idx ? 'rotate-180' : ''}`}
                />
              </button>
              {openIdx === idx && (
                <div className="px-4 pb-4 pt-1 text-sm text-stone-600 dark:text-zinc-400 whitespace-pre-line border-t border-stone-100 dark:border-zinc-800">
                  {r.content}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </>
  )
}
