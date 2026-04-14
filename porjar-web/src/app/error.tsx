'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import { Warning, House, ArrowClockwise } from '@phosphor-icons/react'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    // eslint-disable-next-line no-console
    console.error('App error boundary:', error)
  }, [error])

  return (
    <div className="min-h-screen flex flex-col bg-stone-50 dark:bg-zinc-950">
      <main className="flex-1 flex items-center justify-center px-5 sm:px-6 py-16 sm:py-24">
        <div className="w-full max-w-xl text-center">
          <div className="inline-flex items-center justify-center mb-6 h-16 w-16 rounded-full bg-esi-red/10 text-esi-red">
            <Warning size={36} weight="duotone" />
          </div>
          <h1 className="text-5xl sm:text-6xl font-black tracking-tight text-esi-red leading-none">
            Oops
          </h1>
          <h2 className="mt-4 text-2xl sm:text-3xl font-bold text-stone-900 dark:text-zinc-100">
            Terjadi kesalahan
          </h2>
          <p className="mt-3 text-base sm:text-lg text-stone-600 dark:text-zinc-400">
            Terjadi kesalahan. Tim kami sudah diberitahu.
          </p>
          {error?.digest && (
            <p className="mt-2 text-xs font-mono text-stone-400 dark:text-zinc-600">
              Ref: {error.digest}
            </p>
          )}

          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
            <button
              type="button"
              onClick={() => reset()}
              className="inline-flex items-center gap-2 rounded-lg bg-esi-red px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-esi-red/90 focus:outline-none focus:ring-2 focus:ring-esi-red focus:ring-offset-2 dark:focus:ring-offset-zinc-950"
            >
              <ArrowClockwise size={18} weight="bold" />
              Muat Ulang
            </button>
            <Link
              href="/"
              className="inline-flex items-center gap-2 rounded-lg border border-stone-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-5 py-3 text-sm font-semibold text-stone-900 dark:text-zinc-100 shadow-sm transition hover:bg-stone-100 dark:hover:bg-zinc-800"
            >
              <House size={18} weight="bold" />
              Kembali ke Beranda
            </Link>
          </div>
        </div>
      </main>
    </div>
  )
}
