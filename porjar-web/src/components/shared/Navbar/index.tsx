'use client'

import Link from 'next/link'
import Image from 'next/image'
import { List as ListIcon, Sword, GameController, Target, Lightning, SoccerBall, CalendarBlank, Users, Scales, Broadcast, House, Buildings, ListNumbers, Trophy, CaretDown, Images, Medal } from '@phosphor-icons/react'
import {
  Sheet,
  SheetTrigger,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { useState, useMemo, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Moon, Sun, BellSimple } from '@phosphor-icons/react'
import { useAuthStore } from '@/store/auth-store'
import { useThemeStore, useThemeHydrated } from '@/store/theme-store'
import { NotificationBell } from '@/components/shared/NotificationBell'
import { PushNotifyButton } from '@/components/shared/PushNotifyButton'
import { api } from '@/lib/api'
import type { GameSlug } from '@/types'
import type { Icon } from '@phosphor-icons/react'
import { cn } from '@/lib/utils'

// Desktop nav — 5 consolidated menus
interface NavItem {
  href: string
  label: string
  children?: { href: string; label: string }[]
}

const NAV_LINKS: NavItem[] = [
  { href: '/', label: 'Beranda' },
  {
    href: '/games', label: 'Turnamen', children: [
      { href: '/games', label: 'Cabang Game' },
      { href: '/tournaments', label: 'Daftar Turnamen' },
      { href: '/rules', label: 'Peraturan' },
    ],
  },
  {
    href: '/schedule', label: 'Jadwal', children: [
      { href: '/schedule', label: 'Jadwal Pertandingan' },
      { href: '/rundown', label: 'Rundown Acara' },
      { href: '/matches/live', label: 'Live Match' },
    ],
  },
  {
    href: '/teams', label: 'Peserta', children: [
      { href: '/teams', label: 'Daftar Tim' },
      { href: '/schools', label: 'Sekolah' },
      { href: '/schools/standings', label: 'Juara Umum' },
      { href: '/players', label: 'Pemain' },
      { href: '/leaderboards', label: 'Leaderboard' },
    ],
  },
  {
    href: '/gallery', label: 'Galeri', children: [
      { href: '/gallery', label: 'Foto & Video' },
      { href: '/achievements', label: 'Achievement' },
    ],
  },
]

// Mobile nav — flat list grouped by section
const MOBILE_SECTIONS = [
  {
    title: 'Turnamen',
    links: [
      { href: '/games', label: 'Cabang Game', icon: GameController },
      { href: '/tournaments', label: 'Daftar Turnamen', icon: Trophy },
      { href: '/rules', label: 'Peraturan', icon: Scales },
    ],
  },
  {
    title: 'Jadwal',
    links: [
      { href: '/schedule', label: 'Jadwal Pertandingan', icon: CalendarBlank },
      { href: '/rundown', label: 'Rundown Acara', icon: ListNumbers },
      { href: '/matches/live', label: 'Live Match', icon: Broadcast },
    ],
  },
  {
    title: 'Peserta',
    links: [
      { href: '/teams', label: 'Daftar Tim', icon: Users },
      { href: '/schools', label: 'Sekolah', icon: Buildings },
      { href: '/schools/standings', label: 'Juara Umum', icon: Trophy },
      { href: '/leaderboards', label: 'Leaderboard', icon: Medal },
    ],
  },
  {
    title: 'Lainnya',
    links: [
      { href: '/gallery', label: 'Galeri', icon: Images },
      { href: '/achievements', label: 'Achievement', icon: Trophy },
    ],
  },
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

function urlBase64ToUint8Array(base64String: string): Uint8Array<ArrayBuffer> {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = window.atob(base64)
  const buf = new ArrayBuffer(rawData.length)
  const view = new Uint8Array(buf)
  for (let i = 0; i < rawData.length; i++) view[i] = rawData.charCodeAt(i)
  return view
}

function MobilePushRow() {
  const [supported, setSupported] = useState(true)
  const [subscribed, setSubscribed] = useState(false)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const ok = 'Notification' in window && 'serviceWorker' in navigator
    setSupported(ok)
    if (!ok) return
    navigator.serviceWorker.getRegistration('/sw.js').then((reg) => {
      reg?.pushManager?.getSubscription().then((sub) => setSubscribed(!!sub))
    }).catch(() => {})
  }, [])

  async function toggle() {
    if (loading) return
    setLoading(true)
    try {
      if (subscribed) {
        const reg = await navigator.serviceWorker.getRegistration('/sw.js')
        const sub = await reg?.pushManager.getSubscription()
        if (sub) {
          await api.delete('/push/subscribe', { endpoint: sub.endpoint })
          await sub.unsubscribe()
        }
        setSubscribed(false)
      } else {
        if (!('PushManager' in window)) {
          alert('Browser kamu belum mendukung push notification. Di iOS, tambahkan halaman ini ke Home Screen terlebih dahulu.')
          return
        }
        const permission = await Notification.requestPermission()
        if (permission !== 'granted') return
        let reg = await navigator.serviceWorker.getRegistration('/sw.js')
        if (!reg) reg = await navigator.serviceWorker.register('/sw.js')
        await navigator.serviceWorker.ready
        const keyData = await api.get<{ public_key: string }>('/push/vapid-public-key')
        const applicationServerKey = urlBase64ToUint8Array(keyData!.public_key)
        const sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey })
        const json = sub.toJSON()
        await api.post('/push/subscribe', { endpoint: json.endpoint, keys: json.keys })
        setSubscribed(true)
      }
    } catch { /* ignore */ } finally {
      setLoading(false)
    }
  }

  return (
    <div className="border-t border-stone-100 dark:border-zinc-800 px-4 py-3">
      <button
        onClick={supported ? toggle : undefined}
        disabled={loading || !supported}
        className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors hover:bg-stone-50 dark:hover:bg-zinc-800 disabled:opacity-40"
      >
        <BellSimple
          size={18}
          weight={subscribed ? 'fill' : 'regular'}
          className={subscribed ? 'text-esi-red' : 'text-stone-400'}
        />
        <div className="flex flex-col items-start leading-tight">
          <span className={subscribed ? 'text-esi-red font-semibold' : 'text-stone-600 dark:text-zinc-400'}>
            {!supported ? 'Notifikasi' : subscribed ? 'Notifikasi Aktif' : 'Aktifkan Notifikasi'}
          </span>
          <span className="text-[11px] text-stone-400 dark:text-zinc-500">
            {!supported ? 'Tidak didukung browser ini' : subscribed ? 'Klik untuk matikan' : 'Hasil pertandingan real-time'}
          </span>
        </div>
      </button>
    </div>
  )
}

interface NavbarProps {
  /** Use 'fixed' for landing page, 'sticky' for other pages */
  position?: 'fixed' | 'sticky'
}

export function Navbar({ position = 'sticky' }: NavbarProps) {
  const router = useRouter()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [openDropdown, setOpenDropdown] = useState<string | null>(null)
  const { isAuthenticated, user } = useAuthStore()
  const { isDark, toggle: toggleTheme } = useThemeStore()
  const themeMounted = useThemeHydrated()

  const gameListItems = useMemo(() => GAMES.map((game) => {
    const IconComp = game.icon
    return { slug: game.slug, name: game.name, IconComp }
  }), [])

  return (
    <header className={cn(
      'top-0 z-50 w-full border-b border-black/5 bg-esi-bg/85 backdrop-blur-xl',
      position === 'fixed' ? 'fixed' : 'sticky'
    )}>
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-5">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2">
          <Image src="/images/logo/kota-denpasar.webp" alt="Kota Denpasar" width={36} height={36} className="h-9 w-9 object-contain" />
          <Image src="/images/logo/esi-denpasar.webp" alt="ESI Denpasar" width={36} height={36} className="h-9 w-9 object-contain" />
          <div className="ml-1 flex flex-col leading-none">
            <span className="text-sm font-bold tracking-tight text-esi-red">ESI</span>
            <span className="text-[10px] font-medium text-stone-600 tracking-wider">KOTA DENPASAR</span>
          </div>
        </Link>

        {/* Center nav links with dropdowns */}
        <div className="hidden md:flex items-center gap-6 text-[13px] font-semibold text-stone-600">
          {NAV_LINKS.map((link) =>
            link.children ? (
              <div key={link.href} className="group relative">
                <button
                  className="flex items-center gap-1 transition hover:text-esi-red"
                  aria-haspopup="true"
                  aria-expanded={openDropdown === link.href}
                  onKeyDown={(e) => {
                    if (e.key === 'ArrowDown' || e.key === 'Enter') {
                      e.preventDefault()
                      setOpenDropdown(openDropdown === link.href ? null : link.href)
                    }
                    if (e.key === 'Escape') {
                      setOpenDropdown(null)
                    }
                  }}
                  onClick={() => setOpenDropdown(openDropdown === link.href ? null : link.href)}
                  onBlur={(e) => {
                    if (!e.currentTarget.parentElement?.contains(e.relatedTarget as Node)) {
                      setOpenDropdown(null)
                    }
                  }}
                >
                  {link.label}
                  <CaretDown size={12} weight="bold" className={cn('transition-transform', openDropdown === link.href ? 'rotate-180' : 'group-hover:rotate-180')} />
                </button>
                <div className={cn(
                  'absolute left-1/2 top-full pt-2 -translate-x-1/2 transition-all',
                  openDropdown === link.href
                    ? 'pointer-events-auto opacity-100'
                    : 'pointer-events-none opacity-0 group-hover:pointer-events-auto group-hover:opacity-100'
                )}>
                  <div className="min-w-[180px] rounded-xl border border-stone-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 p-1.5 shadow-lg">
                    {link.children.map((child) => (
                      <Link
                        key={child.href}
                        href={child.href}
                        onClick={() => setOpenDropdown(null)}
                        className={cn(
                          'flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-stone-600 dark:text-zinc-400 transition-colors hover:bg-stone-50 dark:hover:bg-zinc-800 hover:text-esi-red',
                          child.label === 'Live Match' && 'text-red-500',
                        )}
                      >
                        {child.label === 'Live Match' && (
                          <span className="relative flex h-1.5 w-1.5">
                            <span className="absolute h-full w-full animate-ping rounded-full bg-red-500 opacity-60" />
                            <span className="relative h-1.5 w-1.5 rounded-full bg-red-500" />
                          </span>
                        )}
                        {child.label}
                      </Link>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <Link key={link.href} href={link.href} className="transition hover:text-esi-red">
                {link.label}
              </Link>
            )
          )}
        </div>

        {/* Right auth buttons */}
        <div className="hidden md:flex items-center gap-3">
          <button
            onClick={toggleTheme}
            className="rounded-lg p-2 text-stone-600 dark:text-zinc-400 transition-colors hover:bg-stone-100 dark:hover:bg-zinc-800 hover:text-stone-800 dark:hover:text-zinc-100"
            aria-label={isDark ? 'Mode terang' : 'Mode gelap'}
          >
            {themeMounted ? (isDark ? <Sun size={18} /> : <Moon size={18} />) : <Moon size={18} />}
          </button>
          <PushNotifyButton />
          <NotificationBell />
          {isAuthenticated ? (
            <Link href={
              user?.role === 'admin' || user?.role === 'superadmin' ? '/admin'
              : user?.role === 'coach' ? '/coach'
              : user?.role === 'referee' ? '/referee'
              : '/dashboard'
            } className="rounded-lg bg-esi-red px-4 py-1.5 text-[13px] font-bold text-white transition hover:brightness-110">
              Dashboard
            </Link>
          ) : (
            <>
              <Link href="/login" className="text-[13px] font-medium text-stone-600 transition hover:text-stone-800">
                Masuk
              </Link>
              <Link href="/register" className="rounded-lg bg-esi-red px-4 py-1.5 text-[13px] font-bold text-white transition hover:brightness-110">
                Daftar
              </Link>
            </>
          )}
        </div>

        {/* Mobile hamburger */}
        <div className="flex items-center gap-1 md:hidden">
          <button
            onClick={toggleTheme}
            className="rounded-lg p-2 text-stone-600 dark:text-zinc-400 hover:bg-stone-100 dark:hover:bg-zinc-800"
            aria-label={isDark ? 'Mode terang' : 'Mode gelap'}
          >
            {themeMounted ? (isDark ? <Sun size={18} /> : <Moon size={18} />) : <Moon size={18} />}
          </button>
          <NotificationBell />
          <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
          <SheetTrigger className="inline-flex items-center justify-center rounded-lg p-2.5 text-stone-600 hover:bg-stone-100 hover:text-stone-800 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-200">
            <ListIcon size={24} />
            <span className="sr-only">Menu</span>
          </SheetTrigger>
          <SheetContent side="right" className="flex flex-col w-72 bg-white dark:bg-zinc-900 border-stone-200 dark:border-zinc-700 p-0 h-full">
            {/* Header: logo + auth */}
            <SheetHeader className="shrink-0 border-b border-stone-200 dark:border-zinc-700 px-4 py-3">
              <div className="flex items-center justify-between gap-2">
                <SheetTitle className="flex items-center gap-1.5">
                  <Image src="/images/logo/kota-denpasar.webp" alt="Kota Denpasar" width={26} height={26} className="h-6.5 w-6.5 object-contain" />
                  <Image src="/images/logo/esi-denpasar.webp" alt="ESI Denpasar" width={26} height={26} className="h-6.5 w-6.5 object-contain" />
                  <span className="ml-1 text-sm font-bold text-esi-red">ESI</span>
                </SheetTitle>

                {/* Auth — always visible at top */}
                {isAuthenticated ? (
                  <button
                    onClick={() => {
                      setMobileMenuOpen(false)
                      const role = user?.role
                      router.push(
                        role === 'admin' || role === 'superadmin' ? '/admin'
                        : role === 'coach' ? '/coach'
                        : role === 'referee' ? '/referee'
                        : '/dashboard'
                      )
                    }}
                    className="flex items-center gap-1.5 rounded-lg bg-esi-red px-3 py-1.5 text-xs font-bold text-white hover:brightness-110 transition-all"
                  >
                    Dashboard
                  </button>
                ) : (
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => { setMobileMenuOpen(false); router.push('/login') }}
                      className="rounded-lg border border-stone-200 dark:border-zinc-700 px-3 py-1.5 text-xs font-semibold text-stone-600 dark:text-zinc-400 hover:bg-stone-50 dark:hover:bg-zinc-800 transition-colors"
                    >
                      Masuk
                    </button>
                    <button
                      onClick={() => { setMobileMenuOpen(false); router.push('/register') }}
                      className="rounded-lg bg-esi-red px-3 py-1.5 text-xs font-bold text-white hover:brightness-110 transition-all"
                    >
                      Daftar
                    </button>
                  </div>
                )}
              </div>
            </SheetHeader>

            {/* Scrollable nav content */}
            <div className="flex-1 overflow-y-auto">
              {/* Push notifications */}
              <MobilePushRow />

              {/* Game links — 2-column grid */}
              <div className="p-4">
                <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-stone-400">Cabang Lomba</p>
                <div className="grid grid-cols-2 gap-1">
                  {gameListItems.map((game) => (
                    <button
                      key={game.slug}
                      onClick={() => { setMobileMenuOpen(false); router.push(`/games/${game.slug}`) }}
                      className="flex items-center gap-2 rounded-lg px-2.5 py-2 text-xs font-medium text-stone-600 dark:text-zinc-400 hover:bg-stone-50 dark:hover:bg-zinc-800 hover:text-stone-900 dark:hover:text-zinc-100 transition-colors text-left"
                    >
                      <game.IconComp size={16} className="shrink-0 text-stone-400" />
                      <span className="truncate">{game.name}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Page links grouped by section */}
              {MOBILE_SECTIONS.map((section) => (
                <div key={section.title} className="border-t border-stone-100 dark:border-zinc-800 p-4">
                  <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-stone-400 dark:text-zinc-500">{section.title}</p>
                  <nav className="flex flex-col gap-0.5">
                    {section.links.map((link) => (
                      <Link
                        key={link.href}
                        href={link.href}
                        onClick={() => setMobileMenuOpen(false)}
                        className={cn(
                          'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors hover:bg-stone-50 dark:hover:bg-zinc-800 hover:text-stone-900 dark:hover:text-zinc-100',
                          link.label === 'Live Match' ? 'text-red-500' : 'text-stone-600 dark:text-zinc-400',
                        )}
                      >
                        <link.icon size={18} className="shrink-0 text-stone-400" />
                        {link.label}
                        {link.label === 'Live Match' && (
                          <span className="relative ml-auto flex h-2 w-2">
                            <span className="absolute h-full w-full animate-ping rounded-full bg-red-500 opacity-60" />
                            <span className="relative h-2 w-2 rounded-full bg-red-500" />
                          </span>
                        )}
                      </Link>
                    ))}
                  </nav>
                </div>
              ))}

            </div>
          </SheetContent>
        </Sheet>
        </div>
      </div>
    </header>
  )
}
