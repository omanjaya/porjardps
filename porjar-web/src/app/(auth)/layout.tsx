import Link from 'next/link'
import Image from 'next/image'

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative flex min-h-[100dvh] items-center justify-center bg-gradient-to-br from-stone-50 via-white to-red-50/20 dark:from-zinc-950 dark:via-zinc-900 dark:to-red-950/10 px-4 py-12 overflow-hidden">
      {/* Decorative floating elements */}
      <div className="pointer-events-none absolute -top-24 -right-24 h-72 w-72 rounded-full bg-red-400/10 blur-3xl dark:bg-red-500/5" />
      <div className="pointer-events-none absolute -bottom-32 -left-32 h-80 w-80 rounded-full bg-stone-300/20 blur-3xl dark:bg-zinc-700/10" />
      <div className="pointer-events-none absolute top-1/3 right-1/4 h-48 w-48 rounded-full bg-red-300/5 blur-2xl dark:bg-red-600/5" />

      <div className="relative z-10 w-full max-w-md">
        {/* Logo */}
        <Link href="/" className="mb-8 flex flex-col items-center gap-3 transition-opacity hover:opacity-80">
          <div className="flex items-center gap-2">
            <Image src="/images/logo/kota-denpasar.webp" alt="Kota Denpasar" width={56} height={56} className="h-14 w-14 object-contain" />
            <Image src="/images/logo/esi-denpasar.webp" alt="ESI Denpasar" width={56} height={56} className="h-14 w-14 object-contain" />
          </div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold uppercase tracking-wide text-esi-text">ESI</h1>
            <span className="inline-block -skew-x-2 rounded bg-esi-red px-2.5 py-0.5 text-sm font-bold uppercase tracking-wide text-white">
              ESPORT
            </span>
          </div>
          <p className="text-sm text-esi-muted">Pekan Olahraga Pelajar Kota Denpasar</p>
        </Link>

        {/* Content */}
        {children}
      </div>
    </div>
  )
}
