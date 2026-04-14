'use client'

import { Heart } from '@phosphor-icons/react'

export function FooterCredit() {
  return (
    <p className="flex items-center justify-center gap-1.5 text-[11px] text-stone-500 dark:text-zinc-500 mt-1">
      Built with
      <Heart
        size={12}
        weight="fill"
        className="text-esi-red animate-pulse"
      />
      by{' '}
      <a
        href="https://instagram.com/omanjayaaa"
        target="_blank"
        rel="noopener noreferrer"
        className="font-semibold text-esi-red hover:underline transition-colors"
      >
        @omanjayaaa
      </a>
    </p>
  )
}
