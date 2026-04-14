'use client'

import { forwardRef } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { ArrowRight, Trophy, CalendarBlank } from '@phosphor-icons/react'
import { HeroOrnamentLayer } from '@/components/landing/EsiOrnaments'
import { RED } from '../constants'
import type { Event } from '@/types'

interface HeroSectionProps {
  activeEvent?: Event | null
}

function formatHeroDateRange(start?: string, end?: string): string {
  if (!start) return ''
  const s = new Date(start)
  const e = end ? new Date(end) : null
  if (!e) return s.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })
  const sameMonth = s.getMonth() === e.getMonth() && s.getFullYear() === e.getFullYear()
  if (sameMonth) {
    return `${s.getDate()}-${e.getDate()} ${e.toLocaleDateString('id-ID', { month: 'short', year: 'numeric' })}`
  }
  return `${s.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })} - ${e.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}`
}

export const HeroSection = forwardRef<HTMLDivElement, HeroSectionProps>(function HeroSection({ activeEvent = null }, ref) {
  return (
    <section ref={ref} className="relative flex min-h-[60vh] sm:min-h-[70vh] flex-col items-center justify-center overflow-hidden px-5 sm:px-6 lg:px-8 pt-20 pb-10 sm:pt-28 sm:pb-16">
      <HeroOrnamentLayer />

      <div className="relative z-10 mx-auto w-full max-w-4xl text-center">
        <div className="hero-logos mb-6 flex items-center justify-center gap-4" style={{ willChange: 'transform, opacity' }}>
          <Image src="/images/logo/kota-denpasar.webp" alt="Kota Denpasar" width={64} height={64} className="h-14 w-14 sm:h-16 sm:w-16 object-contain" style={{ aspectRatio: '1/1' }} priority />
          <Image src="/images/logo/esi-denpasar.webp" alt="ESI Denpasar" width={64} height={64} className="h-14 w-14 sm:h-16 sm:w-16 object-contain" style={{ aspectRatio: '1/1' }} priority />
        </div>

        <h1 className="hero-title" style={{ willChange: 'transform, opacity' }}>
          <span className="sr-only">ESI Kota Denpasar</span>
          <span aria-hidden="true" className="block text-3xl font-black tracking-tight sm:text-5xl md:text-6xl lg:text-7xl" style={{ color: 'var(--foreground)' }}>
            ESI KOTA
          </span>
          <span aria-hidden="true" className="mx-auto mt-2 inline-block -skew-x-3 px-4 py-1.5 sm:px-6" style={{ background: RED }}>
            <span className="inline-block skew-x-3 text-2xl font-black tracking-wide text-white sm:text-4xl md:text-5xl">
              DENPASAR
            </span>
          </span>
        </h1>

        <p className="hero-subtitle mx-auto mt-6 max-w-xl text-sm text-stone-500 dark:text-zinc-400 sm:text-base lg:text-lg">
          Esports Indonesia Kota Denpasar — Wadah resmi pembinaan dan kompetisi esport pelajar se-Kota Denpasar. Dari kompetisi sekolah hingga prestasi nasional.
        </p>

        {activeEvent && (
          <div className="event-hero-badge mx-auto mt-6 inline-flex max-w-full flex-wrap items-center justify-center gap-2 rounded-full border-2 px-4 py-2 text-xs font-bold shadow-sm sm:text-sm"
            style={{ borderColor: RED, background: 'rgba(196,30,42,0.08)', color: RED }}
          >
            <Trophy size={16} weight="fill" />
            <span>{activeEvent.name}</span>
            {activeEvent.start_date && (
              <>
                <span className="opacity-40">·</span>
                <CalendarBlank size={14} weight="bold" />
                <span>{formatHeroDateRange(activeEvent.start_date ?? undefined, activeEvent.end_date ?? undefined)}</span>
              </>
            )}
          </div>
        )}

        <div className="hero-cta mt-8 flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-3">
          {activeEvent ? (
            <>
              <Link
                href={`/events/${activeEvent.slug}`}
                className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-lg px-5 py-3 text-sm font-bold text-white shadow-sm transition hover:brightness-110"
                style={{ background: RED }}
              >
                Masuk ke Event
                <ArrowRight size={16} weight="bold" />
              </Link>
              <Link
                href="/cara-bertanding"
                className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-lg border-2 px-5 py-3 text-sm font-bold transition hover:bg-red-50 dark:hover:bg-red-950"
                style={{ borderColor: RED, color: RED }}
              >
                Cara Bertanding
              </Link>
            </>
          ) : (
            <Link
              href="/cara-bertanding"
              className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-lg px-5 py-3 text-sm font-bold text-white shadow-sm transition hover:brightness-110"
              style={{ background: RED }}
            >
              Cara Bertanding
              <ArrowRight size={16} weight="bold" />
            </Link>
          )}
        </div>
      </div>
    </section>
  )
})
