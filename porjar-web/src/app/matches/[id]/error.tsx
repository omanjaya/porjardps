'use client'

import { useEffect } from 'react'

export default function MatchError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('Match error:', error)
  }, [error])

  return (
    <div className="flex min-h-[60vh] items-center justify-center p-6">
      <div className="w-full max-w-md rounded-xl border border-porjar-border bg-white p-8 text-center shadow-sm">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-porjar-red/10">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="32"
            height="32"
            viewBox="0 0 256 256"
            className="text-porjar-red"
          >
            <path
              fill="currentColor"
              d="M128 24a104 104 0 1 0 104 104A104.11 104.11 0 0 0 128 24Zm-8 56a8 8 0 0 1 16 0v56a8 8 0 0 1-16 0Zm8 104a12 12 0 1 1 12-12a12 12 0 0 1-12 12Z"
            />
          </svg>
        </div>
        <h2 className="mb-2 text-lg font-bold text-porjar-text">
          Gagal Memuat Pertandingan
        </h2>
        <p className="mb-6 text-sm text-porjar-muted">
          Maaf, terjadi kesalahan saat memuat data pertandingan. Silakan coba
          lagi.
        </p>
        <button
          onClick={reset}
          className="inline-flex items-center justify-center rounded-lg bg-porjar-red px-6 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-porjar-red-dark"
        >
          Coba Lagi
        </button>
      </div>
    </div>
  )
}
