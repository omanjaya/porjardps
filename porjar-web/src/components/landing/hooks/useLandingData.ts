'use client'

import { useEffect, useMemo, useState } from 'react'
import { api } from '@/lib/api'
import type { Event, Media } from '@/types'
import type { NewsItem } from '@/components/landing/sections/NewsSection'
import type { LandingContact } from '@/components/landing/constants'
import type { Announcement } from '@/types/announcement'

export interface LandingFaq { question: string; answer: string }
export interface LandingAboutItem { icon: string; title: string; description: string }
export interface LandingSiteSettings {
  faqs: LandingFaq[]
  about_items: LandingAboutItem[]
  contacts: LandingContact[]
}

export interface LandingGame {
  slug: string
  name: string
  iconName?: string
}

export interface LandingStats {
  schools: number
  games: number
  tournaments_total: number
  tournaments_completed: number
  tournaments_ongoing: number
  athletes: number
  teams: number
  current_year: number
}

export interface LandingLiveMatch {
  id: number
  tournamentName: string
  gameName?: string
  teamA: { name: string; logo?: string; score: number }
  teamB: { name: string; logo?: string; score: number }
  status: 'live' | 'paused'
  round?: string
}

export interface LandingData {
  events: Event[]
  activeEvent: Event | null
  galleryMedia: Media[]
  news: NewsItem[]
  stats: LandingStats | null
  siteSettings: LandingSiteSettings | null
  announcements: Announcement[]
  loading: boolean
}

export function useLandingData(): LandingData {
  const [events, setEvents] = useState<Event[]>([])
  const [loading, setLoading] = useState(true)
  const [galleryMedia, setGalleryMedia] = useState<Media[]>([])
  const [news, setNews] = useState<NewsItem[]>([])
  const [stats, setStats] = useState<LandingStats | null>(null)
  const [siteSettings, setSiteSettings] = useState<LandingSiteSettings | null>(null)
  const [announcements, setAnnouncements] = useState<Announcement[]>([])

  useEffect(() => {
    api.get<Event[]>('/events')
      .then(data => setEvents(Array.isArray(data) ? data : []))
      .catch(() => setEvents([]))
      .finally(() => setLoading(false))

    api.get<Media[]>('/media/highlights?limit=6')
      .then(list => setGalleryMedia(Array.isArray(list) ? list.slice(0, 6) : []))
      .catch(() => setGalleryMedia([]))

    try {
      api.get<Record<string, unknown>[]>('/news?per_page=4')
        .then(list => {
          const arr = Array.isArray(list) ? list : []
          setNews(
            arr.map((n) => ({
              id: (n?.id as number | string) ?? '',
              title: String(n?.title ?? ''),
              excerpt: String(n?.excerpt ?? n?.summary ?? ''),
              date: String(n?.date ?? n?.published_at ?? n?.created_at ?? ''),
              category: n?.category as string | undefined,
              href: (n?.href ?? n?.url) as string | undefined,
              imageUrl: (n?.image_url ?? n?.imageUrl) as string | undefined,
            }))
          )
        })
        .catch(() => setNews([]))
    } catch {
      setNews([])
    }

    api.get<Record<string, unknown>>('/stats/public')
      .then(data => {
        if (!data || typeof data !== 'object') { setStats(null); return }
        setStats({
          schools: Number(data.schools ?? 0),
          games: Number(data.games ?? 0),
          tournaments_total: Number(data.tournaments_total ?? 0),
          tournaments_completed: Number(data.tournaments_completed ?? 0),
          tournaments_ongoing: Number(data.tournaments_ongoing ?? 0),
          athletes: Number(data.athletes ?? 0),
          teams: Number(data.teams ?? 0),
          current_year: Number(data.current_year ?? new Date().getFullYear()),
        })
      })
      .catch(() => setStats(null))

    api.get<LandingSiteSettings>('/site-settings')
      .then(data => {
        if (data && typeof data === 'object') {
          setSiteSettings({
            faqs: Array.isArray(data.faqs) ? data.faqs : [],
            about_items: Array.isArray(data.about_items) ? data.about_items : [],
            contacts: Array.isArray(data.contacts) ? data.contacts : [],
          })
        }
      })
      .catch(() => setSiteSettings(null))

    try {
      api.get<Announcement[]>('/announcements/active')
        .then(list => setAnnouncements(Array.isArray(list) ? list : []))
        .catch(() => setAnnouncements([]))
    } catch {
      setAnnouncements([])
    }
  }, [])

  const activeEvent = useMemo(() => {
    return events.find(e => e.status === 'ongoing')
      || events.find(e => e.status === 'published')
      || null
  }, [events])

  return { events, activeEvent, galleryMedia, news, stats, siteSettings, announcements, loading }
}
