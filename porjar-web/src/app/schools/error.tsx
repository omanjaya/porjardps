'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import { WarningCircle, ArrowLeft, ArrowClockwise } from '@phosphor-icons/react'

export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <div className="flex flex-col items-center justify-center py-20 px-4 text-center">
      <WarningCircle size={48} weight="duotone" className="mb-4 text-esi-red" />
      <h2 className="text-lg font-bold text-stone-900 dark:text-zinc-100 mb-2">Terjadi Kesalahan</h2>
      <p className="text-sm text-stone-500 dark:text-zinc-400 mb-6 max-w-md">
        Halaman ini mengalami masalah. Coba muat ulang atau kembali ke halaman sebelumnya.
      </p>
      <div className="flex gap-3">
        <button
          onClick={reset}
          className="inline-flex items-center gap-1.5 rounded-lg bg-esi-red px-4 py-2 text-sm font-semibold text-white hover:brightness-110 transition"
        >
          <ArrowClockwise size={16} /> Muat Ulang
        </button>
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 rounded-lg border border-stone-300 dark:border-zinc-600 px-4 py-2 text-sm font-semibold text-stone-700 dark:text-zinc-300 hover:bg-stone-100 dark:hover:bg-zinc-800 transition"
        >
          <ArrowLeft size={16} /> Beranda
        </Link>
      </div>
    </div>
  )
}
