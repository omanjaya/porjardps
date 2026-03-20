'use client'

import { useRef, useEffect, useState } from 'react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import {
  Trophy,
  Sword,
  TreeStructure,
  CalendarBlank,
  Lightning,
  ArrowRight,
  ShieldStar,
  Crosshair,
  Users,
  MapPin,
  Phone,
  Globe,
  Buildings,
  EnvelopeSimple,
  InstagramLogo,
  Target,
  SoccerBall,
  ArrowDown,
  Clock,
  CalendarCheck,
  Warning,
  X,
} from '@phosphor-icons/react'
import Image from 'next/image'
import { api } from '@/lib/api'
import { Navbar } from '@/components/shared/Navbar'
import { HeroOrnamentLayer, CornerMarks, RedDivider, SectionOrnament, PosterLabel } from '@/components/landing/PorjarOrnaments'
import type { EventSettings } from '@/types'

gsap.registerPlugin(ScrollTrigger)

// ─── Colors from poster ───
const RED = 'var(--primary)'
const BG = 'var(--background)'

const games = [
  { slug: 'hok', name: 'Honor of Kings', icon: Sword, color: '#d97706', bg: '/images/games/hok-bg.webp', logo: '/images/games/hok-logo.webp' },
  { slug: 'ml', name: 'Mobile Legends', icon: ShieldStar, color: '#2563eb', bg: '/images/games/ml-bg.webp', logo: '/images/games/ml-logo.webp' },
  { slug: 'ff', name: 'Free Fire', icon: Crosshair, color: '#ea580c', bg: '/images/games/ff-bg.webp', logo: '/images/games/ff-logo.webp' },
  { slug: 'pubgm', name: 'PUBG Mobile', icon: Target, color: '#ca8a04', bg: '/images/games/pubgm-bg.webp', logo: '/images/games/pubgm-logo.webp' },
  { slug: 'efootball', name: 'eFootball', icon: SoccerBall, color: '#16a34a', bg: '/images/games/efootball-bg.webp', logo: '/images/games/efootball-logo.webp' },
]

const schedule = [
  { level: 'SD', dates: '26 - 27 Maret 2026', color: 'bg-amber-500' },
  { level: 'SMP', dates: '26 - 28 Maret 2026', color: 'bg-blue-500' },
  { level: 'SMA', dates: '29 - 31 Maret 2026', color: 'bg-red-600' },
]

// ─── Countdown Timer ───
interface CountdownValue {
  days: number
  hours: number
  minutes: number
  seconds: number
}

function useCountdown(targetDate: string | null | undefined): CountdownValue | null {
  const [timeLeft, setTimeLeft] = useState<CountdownValue | null>(null)

  useEffect(() => {
    if (!targetDate) return

    function calc() {
      const target = new Date(targetDate!).getTime()
      const now = Date.now()
      const diff = target - now
      if (diff <= 0) {
        setTimeLeft(null)
        return
      }
      setTimeLeft({
        days: Math.floor(diff / (1000 * 60 * 60 * 24)),
        hours: Math.floor((diff / (1000 * 60 * 60)) % 24),
        minutes: Math.floor((diff / (1000 * 60)) % 60),
        seconds: Math.floor((diff / 1000) % 60),
      })
    }

    calc()
    const id = setInterval(calc, 1000)
    return () => clearInterval(id)
  }, [targetDate])

  return timeLeft
}

function CountdownUnit({ value, label, className = '' }: { value: number; label: string; className?: string }) {
  return (
    <div className={`countdown-unit flex flex-col items-center gap-1.5 ${className}`}>
      <div
        className="flex h-14 w-14 items-center justify-center rounded-xl sm:h-16 sm:w-16"
        style={{
          background: 'rgba(0,0,0,0.2)',
          border: '1px solid rgba(255,255,255,0.2)',
          boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.1)',
        }}
      >
        <span className="text-2xl font-black tabular-nums text-white sm:text-3xl">{String(value).padStart(2, '0')}</span>
      </div>
      <span className="text-[9px] font-bold uppercase tracking-widest text-white/60">{label}</span>
    </div>
  )
}

function AnimatedCounter({ end, suffix, triggered }: { end: number; suffix: string; triggered: boolean }) {
  const [count, setCount] = useState(0)
  useEffect(() => {
    if (!triggered) return
    const obj = { val: 0 }
    gsap.to(obj, { val: end, duration: 2, ease: 'power2.out', onUpdate: () => setCount(Math.round(obj.val)) })
  }, [triggered, end])
  return <span className="tabular-nums">{count.toLocaleString('id-ID')}{suffix}</span>
}

export default function LandingPage() {
  const containerRef = useRef<HTMLDivElement>(null)
  const heroRef = useRef<HTMLDivElement>(null)
  const statsRef = useRef<HTMLDivElement>(null)
  const gamesRef = useRef<HTMLDivElement>(null)
  const infoRef = useRef<HTMLDivElement>(null)
  const ctaRef = useRef<HTMLDivElement>(null)
  const [statsTriggered, setStatsTriggered] = useState(false)
  const [realStats, setRealStats] = useState<{ total_games: number; total_schools: number; total_players: number; competition_days: number } | null>(null)
  const [settings, setSettings] = useState<EventSettings | null>(null)
  const [announcementDismissed, setAnnouncementDismissed] = useState(false)

  useEffect(() => {
    const ctx = gsap.context(() => {
      // Hero entrance
      const tl = gsap.timeline({ defaults: { ease: 'power3.out' } })
      tl.fromTo('.hero-badge', { y: 20, opacity: 0 }, { y: 0, opacity: 1, duration: 0.6, delay: 0.3 })
        .fromTo('.hero-title', { y: 60, opacity: 0 }, { y: 0, opacity: 1, duration: 0.8 }, '-=0.3')
        .fromTo('.hero-subtitle', { y: 40, opacity: 0 }, { y: 0, opacity: 1, duration: 0.7 }, '-=0.4')
        .fromTo('.hero-cta', { y: 30, opacity: 0 }, { y: 0, opacity: 1, duration: 0.6 }, '-=0.3')

      // Stats counter
      ScrollTrigger.create({ trigger: statsRef.current, start: 'top 80%', onEnter: () => setStatsTriggered(true), once: true })
      gsap.fromTo('.stat-card', { y: 50, opacity: 0 }, { y: 0, opacity: 1, duration: 0.6, stagger: 0.1, scrollTrigger: { trigger: statsRef.current, start: 'top 80%' } })

      // Game cards
      gsap.fromTo('.game-card', { y: 80, opacity: 0, rotate: 2 }, { y: 0, opacity: 1, rotate: 0, duration: 0.7, stagger: 0.1, ease: 'back.out(1.4)', scrollTrigger: { trigger: gamesRef.current, start: 'top 80%' } })

      // Game parallax backgrounds
      document.querySelectorAll('.game-parallax-section').forEach((section) => {
        const bg = section.querySelector('.game-parallax-bg') as HTMLElement
        const content = section.querySelector('.game-parallax-content') as HTMLElement
        if (bg) gsap.fromTo(bg, { y: -60 }, { y: 60, ease: 'none', scrollTrigger: { trigger: section, start: 'top bottom', end: 'bottom top', scrub: 1 } })
        if (content) gsap.fromTo(content, { y: 50, opacity: 0 }, { y: 0, opacity: 1, duration: 0.8, scrollTrigger: { trigger: section, start: 'top 65%', toggleActions: 'play none none reverse' } })
      })

      // Info section
      gsap.fromTo('.info-card', { y: 60, opacity: 0 }, { y: 0, opacity: 1, duration: 0.7, stagger: 0.15, scrollTrigger: { trigger: infoRef.current, start: 'top 80%' } })

      // CTA
      gsap.fromTo(ctaRef.current, { y: 60, opacity: 0, scale: 0.98 }, { y: 0, opacity: 1, scale: 1, duration: 0.8, scrollTrigger: { trigger: ctaRef.current, start: 'top 85%' } })

      // Footer
      gsap.fromTo('.footer-col', { y: 30, opacity: 0 }, { y: 0, opacity: 1, duration: 0.5, stagger: 0.1, scrollTrigger: { trigger: '.footer-section', start: 'top 90%' } })
    }, containerRef)
    return () => ctx.revert()
  }, [])

  useEffect(() => {
    Promise.all([
      api.get<{ total_games: number; total_schools: number; total_players: number; competition_days: number }>('/stats').catch(() => null),
      api.get<EventSettings>('/event-settings').catch(() => null),
    ]).then(([stats, evSettings]) => {
      if (stats) setRealStats(stats)
      if (evSettings) setSettings(evSettings)
    })
  }, [])

  const instagramHref = settings?.instagram_url ?? 'https://instagram.com/esi.denpasar'
  const registrationOpen = settings?.registration_open ?? true
  const venue = settings?.venue ?? 'Gedung Graha Yowana Suci'
  const city = settings?.city ?? 'Kota Denpasar, Bali'

  // Countdown toward event start_date (fallback to hardcoded if no API data yet)
  const countdownTarget = settings?.start_date ?? '2026-03-26T08:00:00+08:00'
  const countdownAnimatedRef = useRef(false)
  const countdown = useCountdown(countdownTarget)

  // Fire countdown entrance once, after the element is in the DOM
  useEffect(() => {
    if (!countdown || countdownAnimatedRef.current) return
    countdownAnimatedRef.current = true

    const tl = gsap.timeline({ defaults: { ease: 'power3.out' } })
    tl.fromTo('.hero-countdown', { y: 28, opacity: 0 }, { y: 0, opacity: 1, duration: 0.6 })
      .fromTo('.countdown-unit', { scale: 0.7, opacity: 0 }, { scale: 1, opacity: 1, duration: 0.45, stagger: 0.09, ease: 'back.out(2)' }, '-=0.35')

    // Seconds: continuous pulse after entrance
    gsap.to('.countdown-seconds', {
      scale: 1.07, duration: 0.5, repeat: -1, yoyo: true, ease: 'power1.inOut', delay: 0.8,
    })
  }, [countdown])

  return (
    <div ref={containerRef} className="min-h-[100dvh] overflow-x-hidden" style={{ background: BG }}>

      {/* ═══════════ ANNOUNCEMENT BANNER ═══════════ */}
      {settings?.announcement_active && settings.announcement && !announcementDismissed && (
        <div className="relative z-50 flex items-center justify-center gap-2 px-10 py-2.5 text-xs font-semibold text-white" style={{ background: RED }}>
          <Warning size={14} weight="fill" />
          <span>{settings.announcement}</span>
          <button
            onClick={() => setAnnouncementDismissed(true)}
            className="absolute right-3 top-1/2 -translate-y-1/2 rounded p-0.5 opacity-70 hover:opacity-100"
            aria-label="Tutup"
          >
            <X size={14} weight="bold" />
          </button>
        </div>
      )}

      {/* ═══════════ NAVBAR ═══════════ */}
      <Navbar position="fixed" />

      {/* ═══════════ HERO ═══════════ */}
      <section ref={heroRef} className="relative flex min-h-[85vh] flex-col items-center justify-center overflow-hidden px-5 pt-16">
        <HeroOrnamentLayer />

        <div className="relative z-10 mx-auto max-w-4xl text-center">
          {/* ESI Badge */}
          <div className="hero-badge mt-4 mb-6 inline-flex items-center gap-2 rounded-full border border-red-200 bg-white px-4 py-2 shadow-sm">
            <Buildings size={16} weight="duotone" style={{ color: RED }} />
            <span className="text-xs font-semibold text-stone-600">ESI KOTA DENPASAR</span>
          </div>

          {/* Title — poster style */}
          <div className="hero-title">
            <h1 className="text-5xl font-black tracking-tight sm:text-7xl md:text-8xl" style={{ color: 'var(--foreground)' }}>
              PORJAR
            </h1>
            <div className="mx-auto mt-2 inline-block -skew-x-3 px-6 py-1.5" style={{ background: RED }}>
              <span className="inline-block skew-x-3 text-3xl font-black tracking-wide text-white sm:text-5xl">
                ESPORT
              </span>
            </div>
            <p className="mt-4 text-lg font-semibold tracking-wider text-stone-500 sm:text-xl">
              KOTA DENPASAR 2026
            </p>
          </div>

          <p className="hero-subtitle mx-auto mt-6 max-w-md text-base text-stone-500">
            Pekan Olahraga Pelajar — Ajang kompetisi esport resmi antar pelajar SD, SMP, dan SMA se-Kota Denpasar
          </p>

          <div className="hero-cta mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
            {registrationOpen ? (
              <a href="/register" className="group inline-flex items-center gap-2 rounded-xl px-7 py-3.5 font-bold text-white shadow-lg transition-all hover:shadow-xl hover:brightness-110" style={{ background: RED, boxShadow: `0 8px 24px ${RED}30` }}>
                Daftar Sekarang
                <ArrowRight size={18} weight="bold" className="transition-transform group-hover:translate-x-1" />
              </a>
            ) : (
              <span className="inline-flex items-center gap-2 rounded-xl border border-stone-300 bg-stone-100 px-7 py-3.5 font-bold text-stone-400 cursor-not-allowed select-none">
                Pendaftaran Ditutup
              </span>
            )}
            <a href="/games" className="inline-flex items-center gap-2 rounded-xl border border-stone-300 bg-white px-7 py-3.5 font-bold text-stone-600 transition hover:border-stone-400 hover:text-stone-800 hover:shadow-md">
              <TreeStructure size={18} weight="duotone" />
              Lihat Bracket
            </a>
          </div>

          {/* Countdown timer */}
          {countdown && (
            <div className="hero-countdown mt-10 flex flex-col items-center gap-3 opacity-0">
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-stone-400">Pertandingan dimulai dalam</p>
              <div
                className="relative inline-flex items-center gap-3 rounded-2xl px-6 py-4"
                style={{
                  background: '#C41E2A',
                  boxShadow: '0 8px 40px rgba(196,30,42,0.35)',
                }}
              >
                <CountdownUnit value={countdown.days} label="Hari" />
                <span className="mb-5 text-xl font-thin text-white/40">:</span>
                <CountdownUnit value={countdown.hours} label="Jam" />
                <span className="mb-5 text-xl font-thin text-white/40">:</span>
                <CountdownUnit value={countdown.minutes} label="Menit" />
                <span className="mb-5 text-xl font-thin text-white/40">:</span>
                <CountdownUnit value={countdown.seconds} label="Detik" className="countdown-seconds" />
              </div>
            </div>
          )}
        </div>

        <div className="scroll-hint relative z-10 mt-16 text-stone-300">
          <ArrowDown size={18} className="animate-bounce" />
        </div>
      </section>

      {/* ═══════════ STATS ═══════════ */}
      <section ref={statsRef} className="mx-auto -mt-4 max-w-5xl px-5">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            { label: 'Cabang Game', end: realStats?.total_games ?? 5, suffix: '', icon: Lightning },
            { label: 'Sekolah', end: realStats?.total_schools ?? 33, suffix: '+', icon: Buildings },
            { label: 'Peserta', end: realStats?.total_players ?? 5000, suffix: '+', icon: Users },
            { label: 'Hari Kompetisi', end: realStats?.competition_days ?? 7, suffix: '', icon: CalendarBlank },
          ].map((s) => (
            <div key={s.label} className="stat-card relative flex flex-col items-center gap-1 rounded-xl border border-stone-200/80 bg-white p-5 shadow-sm">
              <CornerMarks size={14} thickness={1.5} color="#C41E2A" />
              <s.icon size={20} weight="duotone" style={{ color: RED }} />
              <span className="mt-1 text-2xl font-black text-stone-900">
                <AnimatedCounter end={s.end} suffix={s.suffix} triggered={statsTriggered} />
              </span>
              <span className="text-[10px] font-semibold uppercase tracking-widest text-stone-400">{s.label}</span>
            </div>
          ))}
        </div>
      </section>

      <RedDivider className="mx-auto max-w-5xl px-5 py-4" />

      {/* ═══════════ GAME CARDS ═══════════ */}
      <section ref={gamesRef} className="relative mx-auto max-w-7xl overflow-hidden px-5 py-20">
        <SectionOrnament side="right" />
        <div className="mb-10 text-center">
          <PosterLabel className="mb-3">5 Cabang Lomba</PosterLabel>
          <h2 className="mt-2 text-3xl font-black text-stone-900 sm:text-4xl">Cabang E-Sport</h2>
        </div>

        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
          {games.map((game) => (
            <a key={game.slug} href={`/games/${game.slug}`} className="game-card group relative overflow-hidden rounded-xl bg-white shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-xl">
              {/* Red top frame accent (like poster cards) */}
              <div className="h-1 w-full" style={{ background: RED }} />

              {/* Game image */}
              <div className="relative h-36 overflow-hidden">
                <div className="absolute inset-0 bg-cover bg-center transition-transform duration-500 group-hover:scale-110" style={{ backgroundImage: `url(${game.bg})` }} />
                <div className="absolute inset-0 bg-gradient-to-t from-white via-transparent to-transparent" />
              </div>

              {/* Info */}
              <div className="flex flex-col items-center p-4 pt-2">
                <Image src={game.logo} alt={game.name} width={40} height={40} className="mb-2 h-10 w-10 rounded-lg object-contain" />
                <h3 className="text-center text-xs font-bold text-stone-800 uppercase tracking-wide">{game.name}</h3>
              </div>
            </a>
          ))}
        </div>
      </section>

      {/* ═══════════ GAME PARALLAX SHOWCASE ═══════════ */}
      <section>
        {games.map((game, i) => (
          <div key={game.slug} className="game-parallax-section relative overflow-hidden" style={{ height: '70vh', minHeight: '450px' }}>
            <div className="game-parallax-bg absolute inset-0 scale-110" style={{ backgroundImage: `url(${game.bg})`, backgroundSize: 'cover', backgroundPosition: 'center' }} />

            {/* Dark scrim base — makes image darker so text is readable */}
            <div className="absolute inset-0 bg-black/50" />

            {/* Strong gradient from text side */}
            <div className={`absolute inset-0 ${i % 2 === 0 ? 'bg-gradient-to-r from-black/70 via-black/40 to-transparent' : 'bg-gradient-to-l from-black/70 via-black/40 to-transparent'}`} />


            <div className={`relative z-10 flex h-full items-center ${i % 2 === 0 ? '' : 'justify-end'}`}>
              <div className={`game-parallax-content mx-auto w-full max-w-7xl px-5 ${i % 2 === 0 ? '' : 'text-right'}`}>
                <div className={`max-w-md ${i % 2 === 0 ? '' : 'ml-auto'}`}>
                  {/* Red accent line */}
                  <div className={`mb-4 h-1 w-12 rounded-full ${i % 2 === 0 ? '' : 'ml-auto'}`} style={{ background: RED }} />

                  {/* Game logo badge */}
                  <div className={`mb-3 inline-flex items-center gap-2.5 rounded-full border border-white/20 bg-white/10 px-3 py-1.5 backdrop-blur-sm ${i % 2 === 0 ? '' : 'flex-row-reverse'}`}>
                    <img src={game.logo} alt={game.name} className="h-5 w-5 rounded object-contain" />
                    <span className="text-[11px] font-bold uppercase tracking-wider text-white/80">
                      {game.slug === 'hok' || game.slug === 'ml' ? 'MOBA' : game.slug === 'efootball' ? 'Sports' : 'Battle Royale'}
                    </span>
                  </div>

                  <h3 className="text-4xl font-black text-white sm:text-5xl uppercase drop-shadow-[0_2px_10px_rgba(0,0,0,0.3)]">
                    {game.name}
                  </h3>

                  <a href={`/games/${game.slug}`} className="group mt-6 inline-flex items-center gap-2 rounded-lg px-5 py-2.5 text-sm font-bold text-white transition-all hover:brightness-110 hover:shadow-lg" style={{ background: RED, boxShadow: `0 4px 16px ${RED}40` }}>
                    Lihat Detail
                    <ArrowRight size={14} weight="bold" className="transition-transform group-hover:translate-x-0.5" />
                  </a>
                </div>
              </div>
            </div>
          </div>
        ))}
      </section>

      <RedDivider className="mx-auto max-w-5xl px-5 py-4" />

      {/* ═══════════ EVENT INFO (from poster) ═══════════ */}
      <section ref={infoRef} className="relative mx-auto max-w-6xl overflow-hidden px-5 py-20">
        <SectionOrnament side="left" />
        <div className="mb-10 text-center">
          <PosterLabel className="mb-3">Informasi Event</PosterLabel>
          <h2 className="mt-2 text-3xl font-black text-stone-900">Detail Pertandingan</h2>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          {/* Jadwal */}
          <div className="info-card relative rounded-xl border border-stone-200/80 bg-white p-6 shadow-sm">
            <CornerMarks size={16} thickness={1.5} color="#C41E2A" />
            <div className="mb-4 flex items-center gap-2">
              <CalendarCheck size={20} weight="duotone" style={{ color: RED }} />
              <h3 className="text-sm font-bold uppercase tracking-wider text-stone-700">Tanggal Pertandingan</h3>
            </div>
            <div className="space-y-2.5">
              {schedule.map((s) => (
                <div key={s.level} className="flex items-center gap-3">
                  <span className={`flex h-8 w-12 items-center justify-center rounded-md text-xs font-black text-white ${s.color}`}>{s.level}</span>
                  <span className="text-sm font-medium text-stone-600">{s.dates}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Lokasi */}
          <div className="info-card relative rounded-xl border border-stone-200/80 bg-white p-6 shadow-sm">
            <CornerMarks size={16} thickness={1.5} color="#C41E2A" />
            <div className="mb-4 flex items-center gap-2">
              <MapPin size={20} weight="duotone" style={{ color: RED }} />
              <h3 className="text-sm font-bold uppercase tracking-wider text-stone-700">Lokasi Pertandingan</h3>
            </div>
            <p className="text-lg font-bold text-stone-800">{venue}</p>
            <p className="mt-1 text-sm text-stone-500">{city}</p>
          </div>

          {/* Timeline */}
          <div className="info-card relative rounded-xl border border-stone-200/80 bg-white p-6 shadow-sm">
            <CornerMarks size={16} thickness={1.5} color="#C41E2A" />
            <div className="mb-4 flex items-center gap-2">
              <Clock size={20} weight="duotone" style={{ color: RED }} />
              <h3 className="text-sm font-bold uppercase tracking-wider text-stone-700">Timeline</h3>
            </div>
            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <div className="mt-1 h-2.5 w-2.5 rounded-full border-2 shrink-0" style={{ borderColor: RED }} />
                <div>
                  <p className="text-sm font-bold text-stone-800">Pendaftaran</p>
                  <p className="text-xs text-stone-500">Sampai 10 Maret 2026</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="mt-1 h-2.5 w-2.5 rounded-full border-2 shrink-0" style={{ borderColor: RED }} />
                <div>
                  <p className="text-sm font-bold text-stone-800">Technical Meeting</p>
                  <p className="text-xs text-stone-500">14 Maret 2026</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: RED }} />
                <div>
                  <p className="text-sm font-bold text-stone-800">Pertandingan</p>
                  <p className="text-xs text-stone-500">26 - 31 Maret 2026</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════ CTA ═══════════ */}
      <section className="mx-auto max-w-5xl px-5 pb-20">
        <div ref={ctaRef} className="relative overflow-hidden rounded-2xl px-8 py-14 text-center text-white" style={{ background: RED }}>
          <CornerMarks size={28} thickness={2} color="rgba(255,255,255,0.4)" />
          <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg width=\'40\' height=\'40\' viewBox=\'0 0 40 40\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cpath d=\'M0 40L40 0H20L0 20M40 40V20L20 40\' fill=\'%23ffffff\' fill-opacity=\'0.3\'/%3E%3C/svg%3E")' }} />
          <div className="relative z-10">
            <Trophy size={40} weight="fill" className="mx-auto mb-4 text-white/90" />
            <h2 className="text-3xl font-black sm:text-4xl">Siap Bertanding?</h2>
            <p className="mx-auto mt-3 max-w-md text-white/80">
              Daftarkan timmu sekarang. Tunjukkan skill terbaik sekolahmu di PORJAR Esport 2026.
            </p>
            <a href="/register" className="group mt-8 inline-flex items-center gap-2 rounded-xl bg-white px-8 py-3.5 font-bold transition hover:shadow-lg" style={{ color: RED }}>
              Mulai Pendaftaran
              <ArrowRight size={18} weight="bold" className="transition-transform group-hover:translate-x-1" />
            </a>
          </div>
        </div>
      </section>

      {/* ═══════════ CONTACT (from poster) ═══════════ */}
      <section className="mx-auto max-w-5xl px-5 pb-16">
        <div className="rounded-xl border border-stone-200/80 bg-white p-6 shadow-sm">
          <div className="mb-4 flex items-center gap-2">
            <Phone size={18} weight="duotone" style={{ color: RED }} />
            <h3 className="text-sm font-bold uppercase tracking-wider text-stone-700">Contact Person</h3>
          </div>
          <div className="flex flex-wrap gap-6 text-sm text-stone-600">
            <div><span className="font-bold text-stone-800">Bagus Eka</span> · +62 878-6156-9479</div>
            <div><span className="font-bold text-stone-800">Arik</span> · +62 877-6038-3825</div>
            <div><span className="font-bold text-stone-800">Geni</span> · +62 813-3960-0701</div>
          </div>
        </div>
      </section>

      {/* ═══════════ FOOTER ═══════════ */}
      <footer className="footer-section border-t border-stone-200 bg-white">
        <div className="mx-auto max-w-7xl px-5 py-12">
          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            <div className="footer-col">
              <div className="mb-3 flex items-center gap-2">
                <Image src="/images/logo/kota-denpasar.webp" alt="Kota Denpasar" width={32} height={32} className="h-8 w-8 object-contain" />
                <Image src="/images/logo/esi-denpasar.webp" alt="ESI Denpasar" width={32} height={32} className="h-8 w-8 object-contain" />
                <span className="ml-1 font-bold text-stone-900">PORJAR</span>
              </div>
              <p className="text-sm text-stone-500">Pekan Olahraga Pelajar Kota Denpasar 2026. Diselenggarakan oleh ESI Kota Denpasar.</p>
            </div>
            <div className="footer-col">
              <h4 className="mb-3 text-[11px] font-bold uppercase tracking-[0.15em] text-stone-400">Navigasi</h4>
              <div className="flex flex-col gap-2 text-sm text-stone-500">
                <a href="/games" className="transition hover:text-porjar-red">Cabang Game</a>
                <a href="/schedule" className="transition hover:text-porjar-red">Jadwal</a>
                <a href="/teams" className="transition hover:text-porjar-red">Tim Peserta</a>
                <a href="/rules" className="transition hover:text-porjar-red">Peraturan</a>
                <a href="/achievements" className="transition hover:text-porjar-red">Achievement</a>
              </div>
            </div>
            <div className="footer-col">
              <h4 className="mb-3 text-[11px] font-bold uppercase tracking-[0.15em] text-stone-400">Penyelenggara</h4>
              <p className="text-sm font-semibold text-stone-700">ESI Kota Denpasar</p>
              <p className="text-sm text-stone-500">Dinas Pemuda dan Olahraga</p>
              <p className="text-sm text-stone-500">Kota Denpasar, Bali</p>
            </div>
            <div className="footer-col">
              <h4 className="mb-3 text-[11px] font-bold uppercase tracking-[0.15em] text-stone-400">Ikuti Kami</h4>
              <div className="flex gap-2">
                <a href={instagramHref} target="_blank" rel="noopener noreferrer" className="flex h-9 w-9 items-center justify-center rounded-lg border border-stone-200 text-stone-400 transition hover:border-red-200 hover:text-porjar-red">
                  <InstagramLogo size={16} />
                </a>
                {settings?.contact_email && (
                  <a href={`mailto:${settings.contact_email}`} className="flex h-9 w-9 items-center justify-center rounded-lg border border-stone-200 text-stone-400 transition hover:border-red-200 hover:text-porjar-red">
                    <EnvelopeSimple size={16} />
                  </a>
                )}
                <a href="#" className="flex h-9 w-9 items-center justify-center rounded-lg border border-stone-200 text-stone-400 transition hover:border-red-200 hover:text-porjar-red">
                  <Globe size={16} />
                </a>
              </div>
            </div>
          </div>
          <div className="mt-10 border-t border-stone-200 pt-6 text-center text-[11px] text-stone-400">
            <p>&copy; 2026 ESI Kota Denpasar &middot; PORJAR Esport Kota Denpasar</p>
            <p className="mt-1">
              Dibuat oleh{' '}
              <a href="https://instagram.com/omanjayaaa" target="_blank" rel="noopener noreferrer" className="text-porjar-red hover:underline">
                @omanjayaaa
              </a>
            </p>
          </div>
        </div>
      </footer>
    </div>
  )
}
