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
      {/* Animated gradient background */}
      <div className="absolute inset-0 bg-gradient-to-br from-stone-50 via-red-50/30 to-stone-100 dark:from-zinc-950 dark:via-red-950/20 dark:to-zinc-900" />
      <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: 'radial-gradient(circle at 25% 50%, #C41E2A 0%, transparent 50%), radial-gradient(circle at 75% 50%, #1e3a8a 0%, transparent 50%)' }} />

      {/* Decorative floating circles */}
      <div className="absolute top-1/4 left-10 h-20 w-20 rounded-full bg-esi-red/5 blur-2xl animate-pulse" />
      <div className="absolute bottom-1/3 right-10 h-32 w-32 rounded-full bg-blue-500/5 blur-3xl" style={{ animation: 'float 6s ease-in-out infinite' }} />

      <HeroOrnamentLayer />

      <div className="relative z-10 mx-auto w-full max-w-4xl text-center">
        <div className="hero-logos mb-6 flex items-center justify-center gap-4" style={{ willChange: 'transform, opacity' }}>
          <Image src="/images/logo/kota-denpasar.webp" alt="Kota Denpasar" width={64} height={64} className="h-14 w-14 sm:h-16 sm:w-16 object-contain" style={{ aspectRatio: '1/1' }} priority />
          <Image src="/images/logo/esi-denpasar.webp" alt="ESI Denpasar" width={64} height={64} className="h-14 w-14 sm:h-16 sm:w-16 object-contain" style={{ aspectRatio: '1/1' }} priority />
        </div>

        <h1 className="hero-title text-4xl sm:text-5xl md:text-6xl font-black tracking-tight" style={{ willChange: 'transform, opacity' }}>
          <span className="sr-only">ESI Kota Denpasar</span>
          <span aria-hidden="true" className="bg-gradient-to-r from-stone-900 via-esi-red to-stone-800 dark:from-white dark:via-red-400 dark:to-zinc-200 bg-clip-text text-transparent">
            ESI KOTA
          </span>
          <div className="mt-1 inline-block -skew-x-3 px-4 sm:px-6 py-1" style={{ background: RED }}>
            <span className="inline-block skew-x-3 text-3xl sm:text-4xl md:text-5xl font-black tracking-wide text-white">
              DENPASAR
            </span>
          </div>
        </h1>

        <p className="mx-auto mt-6 max-w-xl text-sm text-stone-500 dark:text-zinc-400 sm:text-base lg:text-lg">
          Esports Indonesia Kota Denpasar — Wadah resmi pembinaan dan kompetisi esport pelajar se-Kota Denpasar. Dari kompetisi sekolah hingga prestasi nasional.
        </p>

        {activeEvent && (
          <div className="event-hero-badge mx-auto mt-6 inline-flex max-w-full flex-wrap items-center justify-center gap-2 rounded-full border-2 border-esi-red/30 bg-esi-red/10 dark:bg-esi-red/20 px-5 py-2 text-sm font-bold text-esi-red">
            <span className="h-2.5 w-2.5 rounded-full bg-esi-red animate-pulse" />
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
                className="inline-flex min-h-[48px] sm:min-h-[52px] items-center justify-center gap-2 rounded-xl px-8 text-base font-bold text-white shadow-lg shadow-red-500/20 transition-all hover:shadow-xl hover:shadow-red-500/30 hover:brightness-110"
                style={{ background: RED }}
              >
                Masuk ke Event
                <ArrowRight size={18} weight="bold" />
              </Link>
              <Link
                href="/cara-bertanding"
                className="inline-flex min-h-[48px] sm:min-h-[52px] items-center justify-center gap-2 rounded-xl border-2 px-8 text-base font-bold transition-all hover:bg-red-50 dark:hover:bg-red-950/50"
                style={{ borderColor: RED, color: RED }}
              >
                Cara Bertanding
              </Link>
            </>
          ) : (
            <Link
              href="/cara-bertanding"
              className="inline-flex min-h-[48px] sm:min-h-[52px] items-center justify-center gap-2 rounded-xl px-8 text-base font-bold text-white shadow-lg shadow-red-500/20 transition-all hover:shadow-xl hover:shadow-red-500/30 hover:brightness-110"
              style={{ background: RED }}
            >
              Cara Bertanding
              <ArrowRight size={18} weight="bold" />
            </Link>
          )}
        </div>
      </div>
    </section>
  )
})
