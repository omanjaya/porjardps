'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { usePathname, useRouter } from 'next/navigation'
import {
  SignOut,
  List as ListIcon,
  Moon,
  Sun,
} from '@phosphor-icons/react'
import { Button } from '@/components/ui/button'
import { useAuthStore } from '@/store/auth-store'
import { useThemeStore, useThemeHydrated } from '@/store/theme-store'
import { cn } from '@/lib/utils'
import { NotificationBell } from '@/components/shared/NotificationBell'
import { ForcePasswordChange } from '@/components/shared/ForcePasswordChange'
import { OfflineIndicator } from '@/components/shared/OfflineIndicator'
import { CommandPalette } from '@/components/shared/CommandPalette'
import type { LayoutConfig } from './configs/types'

interface BaseLayoutProps {
  config: LayoutConfig
  children: React.ReactNode
}

export function BaseLayout({ config, children }: BaseLayoutProps) {
  const pathname = usePathname()
  const router = useRouter()
  const { user, isAuthenticated, isLoading, fetchMe, logout } = useAuthStore()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const { isDark, toggle: toggleTheme } = useThemeStore()
  const themeMounted = useThemeHydrated()

  const { baseHref, navItems, bottomNavItems, allowedRoles, roleLabel, defaultUserLabel } = config

  // Auth guard: restore session on mount
  useEffect(() => {
    fetchMe().catch(() => {})
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Redirect if not authenticated / role not allowed
  useEffect(() => {
    if (isLoading) return
    if (!isAuthenticated) {
      router.push('/login')
      return
    }
    if (allowedRoles.length > 0 && user && !allowedRoles.includes(user.role)) {
      router.push('/')
    }
  }, [isAuthenticated, isLoading, user, router, allowedRoles])

  // Auto-close sidebar on route change
  useEffect(() => {
    setSidebarOpen(false)
  }, [pathname])

  async function handleLogout() {
    await logout()
    router.push('/')
  }

  const roleBlocked =
    allowedRoles.length > 0 && user && !allowedRoles.includes(user.role)

  if (isLoading || !isAuthenticated || roleBlocked) {
    return (
      <div className="flex min-h-[100dvh] items-center justify-center bg-esi-bg">
        <div className="text-center">
          <div className="mx-auto mb-3 h-8 w-8 animate-spin rounded-full border-2 border-stone-300 border-t-esi-red" />
          <p className="text-sm text-stone-500 dark:text-zinc-400">Memuat...</p>
        </div>
      </div>
    )
  }

  const isItemActive = (href: string) =>
    href === baseHref ? pathname === baseHref : pathname.startsWith(href)

  const hasBottomNav = !!bottomNavItems && bottomNavItems.length > 0

  return (
    <div className="flex min-h-[100dvh] bg-esi-bg">
      {/* Offline indicator (PWA) */}
      <OfflineIndicator />

      {/* Global command palette (Ctrl/Cmd+K) */}
      <CommandPalette />

      {/* Force password change modal */}
      {user?.needs_password_change && <ForcePasswordChange />}

      {/* Mobile overlay */}
      <div
        className={cn(
          'fixed inset-0 z-40 bg-black/30 transition-opacity duration-300 lg:hidden',
          sidebarOpen ? 'opacity-100' : 'pointer-events-none opacity-0'
        )}
        onClick={() => setSidebarOpen(false)}
      />

      {/* Sidebar */}
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-50 flex w-60 flex-col border-r border-esi-border bg-white dark:bg-zinc-900 transition-transform duration-300 ease-in-out lg:sticky lg:top-0 lg:h-screen lg:translate-x-0',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        {/* Logo */}
        <div className="flex h-14 items-center gap-1.5 border-b border-esi-border px-4">
          <Image src="/images/logo/kota-denpasar.webp" alt="Kota Denpasar" width={28} height={28} className="h-7 w-7 object-contain" />
          <Image src="/images/logo/esi-denpasar.webp" alt="ESI Denpasar" width={28} height={28} className="h-7 w-7 object-contain" />
          <span className="ml-1 text-base font-bold text-esi-text">ESI</span>
          <span className="ml-auto -skew-x-2 rounded bg-esi-red px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">
            {roleLabel}
          </span>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto space-y-1 p-3">
          {navItems.map((item) => {
            const isActive = isItemActive(item.href)
            const IconComp = item.icon

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setSidebarOpen(false)}
                className={cn(
                  'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-200',
                  isActive
                    ? 'border-l-3 border-esi-red bg-red-50 dark:bg-red-950 text-esi-red'
                    : 'text-esi-muted hover:bg-esi-bg hover:text-esi-text'
                )}
              >
                <IconComp size={20} weight={isActive ? 'fill' : 'regular'} />
                {item.label}
              </Link>
            )
          })}
        </nav>
      </aside>

      {/* Main area */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Top navbar */}
        <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-esi-border bg-white dark:bg-zinc-900 px-3 sm:px-4">
          {/* Mobile logo (player layout had this; harmless for others) */}
          {hasBottomNav && (
            <div className="flex items-center gap-1.5 lg:hidden">
              <Image src="/images/logo/kota-denpasar.webp" alt="Kota Denpasar" width={24} height={24} className="h-6 w-6 object-contain" />
              <Image src="/images/logo/esi-denpasar.webp" alt="ESI Denpasar" width={24} height={24} className="h-6 w-6 object-contain" />
              <span className="text-sm font-bold text-esi-text">ESI</span>
            </div>
          )}
          <button
            onClick={() => setSidebarOpen(true)}
            className={cn(
              'rounded-lg p-2.5 w-10 h-10 items-center justify-center text-esi-muted hover:bg-esi-bg hover:text-esi-text lg:hidden',
              hasBottomNav
                ? 'hidden md:inline-flex'
                : 'inline-flex'
            )}
          >
            <ListIcon size={24} />
          </button>
          <div className="ml-auto flex items-center gap-2 sm:gap-3 min-w-0">
            <button
              onClick={toggleTheme}
              className="rounded-lg p-2 text-stone-500 dark:text-zinc-400 transition-colors hover:bg-stone-100 dark:hover:bg-zinc-800 hover:text-stone-800 dark:hover:text-zinc-100"
              aria-label={isDark ? 'Mode terang' : 'Mode gelap'}
            >
              {themeMounted ? (isDark ? <Sun size={18} /> : <Moon size={18} />) : <Moon size={18} />}
            </button>
            <NotificationBell />
            <span className="hidden sm:inline text-sm text-esi-muted truncate">
              {user?.full_name ?? defaultUserLabel}
            </span>
            <Button
              variant="ghost"
              size="sm"
              className="shrink-0 text-esi-muted hover:text-esi-red hover:bg-esi-red/5"
              onClick={handleLogout}
            >
              <SignOut size={18} />
              <span className="hidden sm:inline ml-1">Logout</span>
            </Button>
          </div>
        </header>

        {/* Content */}
        <main
          className={cn(
            'flex-1 p-4 sm:p-6',
            hasBottomNav && 'overflow-x-hidden pb-20 lg:pb-6'
          )}
        >
          {hasBottomNav ? (
            <div key={pathname} className="animate-[fadeIn_0.3s_ease-out]">
              {children}
            </div>
          ) : (
            children
          )}
        </main>
      </div>

      {/* Mobile bottom navigation (opt-in) */}
      {hasBottomNav && (
        <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-esi-border bg-white dark:bg-zinc-900 pb-[env(safe-area-inset-bottom)] lg:hidden">
          <div className="flex items-center justify-around">
            {bottomNavItems!.map((item) => {
              const isActive = isItemActive(item.href)
              const IconComp = item.icon
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    'flex flex-1 flex-col items-center gap-0.5 py-2 transition-colors',
                    isActive ? 'text-esi-red' : 'text-stone-400'
                  )}
                >
                  <IconComp size={isActive ? 24 : 22} weight={isActive ? 'fill' : 'regular'} />
                  <span className="text-[10px] font-medium leading-tight">{item.label}</span>
                </Link>
              )
            })}
          </div>
        </nav>
      )}
    </div>
  )
}
