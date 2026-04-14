'use client'

import { Navbar } from '@/components/shared/Navbar'
import { FooterCredit } from '@/components/shared/FooterCredit'

interface PublicLayoutProps {
  children: React.ReactNode
}

export function PublicLayout({ children }: PublicLayoutProps) {
  return (
    <div className="min-h-[100dvh] bg-esi-bg flex flex-col">
      <Navbar position="sticky" />

      {/* Main Content */}
      <main className="flex-1">
        <div className="mx-auto max-w-7xl px-4 py-6">{children}</div>
      </main>

      {/* Footer */}
      <footer className="border-t border-esi-border bg-white dark:bg-zinc-900 py-5">
        <div className="mx-auto max-w-7xl px-4 text-center text-sm text-esi-muted">
          <p>Panitia ESI Denpasar 2026 &middot; Dinas Pemuda dan Olahraga Kota Denpasar</p>
          <FooterCredit />
        </div>
      </footer>
    </div>
  )
}
