'use client'

import Link from 'next/link'
import Image from 'next/image'
import { List as ListIcon, CaretDown, CaretRight } from '@phosphor-icons/react'
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
import { useEvent } from '@/contexts/EventContext'
import { api } from '@/lib/api'
import { cn } from '@/lib/utils'

// Desktop nav — 4 primary dropdowns + Beranda
interface NavItem {
  href: string
  label: string
  children?: { href: string; label: string }[]
}

const NAV_LINKS = (slug: string, isCompleted: boolean): NavItem[] => [
  { href: `/events/${slug}`, label: 'Beranda' },
  {
    href: `/events/${slug}/tournaments`, label: 'Turnamen', children: [
      { href: `/events/${slug}/games`, label: 'Cabang Game' },
      { href: `/events/${slug}/tournaments`, label: 'Daftar Turnamen' },
      { href: `/events/${slug}/rules`, label: 'Peraturan' },
    ],
  },
  {
    href: `/events/${slug}/schedule`, label: 'Jadwal', children: [
      { href: `/events/${slug}/schedule`, label: 'Jadwal Pertandingan' },
      { href: `/events/${slug}/rundown`, label: 'Rundown Acara' },
      { href: `/events/${slug}/matches/live`, label: 'Live Match' },
    ],
  },
  {
    href: `/events/${slug}/teams`, label: 'Peserta', children: [
      { href: `/events/${slug}/teams`, label: 'Daftar Tim' },
      { href: `/events/${slug}/schools`, label: 'Sekolah' },
      { href: `/events/${slug}/schools/standings`, label: 'Juara Umum' },
      { href: `/events/${slug}/players`, label: 'Pemain' },
      { href: `/events/${slug}/leaderboard`, label: 'Leaderboard' },
      ...(isCompleted
        ? [{ href: `/events/${slug}/leaderboard`, label: 'Hasil Final' }]
        : [{ href: `/events/${slug}/register`, label: 'Registrasi Tim' }]),
    ],
  },
  {
    href: `/events/${slug}/gallery`, label: 'Lainnya', children: [
      { href: `/events/${slug}/gallery`, label: 'Galeri' },
      { href: `/events/${slug}/achievements`, label: 'Prestasi' },
    ],
  },
]

// Mobile nav — 6 primary text-only items
const MOBILE_PRIMARY = (slug: string) => [
  { href: `/events/${slug}`, label: 'Beranda' },
  { href: `/events/${slug}/tournaments`, label: 'Turnamen' },
  { href: `/events/${slug}/schedule`, label: 'Jadwal' },
  { href: `/events/${slug}/leaderboard`, label: 'Leaderboard' },
  { href: `/events/${slug}/teams`, label: 'Tim' },
  { href: `/events/${slug}/gallery`, label: 'Galeri' },
]

// Mobile "Lainnya" submenu — secondary items
const MOBILE_MORE = (slug: string, isCompleted: boolean) => [
  { href: `/events/${slug}/games`, label: 'Cabang Game' },
  { href: `/events/${slug}/rules`, label: 'Peraturan' },
  { href: `/events/${slug}/rundown`, label: 'Rundown Acara' },
  { href: `/events/${slug}/matches/live`, label: 'Live Match' },
  { href: `/events/${slug}/schools`, label: 'Sekolah' },
  { href: `/events/${slug}/schools/standings`, label: 'Juara Umum' },
  { href: `/events/${slug}/players`, label: 'Pemain' },
  { href: `/events/${slug}/achievements`, label: 'Prestasi' },
  ...(isCompleted
    ? [{ href: `/events/${slug}/leaderboard`, label: 'Hasil Final' }]
    : [{ href: `/events/${slug}/register`, label: 'Registrasi Tim' }]),
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

interface EventNavbarProps {
  /** Use 'fixed' for landing page, 'sticky' for other pages */
  position?: 'fixed' | 'sticky'
}

export function EventNavbar({ position = 'sticky' }: EventNavbarProps) {
  const event = useEvent()
  const router = useRouter()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [mobileMoreOpen, setMobileMoreOpen] = useState(false)
  const { isAuthenticated, user } = useAuthStore()
  const dashboardHref = useMemo(() => {
    const role = user?.role
    if (role === 'admin' || role === 'superadmin') return '/admin'
    if (role === 'coach') return '/coach'
    if (role === 'referee') return '/referee'
    return '/dashboard'
  }, [user?.role])
  const { isDark, toggle: toggleTheme } = useThemeStore()
  const themeMounted = useThemeHydrated()

  const isCompleted = event.status === 'completed' || event.status === 'archived'
  const navLinks = useMemo(() => NAV_LINKS(event.slug, isCompleted), [event.slug, isCompleted])
  const mobilePrimary = useMemo(() => MOBILE_PRIMARY(event.slug), [event.slug])
  const mobileMore = useMemo(() => MOBILE_MORE(event.slug, isCompleted), [event.slug, isCompleted])

  const logoSrc = event.logo_url ?? '/images/logo/esi-denpasar.webp'

  return (
    <header className={cn(
      'top-0 z-50 w-full border-b border-black/5 bg-esi-bg/85 backdrop-blur-xl',
      position === 'fixed' ? 'fixed' : 'sticky'
    )}>
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-5">
        {/* Logo */}
        <Link href={`/events/${event.slug}`} className="flex items-center gap-2">
          <Image src={logoSrc} alt={event.short_name} width={36} height={36} className="h-9 w-9 object-contain" />
          <div className="ml-1 flex flex-col leading-none">
            <span className="text-sm font-bold tracking-tight" style={{ color: event.primary_color }}>{event.short_name}</span>
            <span className="text-[10px] font-medium text-stone-500 tracking-wider">ESI KOTA DENPASAR</span>
          </div>
        </Link>

        {/* Center nav links with dropdowns */}
        <div className="hidden md:flex items-center gap-6 text-[13px] font-semibold text-stone-500">
          {navLinks.map((link) =>
            link.children ? (
              <div key={link.href} className="group relative">
                <button className="flex items-center gap-1 transition hover:text-[var(--event-primary)]">
                  {link.label}
                  <CaretDown size={12} weight="bold" className="transition-transform group-hover:rotate-180" />
                </button>
                <div className="pointer-events-none absolute left-1/2 top-full pt-2 opacity-0 transition-all group-hover:pointer-events-auto group-hover:opacity-100 -translate-x-1/2">
                  <div className="min-w-[180px] rounded-xl border border-stone-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 p-1.5 shadow-lg">
                    {link.children.map((child) => (
                      <Link
                        key={child.href}
                        href={child.href}
                        className={cn(
                          'flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-stone-600 dark:text-zinc-400 transition-colors hover:bg-stone-50 dark:hover:bg-zinc-800 hover:text-[var(--event-primary)]',
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
              <Link key={link.href} href={link.href} className="transition hover:text-[var(--event-primary)]">
                {link.label}
              </Link>
            )
          )}
        </div>

        {/* Right auth buttons */}
        <div className="hidden md:flex items-center gap-3">
          <button
            onClick={toggleTheme}
            className="rounded-lg p-2 text-stone-500 dark:text-zinc-400 transition-colors hover:bg-stone-100 dark:hover:bg-zinc-800 hover:text-stone-800 dark:hover:text-zinc-100"
            aria-label={isDark ? 'Mode terang' : 'Mode gelap'}
          >
            {themeMounted ? (isDark ? <Sun size={18} /> : <Moon size={18} />) : <Moon size={18} />}
          </button>
          <PushNotifyButton />
          <NotificationBell />
          {isAuthenticated ? (
            <Link href={dashboardHref} className="rounded-lg px-4 py-1.5 text-[13px] font-bold text-white transition hover:brightness-110" style={{ backgroundColor: event.primary_color }}>
              Dashboard
            </Link>
          ) : (
            <>
              <Link href="/login" className="text-[13px] font-medium text-stone-500 transition hover:text-stone-800">
                Masuk
              </Link>
              <Link href="/register" className="rounded-lg px-4 py-1.5 text-[13px] font-bold text-white transition hover:brightness-110" style={{ backgroundColor: event.primary_color }}>
                Daftar
              </Link>
            </>
          )}
        </div>

        {/* Mobile hamburger */}
        <div className="flex items-center gap-1 md:hidden">
          <button
            onClick={toggleTheme}
            className="rounded-lg p-2 text-stone-500 dark:text-zinc-400 hover:bg-stone-100 dark:hover:bg-zinc-800"
            aria-label={isDark ? 'Mode terang' : 'Mode gelap'}
          >
            {themeMounted ? (isDark ? <Sun size={18} /> : <Moon size={18} />) : <Moon size={18} />}
          </button>
          <NotificationBell />
          <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
          <SheetTrigger className="inline-flex items-center justify-center rounded-lg p-2.5 text-stone-500 hover:bg-stone-100 hover:text-stone-800 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-200">
            <ListIcon size={24} />
            <span className="sr-only">Menu</span>
          </SheetTrigger>
          <SheetContent side="right" className="flex flex-col w-72 bg-white dark:bg-zinc-900 border-stone-200 dark:border-zinc-700 p-0 h-full">
            {/* Header: logo + auth */}
            <SheetHeader className="shrink-0 border-b border-stone-200 dark:border-zinc-700 px-4 py-3">
              <div className="flex items-center justify-between gap-2">
                <SheetTitle className="flex min-w-0 items-center gap-1.5">
                  <Image src={logoSrc} alt={event.short_name} width={26} height={26} className="h-6.5 w-6.5 shrink-0 object-contain" />
                  <span className="ml-1 truncate text-sm font-bold" style={{ color: event.primary_color }} title={event.name}>{event.short_name}</span>
                </SheetTitle>

                {/* Auth — always visible at top */}
                {isAuthenticated ? (
                  <button
                    onClick={() => { setMobileMenuOpen(false); router.push(dashboardHref) }}
                    className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold text-white hover:brightness-110 transition-all"
                    style={{ backgroundColor: event.primary_color }}
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
                      className="rounded-lg px-3 py-1.5 text-xs font-bold text-white hover:brightness-110 transition-all"
                      style={{ backgroundColor: event.primary_color }}
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

              {/* Primary flat nav — text only */}
              <nav className="flex flex-col gap-0.5 border-t border-stone-100 dark:border-zinc-800 p-3" aria-label="Menu utama">
                {mobilePrimary.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    onClick={() => setMobileMenuOpen(false)}
                    className="rounded-lg px-4 py-3 text-[15px] font-semibold text-stone-700 dark:text-zinc-200 transition-colors hover:bg-stone-50 dark:hover:bg-zinc-800"
                  >
                    {link.label}
                  </Link>
                ))}

                {/* Lainnya collapsible */}
                <button
                  type="button"
                  onClick={() => setMobileMoreOpen((v) => !v)}
                  aria-expanded={mobileMoreOpen}
                  aria-controls="mobile-more-panel"
                  className="flex items-center justify-between rounded-lg px-4 py-3 text-[15px] font-semibold text-stone-700 dark:text-zinc-200 transition-colors hover:bg-stone-50 dark:hover:bg-zinc-800"
                >
                  <span>Lainnya</span>
                  <CaretRight
                    size={14}
                    weight="bold"
                    className={cn('transition-transform', mobileMoreOpen && 'rotate-90')}
                  />
                </button>
                {mobileMoreOpen && (
                  <div id="mobile-more-panel" className="ml-3 flex flex-col gap-0.5 border-l border-stone-200 dark:border-zinc-700 pl-2">
                    {mobileMore.map((link) => (
                      <Link
                        key={link.href}
                        href={link.href}
                        onClick={() => setMobileMenuOpen(false)}
                        className={cn(
                          'rounded-lg px-4 py-2.5 text-sm font-medium transition-colors hover:bg-stone-50 dark:hover:bg-zinc-800',
                          link.label === 'Live Match'
                            ? 'text-red-500'
                            : 'text-stone-600 dark:text-zinc-400',
                        )}
                      >
                        <span className="inline-flex items-center gap-2">
                          {link.label}
                          {link.label === 'Live Match' && (
                            <span className="relative flex h-2 w-2">
                              <span className="absolute h-full w-full animate-ping rounded-full bg-red-500 opacity-60" />
                              <span className="relative h-2 w-2 rounded-full bg-red-500" />
                            </span>
                          )}
                        </span>
                      </Link>
                    ))}
                  </div>
                )}
              </nav>
            </div>
          </SheetContent>
        </Sheet>
        </div>
      </div>
    </header>
  )
}
