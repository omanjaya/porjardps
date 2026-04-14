'use client'

import { X } from '@phosphor-icons/react'

export function SubmissionLightbox({
  url,
  onClose,
  zIndex = 100,
}: {
  url: string | null
  onClose: () => void
  zIndex?: number
}) {
  if (!url) return null
  const zClass = zIndex >= 200 ? 'z-[200]' : 'z-[100]'
  return (
    <div
      className={`fixed inset-0 ${zClass} flex items-center justify-center bg-black/80 p-4`}
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Screenshot preview"
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={url} alt="Submission screenshot preview" className="max-h-[85vh] max-w-[90vw] rounded-lg object-contain" />
      <button
        onClick={onClose}
        aria-label="Close preview"
        className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-full bg-white dark:bg-zinc-800 text-esi-text shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
      >
        <X size={16} />
      </button>
    </div>
  )
}
