'use client'

import { useEffect, useState, useCallback } from 'react'
import { BellSimple, X } from '@phosphor-icons/react'
import { toast } from 'sonner'
import {
  isPushSupported,
  isSubscribed,
  isOptInDismissed,
  dismissOptIn,
  requestPushPermission,
  subscribeToPush,
  getVapidKey,
} from '@/lib/pushNotifications'

/**
 * Push notification opt-in banner.
 * Renders only when:
 * - Browser supports push
 * - Backend has VAPID key configured
 * - User hasn't subscribed yet
 * - User hasn't dismissed within the last 7 days
 * - Notification permission isn't denied
 */
export function PushOptIn() {
  const [show, setShow] = useState(false)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    let cancelled = false

    async function check() {
      // Basic browser checks
      if (!isPushSupported()) return
      if (isOptInDismissed()) return
      if (Notification.permission === 'denied') return

      // Already subscribed?
      if (await isSubscribed()) return

      // Backend has VAPID configured?
      const key = await getVapidKey()
      if (!key) return

      if (!cancelled) setShow(true)
    }

    check()
    return () => { cancelled = true }
  }, [])

  const handleActivate = useCallback(async () => {
    setLoading(true)
    try {
      const granted = await requestPushPermission()
      if (!granted) {
        toast.error('Izin notifikasi ditolak. Aktifkan lewat pengaturan browser.')
        setShow(false)
        return
      }

      const sub = await subscribeToPush()
      if (sub) {
        toast.success('Notifikasi diaktifkan')
        setShow(false)
      } else {
        toast.error('Gagal mengaktifkan notifikasi')
      }
    } catch {
      toast.error('Gagal mengaktifkan notifikasi')
    } finally {
      setLoading(false)
    }
  }, [])

  const handleDismiss = useCallback(() => {
    dismissOptIn()
    setShow(false)
  }, [])

  if (!show) return null

  return (
    <div className="rounded-xl border border-blue-200 dark:border-blue-800/50 bg-blue-50/80 dark:bg-blue-950/30 p-4 shadow-sm">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-100 dark:bg-blue-900/50">
          <BellSimple size={20} weight="duotone" className="text-blue-600 dark:text-blue-400" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-stone-800 dark:text-zinc-100">
            Aktifkan notifikasi
          </p>
          <p className="text-xs text-stone-500 dark:text-zinc-400">
            Agar tidak ketinggalan jadwal dan hasil match
          </p>
        </div>
        <button
          onClick={handleActivate}
          disabled={loading}
          className="shrink-0 rounded-lg bg-esi-red px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-red-700 disabled:opacity-50"
        >
          {loading ? 'Memproses...' : 'Aktifkan'}
        </button>
        <button
          onClick={handleDismiss}
          className="shrink-0 rounded-lg p-1.5 text-stone-400 dark:text-zinc-500 transition-colors hover:bg-stone-100 dark:hover:bg-zinc-800 hover:text-stone-600 dark:hover:text-zinc-300"
          aria-label="Nanti saja"
          title="Nanti saja"
        >
          <X size={16} />
        </button>
      </div>
    </div>
  )
}
