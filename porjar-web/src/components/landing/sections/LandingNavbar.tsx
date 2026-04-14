'use client'

import { useMemo } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { Moon, Sun } from '@phosphor-icons/react'
import { useThemeStore, useThemeHydrated } from '@/store/theme-store'
import type { Event } from '@/types'
import { RED } from '../constants'

interface LandingNavbarProps {
  activeEvent?: Event | null
}

export function LandingNavbar({ activeEvent = null }: LandingNavbarProps = {}) {
  const { isDark, toggle: toggleTheme } = useThemeStore()
  const themeMounted = useThemeHydrated()

  const NAV_ITEMS = useMemo(() => [
    { href: '/events', label: 'Event' },
    { href: '/cara-bertanding', label: 'Cara Bertanding' },
    { href: '#about', label: 'Tentang' },
  ], [])

  return (
    <header className="fixed top-0 z-50 w-full border-b border-black/5 bg-stone-50/85 dark:bg-zinc-950/85 backdrop-blur-xl">
      <div className="mx-auto flex h-18 max-w-7xl items-center justify-between px-5 sm:px-6 lg:px-8">
        <Link href="/" className="flex items-center gap-2">
          <Image src="/images/logo/kota-denpasar.webp" alt="Kota Denpasar" width={36} height={36} className="h-9 w-9 object-contain" />
          <Image src="/images/logo/esi-denpasar.webp" alt="ESI Denpasar" width={36} height={36} className="h-9 w-9 object-contain" />
          <div className="ml-1 flex flex-col leading-none">
            <span className="text-base font-black tracking-tight" style={{ color: RED }}>ESI</span>
            <span className="text-[10px] font-medium text-stone-500 tracking-wider">KOTA DENPASAR</span>
          </div>
        </Link>
        <nav className="flex items-center gap-1">
          {NAV_ITEMS.map(item => (
            <Link key={item.href} href={item.href} className="px-4 py-2 text-sm font-semibold text-stone-600 dark:text-zinc-400 rounded-lg transition hover:bg-stone-100 dark:hover:bg-zinc-800 hover:text-stone-900 dark:hover:text-zinc-100">
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="flex items-center gap-2">
          <button
            onClick={toggleTheme}
            aria-label="Toggle dark mode"
            className="rounded-lg p-2 text-stone-500 dark:text-zinc-400 transition-colors hover:bg-stone-100 dark:hover:bg-zinc-800"
          >
            {themeMounted ? (isDark ? <Sun size={18} /> : <Moon size={18} />) : <Moon size={18} />}
          </button>
          <Link href="/login" className="text-sm font-medium text-stone-600 border border-stone-300 dark:border-zinc-600 rounded-lg px-4 py-2 transition hover:bg-stone-100 hover:text-stone-800 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-200 hidden sm:block">
            Masuk
          </Link>
          <Link href="/register" className="rounded-lg px-4 py-2 text-sm font-bold text-white transition hover:brightness-110" style={{ background: RED }}>
            Daftar
          </Link>
        </div>
      </div>
    </header>
  )
}
