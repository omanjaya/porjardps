'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { usePathname, useRouter } from 'next/navigation'
import {
  Trophy,
  House,
  GameController,
  Users,
  CalendarBlank,
  GearSix,
  SignOut,
  List as ListIcon,
  Lightning,
  ClockCounterClockwise,
  ChartLineUp,
  CheckCircle,
  UploadSimple,
  WebhooksLogo,
  GraduationCap,
  BookOpen,
} from '@phosphor-icons/react'
import { Button } from '@/components/ui/button'
import { useAuthStore } from '@/store/auth-store'
import { cn } from '@/lib/utils'
import { NotificationBell } from '@/components/shared/NotificationBell'
import type { Icon } from '@phosphor-icons/react'

interface NavItem {
  label: string
  href: string
  icon: Icon
}

const navItems: NavItem[] = [
  { label: 'Dashboard', href: '/admin', icon: House },
  { label: 'Analitik', href: '/admin/analytics', icon: ChartLineUp },
  { label: 'Turnamen', href: '/admin/tournaments', icon: Trophy },
  { label: 'Aturan', href: '/admin/rules', icon: BookOpen },
  { label: 'Tim', href: '/admin/teams', icon: Users },
  { label: 'Jadwal', href: '/admin/schedules', icon: CalendarBlank },
  { label: 'Sekolah', href: '/admin/schools', icon: GraduationCap },
  { label: 'Pengguna', href: '/admin/users', icon: Users },
  { label: 'Verifikasi', href: '/admin/submissions', icon: CheckCircle },
  { label: 'Import Peserta', href: '/admin/import', icon: UploadSimple },
  { label: 'Log Aktivitas', href: '/admin/activity', icon: ClockCounterClockwise },
  { label: 'Live Score', href: '/admin/live', icon: Lightning },
  { label: 'Webhooks', href: '/admin/webhooks', icon: WebhooksLogo },
  { label: 'Pengaturan', href: '/admin/settings', icon: GearSix },
]

interface AdminLayoutProps {
  children: React.ReactNode
}

export function AdminLayout({ children }: AdminLayoutProps) {
  const pathname = usePathname()
  const router = useRouter()
  const { user, isAuthenticated, isLoading, fetchMe, logout } = useAuthStore()
  const [sidebarOpen, setSidebarOpen] = useState(false)

  // Auth guard: restore session on mount
  useEffect(() => {
    fetchMe()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Redirect if not authenticated after loading completes
  useEffect(() => {
    if (isLoading) return
    if (!isAuthenticated) {
      router.push('/login')
      return
    }
    if (user && user.role !== 'admin' && user.role !== 'superadmin') {
      router.push('/')
    }
  }, [isAuthenticated, isLoading, user, router])

  // Auto-close sidebar on route change
  useEffect(() => {
    setSidebarOpen(false)
  }, [pathname])

  async function handleLogout() {
    await logout()
    router.push('/')
  }

  // Show loading while checking auth
  if (isLoading || !isAuthenticated || (user && user.role !== 'admin' && user.role !== 'superadmin')) {
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
    <div className="flex min-h-[100dvh] bg-porjar-bg">
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
          'fixed inset-y-0 left-0 z-50 flex w-60 flex-col border-r border-porjar-border bg-white transition-transform duration-300 ease-in-out lg:sticky lg:top-0 lg:h-screen lg:translate-x-0',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        {/* Logo */}
        <div className="flex h-14 items-center gap-1.5 border-b border-porjar-border px-4">
          <Image src="/images/logo/kota-denpasar.webp" alt="Kota Denpasar" width={28} height={28} className="h-7 w-7 object-contain" />
          <Image src="/images/logo/esi-denpasar.webp" alt="ESI Denpasar" width={28} height={28} className="h-7 w-7 object-contain" />
          <span className="ml-1 text-base font-bold text-porjar-text">PORJAR</span>
          <span className="ml-auto -skew-x-2 rounded bg-porjar-red px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">
            Admin
          </span>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto space-y-1 p-3">
          {navItems.map((item) => {
            const isActive =
              item.href === '/admin'
                ? pathname === '/admin'
                : pathname.startsWith(item.href)
            const IconComp = item.icon

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setSidebarOpen(false)}
                className={cn(
                  'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-200',
                  isActive
                    ? 'border-l-3 border-porjar-red bg-red-50 text-porjar-red'
                    : 'text-porjar-muted hover:bg-porjar-bg hover:text-porjar-text'
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
      <div className="flex flex-1 flex-col">
        {/* Top navbar */}
        <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-porjar-border bg-white px-4">
          <button
            onClick={() => setSidebarOpen(true)}
            className="rounded-lg p-2.5 w-10 h-10 inline-flex items-center justify-center text-porjar-muted hover:bg-porjar-bg hover:text-porjar-text lg:hidden"
          >
            <ListIcon size={24} />
          </button>
          <div className="ml-auto flex items-center gap-3">
            <NotificationBell />
            <span className="text-sm text-porjar-muted">{user?.full_name ?? 'Admin'}</span>
            <Button
              variant="ghost"
              size="sm"
              className="text-porjar-muted hover:text-porjar-red hover:bg-porjar-red/5"
              onClick={handleLogout}
            >
              <SignOut size={18} />
              <span className="hidden sm:inline ml-1">Logout</span>
            </Button>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 p-6">{children}</main>
      </div>
    </div>
  )
}
