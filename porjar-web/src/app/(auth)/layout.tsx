import Link from 'next/link'
import Image from 'next/image'
import { Trophy } from '@phosphor-icons/react/dist/ssr'

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-[100dvh] items-center justify-center bg-porjar-bg px-4 py-12">
      <div className="w-full max-w-md">
        {/* Logo */}
        <Link href="/" className="mb-8 flex flex-col items-center gap-3 transition-opacity hover:opacity-80">
          <div className="flex items-center gap-2">
            <Image src="/images/logo/kota-denpasar.webp" alt="Kota Denpasar" width={56} height={56} className="h-14 w-14 object-contain" />
            <Image src="/images/logo/esi-denpasar.webp" alt="ESI Denpasar" width={56} height={56} className="h-14 w-14 object-contain" />
          </div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold uppercase tracking-wide text-porjar-text">PORJAR</h1>
            <span className="inline-block -skew-x-2 rounded bg-porjar-red px-2.5 py-0.5 text-sm font-bold uppercase tracking-wide text-white">
              ESPORT
            </span>
          </div>
          <p className="text-sm text-porjar-muted">Pekan Olahraga Pelajar Kota Denpasar</p>
        </Link>

        {/* Content */}
        {children}
      </div>
    </div>
  )
}
