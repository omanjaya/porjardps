'use client'

import Link from 'next/link'
import Image from 'next/image'
import { List as ListIcon, Sword, GameController, Target, Lightning, SoccerBall, CalendarBlank, Users, Scales, Broadcast, House, Buildings } from '@phosphor-icons/react'
import {
  Sheet,
  SheetTrigger,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/store/auth-store'
import { NotificationBell } from '@/components/shared/NotificationBell'
import type { GameSlug } from '@/types'
import type { Icon } from '@phosphor-icons/react'
import { cn } from '@/lib/utils'

const NAV_LINKS = [
  { href: '/', label: 'Beranda' },
  { href: '/games', label: 'Games' },
  { href: '/schedule', label: 'Jadwal' },
  { href: '/teams', label: 'Tim' },
  { href: '/rules', label: 'Peraturan' },
  { href: '/schools', label: 'Sekolah' },
]

const MOBILE_LINKS = [
  { href: '/', label: 'Beranda', icon: House },
  { href: '/games', label: 'Games', icon: GameController },
  { href: '/schedule', label: 'Jadwal', icon: CalendarBlank },
  { href: '/teams', label: 'Tim', icon: Users },
  { href: '/rules', label: 'Peraturan', icon: Scales },
  { href: '/schools', label: 'Sekolah', icon: Buildings },
  { href: '/matches/live', label: 'Live', icon: Broadcast },
]

const GAMES = [
  { slug: 'hok' as GameSlug, name: 'HOK', icon: Sword },
  { slug: 'ml-pria' as GameSlug, name: 'ML Pria', icon: GameController },
  { slug: 'ml-wanita' as GameSlug, name: 'ML Wanita', icon: GameController },
  { slug: 'ff' as GameSlug, name: 'Free Fire', icon: Target },
  { slug: 'pubgm' as GameSlug, name: 'PUBG Mobile', icon: Lightning },
  { slug: 'efootball-solo' as GameSlug, name: 'eFootball Solo', icon: SoccerBall },
  { slug: 'efootball-duo' as GameSlug, name: 'eFootball Duo', icon: SoccerBall },
]

interface NavbarProps {
  /** Use 'fixed' for landing page, 'sticky' for other pages */
  position?: 'fixed' | 'sticky'
}

export function Navbar({ position = 'sticky' }: NavbarProps) {
  const router = useRouter()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const { isAuthenticated, user } = useAuthStore()

  const gameListItems = useMemo(() => GAMES.map((game) => {
    const IconComp = game.icon
    return { slug: game.slug, name: game.name, IconComp }
  }), [])

  return (
    <header className={cn(
      'top-0 z-50 w-full border-b border-black/5 bg-porjar-bg/85 backdrop-blur-xl',
      position === 'fixed' ? 'fixed' : 'sticky'
    )}>
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-5">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2">
          <Image src="/images/logo/kota-denpasar.webp" alt="Kota Denpasar" width={36} height={36} className="h-9 w-9 object-contain" />
          <Image src="/images/logo/esi-denpasar.webp" alt="ESI Denpasar" width={36} height={36} className="h-9 w-9 object-contain" />
          <div className="ml-1 flex flex-col leading-none">
            <span className="text-sm font-bold tracking-tight text-porjar-red">PORJAR</span>
            <span className="text-[10px] font-medium text-stone-500 tracking-wider">ESPORT DENPASAR</span>
          </div>
        </Link>

        {/* Center nav links */}
        <div className="hidden md:flex items-center gap-7 text-[13px] font-semibold text-stone-500">
          {NAV_LINKS.map((link) => (
            <Link key={link.href} href={link.href} className="transition hover:text-porjar-red">
              {link.label}
            </Link>
          ))}
          <Link href="/matches/live" className="flex items-center gap-1.5 transition hover:text-porjar-red">
            <span className="relative flex h-1.5 w-1.5">
              <span className="absolute h-full w-full animate-ping rounded-full bg-red-500 opacity-60" />
              <span className="relative h-1.5 w-1.5 rounded-full bg-red-500" />
            </span>
            Live
          </Link>
        </div>

        {/* Right auth buttons */}
        <div className="hidden md:flex items-center gap-3">
          <NotificationBell />
          {isAuthenticated ? (
            <Link href="/dashboard" className="rounded-lg bg-porjar-red px-4 py-1.5 text-[13px] font-bold text-white transition hover:brightness-110">
              Dashboard
            </Link>
          ) : (
            <>
              <Link href="/login" className="text-[13px] font-medium text-stone-500 transition hover:text-stone-800">
                Masuk
              </Link>
              <Link href="/register" className="rounded-lg bg-porjar-red px-4 py-1.5 text-[13px] font-bold text-white transition hover:brightness-110">
                Daftar
              </Link>
            </>
          )}
        </div>

        {/* Mobile hamburger */}
        <div className="flex items-center gap-1 md:hidden">
          <NotificationBell />
          <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
          <SheetTrigger className="inline-flex items-center justify-center rounded-lg p-2.5 text-stone-500 hover:bg-stone-100 hover:text-stone-800">
            <ListIcon size={24} />
            <span className="sr-only">Menu</span>
          </SheetTrigger>
          <SheetContent side="right" className="flex flex-col w-72 bg-white border-stone-200 p-0 h-full">
            {/* Header: logo + auth */}
            <SheetHeader className="shrink-0 border-b border-stone-200 px-4 py-3">
              <div className="flex items-center justify-between gap-2">
                <SheetTitle className="flex items-center gap-1.5">
                  <Image src="/images/logo/kota-denpasar.webp" alt="Kota Denpasar" width={26} height={26} className="h-6.5 w-6.5 object-contain" />
                  <Image src="/images/logo/esi-denpasar.webp" alt="ESI Denpasar" width={26} height={26} className="h-6.5 w-6.5 object-contain" />
                  <span className="ml-1 text-sm font-bold text-porjar-red">PORJAR</span>
                </SheetTitle>

                {/* Auth — always visible at top */}
                {isAuthenticated ? (
                  <button
                    onClick={() => { setMobileMenuOpen(false); router.push('/dashboard') }}
                    className="flex items-center gap-1.5 rounded-lg bg-porjar-red px-3 py-1.5 text-xs font-bold text-white hover:brightness-110 transition-all"
                  >
                    Dashboard
                  </button>
                ) : (
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => { setMobileMenuOpen(false); router.push('/login') }}
                      className="rounded-lg border border-stone-200 px-3 py-1.5 text-xs font-semibold text-stone-600 hover:bg-stone-50 transition-colors"
                    >
                      Masuk
                    </button>
                    <button
                      onClick={() => { setMobileMenuOpen(false); router.push('/register') }}
                      className="rounded-lg bg-porjar-red px-3 py-1.5 text-xs font-bold text-white hover:brightness-110 transition-all"
                    >
                      Daftar
                    </button>
                  </div>
                )}
              </div>
            </SheetHeader>

            {/* Scrollable nav content */}
            <div className="flex-1 overflow-y-auto">
              {/* Game links — 2-column grid */}
              <div className="p-4">
                <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-stone-400">Cabang Lomba</p>
                <div className="grid grid-cols-2 gap-1">
                  {gameListItems.map((game) => (
                    <button
                      key={game.slug}
                      onClick={() => { setMobileMenuOpen(false); router.push(`/games/${game.slug}`) }}
                      className="flex items-center gap-2 rounded-lg px-2.5 py-2 text-xs font-medium text-stone-600 hover:bg-stone-50 hover:text-stone-900 transition-colors text-left"
                    >
                      <game.IconComp size={16} className="shrink-0 text-stone-400" />
                      <span className="truncate">{game.name}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Page links */}
              <div className="border-t border-stone-100 p-4">
                <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-stone-400">Halaman</p>
                <nav className="flex flex-col gap-0.5">
                  {MOBILE_LINKS.map((link) => (
                    <Link
                      key={link.href}
                      href={link.href}
                      onClick={() => setMobileMenuOpen(false)}
                      className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-stone-600 hover:bg-stone-50 hover:text-stone-900 transition-colors"
                    >
                      <link.icon size={18} className="shrink-0 text-stone-400" />
                      {link.label}
                    </Link>
                  ))}
                </nav>
              </div>
            </div>
          </SheetContent>
        </Sheet>
        </div>
      </div>
    </header>
  )
}
