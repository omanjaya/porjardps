'use client'

import { useEffect, useState, useCallback } from 'react'
import { DownloadSimple, X } from '@phosphor-icons/react'

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

const DISMISS_KEY = 'porjar-install-dismissed'

export function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [show, setShow] = useState(false)

  useEffect(() => {
    // Check if already dismissed
    const dismissed = localStorage.getItem(DISMISS_KEY)
    if (dismissed) return

    const handler = (e: Event) => {
      e.preventDefault()
      setDeferredPrompt(e as BeforeInstallPromptEvent)
      setShow(true)
    }

    window.addEventListener('beforeinstallprompt', handler)

    return () => {
      window.removeEventListener('beforeinstallprompt', handler)
    }
  }, [])

  const handleInstall = useCallback(async () => {
    if (!deferredPrompt) return

    await deferredPrompt.prompt()
    const { outcome } = await deferredPrompt.userChoice

    if (outcome === 'accepted') {
      setShow(false)
    }

    setDeferredPrompt(null)
  }, [deferredPrompt])

  const handleDismiss = useCallback(() => {
    setShow(false)
    setDeferredPrompt(null)
    localStorage.setItem(DISMISS_KEY, '1')
  }, [])

  if (!show) return null

  return (
    <div className="fixed bottom-4 left-4 right-4 z-50 mx-auto max-w-md animate-in slide-in-from-bottom-4 duration-300">
      <div className="flex items-center gap-3 rounded-xl border border-stone-200 bg-white/95 p-4 shadow-xl backdrop-blur-sm">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-red-50">
          <DownloadSimple size={22} weight="duotone" className="text-porjar-red" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-stone-800">
            Pasang PORJAR di HP kamu
          </p>
          <p className="text-xs text-stone-500">
            Akses lebih cepat tanpa buka browser
          </p>
        </div>
        <button
          onClick={handleInstall}
          className="shrink-0 rounded-lg bg-porjar-red px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-red-700"
        >
          Install
        </button>
        <button
          onClick={handleDismiss}
          className="shrink-0 rounded-lg p-1.5 text-stone-400 transition-colors hover:bg-stone-100 hover:text-stone-600"
          aria-label="Tutup"
        >
          <X size={16} />
        </button>
      </div>
    </div>
  )
}
