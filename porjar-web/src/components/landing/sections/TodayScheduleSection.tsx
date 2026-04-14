'use client'

import Link from 'next/link'
import { CalendarBlank, ArrowRight, Lightning, Clock } from '@phosphor-icons/react'
import type { Schedule } from '@/types'
import { RED } from '../constants'

interface Props {
  todaySchedules: Schedule[]
}

export function TodayScheduleSection({ todaySchedules }: Props) {
  return (
    <section className="today-schedule-section mx-auto max-w-7xl px-5 sm:px-6 lg:px-8 py-12 sm:py-16 lg:py-20">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-stone-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 py-1 mb-2">
            <CalendarBlank size={12} weight="duotone" style={{ color: RED }} />
            <span className="text-[10px] font-bold uppercase tracking-widest text-stone-600 dark:text-zinc-300">Jadwal</span>
          </div>
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-black text-stone-900 dark:text-zinc-100">Pertandingan Hari Ini</h2>
        </div>
        <Link href="/schedule" className="inline-flex items-center gap-1 text-sm font-semibold transition hover:gap-2" style={{ color: RED }}>
          Jadwal Lengkap <ArrowRight size={14} weight="bold" />
        </Link>
      </div>
      <div className="rounded-2xl border border-stone-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 overflow-hidden">
        {todaySchedules.length === 0 ? (
          <div className="schedule-item anim-list-item p-8 text-center">
            <Clock size={28} weight="duotone" className="mx-auto text-stone-300 dark:text-zinc-600" />
            <p className="mt-2 text-sm font-semibold text-stone-600 dark:text-zinc-400">Tidak ada pertandingan hari ini</p>
            <p className="text-xs text-stone-400 dark:text-zinc-500 mt-1">Cek jadwal lengkap untuk melihat pertandingan mendatang</p>
          </div>
        ) : (
          <ul className="divide-y divide-stone-200 dark:divide-zinc-800">
            {todaySchedules.map(s => {
              const time = new Date(s.scheduled_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })
              return (
                <li key={s.id} className="schedule-item anim-list-item flex items-center gap-3 sm:gap-4 p-3 sm:p-4 transition hover:bg-stone-50 dark:hover:bg-zinc-800/50">
                  <div className="flex flex-col items-center w-12 sm:w-14 flex-shrink-0">
                    <Clock size={14} className="text-stone-400 dark:text-zinc-500" />
                    <span className="mt-0.5 text-xs font-bold text-stone-700 dark:text-zinc-300">{time}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-stone-900 dark:text-zinc-100 truncate">
                      {s.team_a?.name || 'TBD'} <span className="text-stone-400">vs</span> {s.team_b?.name || 'TBD'}
                    </p>
                    <p className="text-xs text-stone-500 dark:text-zinc-400 truncate">
                      {s.game?.name || s.title}{s.tournament?.name ? ` • ${s.tournament.name}` : ''}
                    </p>
                  </div>
                  {s.status === 'ongoing' && (
                    <span className="hidden sm:inline-flex items-center gap-1 rounded-full bg-green-50 dark:bg-green-950 px-2 py-0.5 text-[10px] font-bold uppercase text-green-700 dark:text-green-400">
                      <Lightning size={9} weight="fill" />Live
                    </span>
                  )}
                </li>
              )
            })}
          </ul>
        )}
      </div>
    </section>
  )
}
