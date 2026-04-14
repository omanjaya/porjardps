'use client'

import { useRef } from 'react'
import dynamic from 'next/dynamic'
import { usePageAnimation } from '@/hooks/usePageAnimation'
import { useLandingData } from '@/components/landing/hooks/useLandingData'

// Above fold — static imports (immediate)
import { LandingNavbar } from '@/components/landing/sections/LandingNavbar'
import { ActiveEventBanner } from '@/components/landing/sections/ActiveEventBanner'
import { AnnouncementSection } from '@/components/landing/sections/AnnouncementSection'
import { HeroSection } from '@/components/landing/sections/HeroSection'
import { StatsSection } from '@/components/landing/sections/StatsSection'
import { CommandPalette } from '@/components/shared/CommandPalette'

// Below fold — dynamic imports (lazy loaded, still SSR for SEO)
const NewsSection = dynamic(() => import('@/components/landing/sections/NewsSection'), { ssr: true })
const GallerySection = dynamic(() => import('@/components/landing/sections/GallerySection').then(m => m.GallerySection), { ssr: true })
const AboutFaqSection = dynamic(() => import('@/components/landing/sections/AboutFaqSection').then(m => m.AboutFaqSection), { ssr: true })
const LandingFooter = dynamic(() => import('@/components/landing/sections/LandingFooter').then(m => m.LandingFooter), { ssr: true })

export default function ESILandingPage() {
  const containerRef = useRef<HTMLDivElement>(null)
  const { events, activeEvent, galleryMedia, news, stats, siteSettings, announcements, loading } = useLandingData()

  // Below-fold scroll animations via dynamic GSAP (hero is CSS-only)
  usePageAnimation(containerRef, [loading])

  return (
    <main ref={containerRef} className="min-h-[100dvh] overflow-x-hidden bg-stone-50 dark:bg-zinc-950">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'SportsOrganization',
            name: 'ESI Kota Denpasar',
            alternateName: 'Esports Indonesia Kota Denpasar',
            url: 'https://esidenpasar.com',
            logo: 'https://esidenpasar.com/images/logo/esi-denpasar.webp',
            sameAs: ['https://instagram.com/esi.denpasar'],
            address: {
              '@type': 'PostalAddress',
              addressLocality: 'Denpasar',
              addressRegion: 'Bali',
              addressCountry: 'ID',
            },
          }),
        }}
      />

      {/* ═══ COMMAND PALETTE (Ctrl/Cmd+K) ═══ */}
      <CommandPalette />

      {/* ═══ NAVIGATION ═══ */}
      <LandingNavbar activeEvent={activeEvent} />

      {/* ═══ HERO — First impression, CTA utama ═══ */}
      <HeroSection activeEvent={activeEvent} />

      {/* ═══ SOCIAL PROOF — Angka yang membangun kepercayaan ═══ */}
      <StatsSection stats={stats} />

      {/* ═══ ACTIVE EVENT — Quick link ke event ═══ */}
      <ActiveEventBanner event={activeEvent} />

      {/* ═══ ANNOUNCEMENTS — Info penting (hanya muncul jika ada) ═══ */}
      <AnnouncementSection announcements={announcements} />

      {/* ═══ UPDATES — Berita terbaru ═══ */}
      <NewsSection news={news} />

      {/* ═══ MEDIA — Dokumentasi visual ═══ */}
      <GallerySection galleryMedia={galleryMedia} />

      {/* ═══ INFO — Tentang organisasi + FAQ ═══ */}
      <AboutFaqSection aboutItems={siteSettings?.about_items} faqs={siteSettings?.faqs} />

      {/* ═══ FOOTER ═══ */}
      <LandingFooter events={events} contacts={siteSettings?.contacts} />
    </main>
  )
}
