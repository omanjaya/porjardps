'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { usePathname, useRouter } from 'next/navigation'
import { Sword, Upload, Users, Lock, SignOut, UserCircle } from '@phosphor-icons/react'
import { Button } from '@/components/ui/button'
import { useAuthStore } from '@/store/auth-store'
import { cn } from '@/lib/utils'
import { NotificationBell } from '@/components/shared/NotificationBell'
import { ForcePasswordChange } from '@/components/shared/ForcePasswordChange'

interface DashboardLayoutProps {
  children: React.ReactNode
}

const navLinks = [
  { label: 'Pertandingan', href: '/dashboard/my-matches', icon: Sword },
  { label: 'Kirim Bukti', href: '/dashboard/submit-result', icon: Upload },
  { label: 'Tim Saya', href: '/dashboard/teams', icon: Users },
  { label: 'Ubah Password', href: '/dashboard/change-password', icon: Lock },
]

export function DashboardLayout({ children }: DashboardLayoutProps) {
  const pathname = usePathname()
  const router = useRouter()
  const { user, isAuthenticated, isLoading, fetchMe, logout } = useAuthStore()

  // Auth guard: restore session on mount
  useEffect(() => {
    fetchMe()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Redirect if not authenticated after loading completes
  useEffect(() => {
    if (isLoading) return
    if (!isAuthenticated) {
      router.push('/login')
    }
  }, [isAuthenticated, isLoading, router])

  async function handleLogout() {
    await logout()
    router.push('/')
  }

  if (isLoading || !isAuthenticated) {
    return (
      <div className="flex min-h-[100dvh] items-center justify-center bg-porjar-bg">
        <div className="text-center">
          <div className="mx-auto mb-3 h-8 w-8 animate-spin rounded-full border-2 border-stone-300 border-t-porjar-red" />
          <p className="text-sm text-stone-500">Memuat...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-[100dvh] bg-porjar-bg flex flex-col">
      {/* Force password change modal */}
      {user?.needs_password_change && <ForcePasswordChange />}

      {/* Navbar */}
      <header className="sticky top-0 z-50 border-b border-porjar-border bg-white">
        <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4">
          <div className="flex items-center gap-6">
            <Link href="/" className="flex items-center gap-1.5 font-bold text-porjar-text">
              <Image src="/images/logo/kota-denpasar.webp" alt="Kota Denpasar" width={32} height={32} className="h-8 w-8 object-contain" />
              <Image src="/images/logo/esi-denpasar.webp" alt="ESI Denpasar" width={32} height={32} className="h-8 w-8 object-contain" />
              <span className="ml-1 text-lg">PORJAR</span>
              <span className="-skew-x-2 rounded bg-porjar-red px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">
                ESPORT
              </span>
            </Link>
            <nav className="hidden sm:flex items-center gap-1">
              {navLinks.map((link) => {
                const isActive =
                  link.href === '/dashboard'
                    ? pathname === '/dashboard'
                    : pathname.startsWith(link.href)
                const IconComp = link.icon

                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={cn(
                      'flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors',
                      isActive
                        ? 'bg-porjar-red/10 text-porjar-red'
                        : 'text-porjar-muted hover:text-porjar-red hover:bg-porjar-red/5'
                    )}
                  >
                    <IconComp size={18} weight={isActive ? 'fill' : 'regular'} />
                    <span className="hidden md:inline">{link.label}</span>
                  </Link>
                )
              })}
            </nav>
          </div>
          <div className="flex items-center gap-3">
            <NotificationBell />
            <span className="text-sm text-porjar-muted">{user?.full_name ?? 'Player'}</span>
            <Button
              variant="ghost"
              size="sm"
              className="text-porjar-muted hover:text-porjar-red hover:bg-porjar-red/5"
              onClick={handleLogout}
            >
              <SignOut size={18} />
            </Button>
          </div>
        </div>
      </header>

      {/* Mobile nav */}
      <div className="sm:hidden sticky top-14 z-40 border-b border-porjar-border bg-white">
        <nav className="mx-auto flex max-w-5xl items-center gap-1 overflow-x-auto px-4 py-1.5">
          {navLinks.map((link) => {
            const isActive =
              link.href === '/dashboard'
                ? pathname === '/dashboard'
                : pathname.startsWith(link.href)
            const IconComp = link.icon

            return (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  'flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors',
                  isActive
                    ? 'bg-porjar-red/10 text-porjar-red'
                    : 'text-porjar-muted hover:text-porjar-red hover:bg-porjar-red/5'
                )}
              >
                <IconComp size={16} weight={isActive ? 'fill' : 'regular'} />
                {link.label}
              </Link>
            )
          })}
        </nav>
      </div>

      {/* Content */}
      <main className="flex-1">
        <div className="mx-auto max-w-5xl px-4 py-6">{children}</div>
      </main>
    </div>
  )
}
