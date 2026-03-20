'use client'

import Link from 'next/link'
import Image from 'next/image'
import { List as ListIcon, SignIn, UserPlus, Sword, GameController, Target, Lightning, SoccerBall, CalendarBlank, Users, Scales, Broadcast, House, Buildings } from '@phosphor-icons/react'
import { Button } from '@/components/ui/button'
import {
  Sheet,
  SheetTrigger,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetClose,
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
  { slug: 'ml' as GameSlug, name: 'Mobile Legends', icon: GameController },
  { slug: 'ff' as GameSlug, name: 'Free Fire', icon: Target },
  { slug: 'pubgm' as GameSlug, name: 'PUBG Mobile', icon: Lightning },
  { slug: 'efootball' as GameSlug, name: 'eFootball', icon: SoccerBall },
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
          <SheetContent side="right" className="w-72 bg-white border-stone-200 p-0">
            <SheetHeader className="border-b border-stone-200 p-4">
              <SheetTitle className="flex items-center gap-1.5 text-stone-900">
                <Image src="/images/logo/kota-denpasar.webp" alt="Kota Denpasar" width={28} height={28} className="h-7 w-7 object-contain" />
                <Image src="/images/logo/esi-denpasar.webp" alt="ESI Denpasar" width={28} height={28} className="h-7 w-7 object-contain" />
                <span className="ml-1 text-sm font-bold text-porjar-red">PORJAR</span>
                <span className="text-[10px] font-medium text-stone-500 tracking-wider">ESPORT</span>
              </SheetTitle>
            </SheetHeader>

            {/* Game links */}
            <nav className="flex flex-col gap-1 p-4">
              <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-stone-400">Cabang Lomba</p>
              {gameListItems.map((game) => (
                  <button
                    key={game.slug}
                    onClick={() => { setMobileMenuOpen(false); router.push(`/games/${game.slug}`) }}
                    className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-stone-500 hover:bg-stone-50 hover:text-stone-800 transition-colors text-left"
                  >
                    <game.IconComp size={20} />
                    {game.name}
                  </button>
              ))}
            </nav>

            {/* Page links */}
            <nav className="flex flex-col gap-1 border-t border-stone-200 p-4">
              <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-stone-400">Halaman</p>
              {MOBILE_LINKS.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-stone-500 hover:bg-stone-50 hover:text-stone-800 transition-colors"
                >
                  <link.icon size={20} />
                  {link.label}
                </Link>
              ))}
            </nav>

            {/* Auth buttons */}
            <div className="mt-auto border-t border-stone-200 p-4 flex flex-col gap-2">
              {isAuthenticated ? (
                <SheetClose
                  render={
                    <Button
                      className="w-full justify-start gap-2 bg-porjar-red text-white hover:brightness-110"
                      onClick={() => router.push('/dashboard')}
                    />
                  }
                >
                  <UserPlus size={18} />
                  Dashboard
                </SheetClose>
              ) : (
                <>
                  <SheetClose
                    render={
                      <Button
                        variant="ghost"
                        className="w-full justify-start gap-2 text-stone-500 hover:text-porjar-red hover:bg-porjar-red/5"
                        onClick={() => router.push('/login')}
                      />
                    }
                  >
                    <SignIn size={18} />
                    Masuk
                  </SheetClose>
                  <SheetClose
                    render={
                      <Button
                        className="w-full justify-start gap-2 bg-porjar-red text-white hover:brightness-110"
                        onClick={() => router.push('/register')}
                      />
                    }
                  >
                    <UserPlus size={18} />
                    Daftar
                  </SheetClose>
                </>
              )}
            </div>
          </SheetContent>
        </Sheet>
        </div>
      </div>
    </header>
  )
}
