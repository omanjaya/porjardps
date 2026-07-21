'use client'

import { useEvent } from '@/contexts/EventContext'
import { JsonLd } from '@/components/shared/JsonLd'
import { useEffect, useState } from 'react'
import { api, resolveMediaUrl } from '@/lib/api'
import { useAuthStore } from '@/store/auth-store'
import { Trophy, CalendarBlank, MapPin, Users, ArrowRight, Lightning, Medal, ClipboardText, CheckCircle, MonitorPlay, Handshake, Images, Books } from '@phosphor-icons/react'
import Link from 'next/link'
import Image from 'next/image'
import type { SchoolStanding } from '@/types'

interface EventSection {
  id: string
  section_type: string
  sort_order: number
  enabled: boolean
  config: Record<string, unknown>
}

interface PrizeRow { rank: string; amount: string; description?: string }
interface SponsorRow { name: string; logo_url: string; website_url?: string; tier?: string }

function SectionBlock({ section, event }: { section: EventSection; event: ReturnType<typeof useEvent> }) {
  const cfg = section.config as Record<string, unknown>

  switch (section.section_type) {
    case 'about': {
      const title = (cfg.title as string) || 'Tentang Event'
      const desc = cfg.description as string
      const imgUrl = cfg.image_url as string
      if (!desc && !imgUrl) return null
      return (
        <div className="rounded-xl border border-stone-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 p-6 mb-6">
          <h2 className="text-lg font-bold text-stone-900 dark:text-zinc-100 mb-3">{title}</h2>
          <div className={imgUrl ? 'flex flex-col sm:flex-row gap-6' : ''}>
            {imgUrl && (
              <div className="shrink-0">
                <Image src={resolveMediaUrl(imgUrl) ?? imgUrl} alt={title} width={240} height={160} className="rounded-lg object-cover w-full sm:w-60 h-40" />
              </div>
            )}
            {desc && <p className="text-sm text-stone-600 dark:text-zinc-400 leading-relaxed whitespace-pre-line">{desc}</p>}
          </div>
        </div>
      )
    }

    case 'prizes': {
      const prizes = (cfg.prizes as PrizeRow[]) ?? []
      if (prizes.length === 0) return null
      return (
        <div className="rounded-xl border border-stone-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 overflow-hidden mb-6">
          <div className="px-4 py-3 border-b border-stone-100 dark:border-zinc-800 flex items-center gap-2">
            <Medal size={16} style={{ color: event.primary_color }} />
            <h2 className="text-sm font-bold text-stone-700 dark:text-zinc-300">Hadiah</h2>
          </div>
          <div className="divide-y divide-stone-100 dark:divide-zinc-800">
            {prizes.map((p, i) => (
              <div key={i} className="flex items-center gap-4 px-4 py-3">
                <span className="w-20 text-sm font-bold text-stone-700 dark:text-zinc-300">{p.rank}</span>
                <span className="flex-1 text-sm font-semibold" style={{ color: event.primary_color }}>{p.amount}</span>
                {p.description && <span className="text-xs text-stone-400 dark:text-zinc-500">{p.description}</span>}
              </div>
            ))}
          </div>
        </div>
      )
    }

    case 'sponsors': {
      const sponsors = (cfg.sponsors as SponsorRow[]) ?? []
      if (sponsors.length === 0) return null
      return (
        <div className="rounded-xl border border-stone-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 p-6 mb-6">
          <div className="flex items-center gap-2 mb-4">
            <Handshake size={16} style={{ color: event.primary_color }} />
            <h2 className="text-sm font-bold text-stone-700 dark:text-zinc-300">Sponsor</h2>
          </div>
          <div className="flex flex-wrap gap-4 items-center">
            {sponsors.map((s, i) => (
              s.website_url ? (
                <a key={i} href={s.website_url} target="_blank" rel="noopener noreferrer" title={s.name}>
                  {s.logo_url
                    ? <Image src={resolveMediaUrl(s.logo_url) ?? s.logo_url} alt={s.name} width={100} height={50} className="h-12 w-auto object-contain opacity-80 hover:opacity-100 transition-opacity" />
                    : <span className="text-sm font-semibold text-stone-600 dark:text-zinc-400">{s.name}</span>
                  }
                </a>
              ) : (
                <div key={i} title={s.name}>
                  {s.logo_url
                    ? <Image src={resolveMediaUrl(s.logo_url) ?? s.logo_url} alt={s.name} width={100} height={50} className="h-12 w-auto object-contain opacity-80" />
                    : <span className="text-sm font-semibold text-stone-600 dark:text-zinc-400">{s.name}</span>
                  }
                </div>
              )
            ))}
          </div>
        </div>
      )
    }

    case 'stream': {
      const streamUrl = cfg.stream_url as string
      if (!streamUrl) return null
      const isYoutube = streamUrl.includes('youtube.com') || streamUrl.includes('youtu.be')
      let embedUrl = streamUrl
      if (isYoutube) {
        const match = streamUrl.match(/(?:v=|youtu\.be\/)([^&?/]+)/)
        if (match) embedUrl = `https://www.youtube.com/embed/${match[1]}`
      }
      return (
        <div className="rounded-xl border border-stone-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 overflow-hidden mb-6">
          <div className="px-4 py-3 border-b border-stone-100 dark:border-zinc-800 flex items-center gap-2">
            <MonitorPlay size={16} style={{ color: event.primary_color }} />
            <h2 className="text-sm font-bold text-stone-700 dark:text-zinc-300">Live Stream</h2>
          </div>
          <div className="aspect-video">
            <iframe
              src={embedUrl}
              title="Live Stream"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              className="w-full h-full"
            />
          </div>
        </div>
      )
    }

    case 'gallery':
      return (
        <div className="rounded-xl border border-stone-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 p-4 mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Images size={16} style={{ color: event.primary_color }} />
              <h2 className="text-sm font-bold text-stone-700 dark:text-zinc-300">Galeri</h2>
            </div>
            <Link href={`/events/${event.slug}/gallery`} className="text-xs font-semibold" style={{ color: event.primary_color }}>
              Lihat Semua <ArrowRight size={12} className="inline" />
            </Link>
          </div>
        </div>
      )

    case 'rules':
      return (
        <div className="rounded-xl border border-stone-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 p-4 mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Books size={16} style={{ color: event.primary_color }} />
              <h2 className="text-sm font-bold text-stone-700 dark:text-zinc-300">Peraturan</h2>
            </div>
            <Link href={`/events/${event.slug}/rules`} className="text-xs font-semibold" style={{ color: event.primary_color }}>
              Baca Peraturan <ArrowRight size={12} className="inline" />
            </Link>
          </div>
        </div>
      )

    default:
      return null
  }
}

export default function EventLandingPage() {
  const event = useEvent()
  const { isAuthenticated, isLoading: authLoading } = useAuthStore()
  const [stats, setStats] = useState<{ total_games: number; total_schools: number; total_players: number } | null>(null)
  const [medals, setMedals] = useState<SchoolStanding[]>([])
  const [teamCount, setTeamCount] = useState<number | null>(null)
  const [sections, setSections] = useState<EventSection[]>([])

  useEffect(() => {
    api.get<{ total_games: number; total_schools: number; total_players: number }>(`/events/${event.id}/stats`).then(setStats).catch(() => {})
    api.get<SchoolStanding[]>(`/school-standings?event_id=${event.id}`).then(d => setMedals(Array.isArray(d) ? d.slice(0, 5) : [])).catch(() => {})
    api.get<EventSection[]>(`/events/${event.slug}/sections`)
      .then(d => setSections(Array.isArray(d) ? d.sort((a, b) => a.sort_order - b.sort_order) : []))
      .catch(() => {})
  }, [event.slug, event.id])

  useEffect(() => {
    if (!authLoading && isAuthenticated) {
      api.get<unknown[]>('/teams/my').then(d => setTeamCount(Array.isArray(d) ? d.length : 0)).catch(() => setTeamCount(0))
    } else if (!authLoading) {
      setTeamCount(0)
    }
  }, [isAuthenticated, authLoading])

  const isCompleted = event.status === 'completed' || event.status === 'archived'

  let ctaHref = '/register'
  let ctaLabel = 'Mulai Daftar (Buat Akun)'
  if (isAuthenticated) {
    if ((teamCount ?? 0) === 0) {
      ctaHref = '/dashboard/teams/create'
      ctaLabel = 'Buat Tim Dulu'
    } else {
      ctaHref = `/events/${event.slug}/register`
      ctaLabel = 'Registrasi Tim'
    }
  }

  const eventJsonLd: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'SportsEvent',
    name: event.name,
    description: event.description ?? undefined,
    startDate: event.start_date ?? undefined,
    endDate: event.end_date ?? undefined,
    eventStatus: 'https://schema.org/EventScheduled',
    eventAttendanceMode: 'https://schema.org/OfflineEventAttendanceMode',
    url: `https://esidenpasar.com/events/${event.slug}`,
    image: event.banner_url || event.logo_url || undefined,
    location: {
      '@type': 'Place',
      name: event.venue || event.city || 'Denpasar',
      address: {
        '@type': 'PostalAddress',
        addressLocality: event.city || 'Denpasar',
        addressRegion: 'Bali',
        addressCountry: 'ID',
      },
    },
    organizer: {
      '@type': 'Organization',
      name: event.organizer || 'ESI Kota Denpasar',
      url: 'https://esidenpasar.com',
    },
  }

  // Section types that are handled separately from the sections list
  // (hero/schedule/games/registration are already in the static content above)
  const STATIC_SECTION_TYPES = new Set(['hero', 'schedule', 'games', 'registration'])
  const dynamicSections = sections.filter(s => s.enabled && !STATIC_SECTION_TYPES.has(s.section_type))

  return (
    <>
      <JsonLd data={eventJsonLd} />
      {/* Hero */}
      <div className="relative overflow-hidden rounded-2xl mb-8" style={{ background: isCompleted ? '#44403c' : event.primary_color }}>
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <svg className="absolute right-0 top-0 h-full w-[200px] opacity-[0.08]" preserveAspectRatio="none" viewBox="0 0 200 400" fill="none">
            <polygon points="60,0 200,0 200,400 0,400" fill="white" />
          </svg>
        </div>
        <div className="relative z-10 px-6 py-12 sm:px-10 sm:py-16 text-center text-white">
          {isCompleted && (
            <div className="mb-4 inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-xs font-bold uppercase tracking-wider text-white/90">
              <CheckCircle size={14} weight="fill" /> Event Telah Selesai
            </div>
          )}
          <h1 className="text-3xl sm:text-5xl font-black tracking-tight">{event.name}</h1>
          {event.description && <p className="mt-3 text-white/70 max-w-lg mx-auto">{event.description}</p>}
          <div className="mt-6 flex flex-wrap justify-center gap-4 text-sm text-white/60">
            {event.start_date && (
              <span className="flex items-center gap-1.5"><CalendarBlank size={16} />{new Date(event.start_date).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
            )}
            {event.venue && <span className="flex items-center gap-1.5"><MapPin size={16} />{event.venue}{event.city ? `, ${event.city}` : ''}</span>}
          </div>
          {isCompleted ? (
            <div className="mt-8 flex flex-col items-center gap-2">
              {event.champion_team_name && (
                <div className="mb-2 flex items-center gap-2 text-amber-300 text-sm font-semibold">
                  <Trophy size={18} weight="fill" className="text-amber-400" />
                  Juara: {event.champion_team_name}
                </div>
              )}
              <Link href={`/events/${event.slug}/leaderboard`} className="inline-flex items-center gap-2 rounded-xl bg-amber-500 px-6 py-3 font-bold text-white transition hover:bg-amber-600 hover:shadow-lg">
                Lihat Hasil Final <Trophy size={16} weight="fill" />
              </Link>
            </div>
          ) : event.registration_open && (
            <div className="mt-8 flex flex-col items-center gap-2">
              <Link href={ctaHref} className="inline-flex items-center gap-2 rounded-xl bg-white px-6 py-3 font-bold transition hover:shadow-lg" style={{ color: event.primary_color }}>
                {ctaLabel} <ArrowRight size={16} weight="bold" />
              </Link>
              <p className="text-xs text-white/70">Perlu akun + tim sebelum registrasi event</p>
              <Link href="/cara-bertanding" className="text-xs font-semibold text-white/90 underline hover:text-white">
                Belum paham alurnya? Lihat Cara Bertanding
              </Link>
            </div>
          )}
        </div>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
          {[
            { value: stats.total_games, label: 'Cabang' },
            { value: stats.total_schools, label: 'Sekolah' },
            { value: stats.total_players, label: 'Pemain' },
          ].map(s => (
            <div key={s.label} className="rounded-xl border border-stone-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 p-4 text-center">
              <div className="text-2xl font-black" style={{ color: event.primary_color }}>{s.value}</div>
              <div className="text-xs text-stone-400 dark:text-zinc-500 font-semibold uppercase tracking-wider">{s.label}</div>
            </div>
          ))}
        </div>
      )}

      {/* Quick links */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-8">
        {[
          { href: `/events/${event.slug}/games`, label: 'Cabang Game', icon: Trophy },
          { href: `/events/${event.slug}/schedule`, label: 'Jadwal', icon: CalendarBlank },
          { href: `/events/${event.slug}/teams`, label: 'Tim Peserta', icon: Users },
          { href: `/events/${event.slug}/matches/live`, label: 'Live Match', icon: Lightning },
          { href: `/leaderboards?event_id=${event.id}`, label: 'Leaderboard', icon: Medal },
          ...(isCompleted
            ? [{ href: `/events/${event.slug}/leaderboard`, label: 'Hasil Final', icon: Medal }]
            : [{ href: `/events/${event.slug}/register`, label: 'Registrasi Tim', icon: ClipboardText }]),
        ].map(link => (
          <Link key={link.href} href={link.href} className="group flex flex-col items-center gap-2 rounded-xl border border-stone-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 p-4 transition-all hover:shadow-md hover:-translate-y-0.5">
            <link.icon size={24} style={{ color: event.primary_color }} />
            <span className="text-sm font-semibold text-stone-700 dark:text-zinc-300">{link.label}</span>
          </Link>
        ))}
      </div>

      {/* Dynamic sections (about, prizes, sponsors, stream, gallery, rules) */}
      {dynamicSections.map(section => (
        <SectionBlock key={section.id} section={section} event={event} />
      ))}

      {/* Medal standings preview */}
      {medals.length > 0 && (
        <div className="rounded-xl border border-stone-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 overflow-hidden">
          <div className="px-4 py-3 border-b border-stone-100 dark:border-zinc-800 flex items-center justify-between">
            <h2 className="text-sm font-bold text-stone-700 dark:text-zinc-300">Juara Umum</h2>
            <Link href={`/events/${event.slug}/schools/standings`} className="text-xs font-semibold" style={{ color: event.primary_color }}>Lihat Semua</Link>
          </div>
          <div className="divide-y divide-stone-100 dark:divide-zinc-800">
            {medals.map((s, i) => (
              <div key={s.id} className="flex items-center gap-3 px-4 py-2.5">
                <span className="w-6 text-center text-sm font-bold text-stone-400">{i + 1}</span>
                <span className="flex-1 text-sm font-semibold text-stone-800 dark:text-zinc-200 truncate">{s.name}</span>
                <div className="flex items-center gap-2 text-xs font-bold tabular-nums">
                  <span className="text-amber-500">{s.gold}</span>
                  <span className="text-stone-400">{s.silver}</span>
                  <span className="text-amber-700">{s.bronze}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </>
  )
}
