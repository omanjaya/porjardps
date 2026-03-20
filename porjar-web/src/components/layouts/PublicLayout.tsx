'use client'

import { Navbar } from '@/components/shared/Navbar'

interface PublicLayoutProps {
  children: React.ReactNode
}

export function PublicLayout({ children }: PublicLayoutProps) {
  return (
    <div className="min-h-[100dvh] bg-porjar-bg flex flex-col">
      <Navbar position="sticky" />

      {/* Main Content */}
      <main className="flex-1">
        <div className="mx-auto max-w-7xl px-4 py-6">{children}</div>
      </main>

      {/* Footer */}
      <footer className="border-t border-porjar-border bg-white py-6">
        <div className="mx-auto max-w-7xl px-4 text-center text-sm text-porjar-muted">
          <p>Panitia Porjar Denpasar 2026 &middot; Dinas Pemuda dan Olahraga Kota Denpasar</p>
          <p className="mt-1">
            Dibuat oleh{' '}
            <a href="https://instagram.com/omanjayaaa" target="_blank" rel="noopener noreferrer" className="text-porjar-red hover:underline">
              @omanjayaaa
            </a>
          </p>
        </div>
      </footer>
    </div>
  )
}
