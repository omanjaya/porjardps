'use client'

import { useEffect, useState } from 'react'
import { BellSimple, BellSimpleSlash } from '@phosphor-icons/react'
import { api } from '@/lib/api'

function urlBase64ToUint8Array(base64String: string): Uint8Array<ArrayBuffer> {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = window.atob(base64)
  const buf = new ArrayBuffer(rawData.length)
  const view = new Uint8Array(buf)
  for (let i = 0; i < rawData.length; i++) view[i] = rawData.charCodeAt(i)
  return view
}

export function PushNotifyButton() {
  const [supported, setSupported] = useState(false)
  const [subscribed, setSubscribed] = useState(false)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!('Notification' in window) || !('serviceWorker' in navigator)) return
    setSupported(true)
    checkSubscription()
  }, [])

  async function checkSubscription() {
    try {
      const reg = await navigator.serviceWorker.getRegistration('/sw.js')
      if (!reg) return
      const sub = await reg.pushManager.getSubscription()
      setSubscribed(!!sub)
    } catch { /* ignore */ }
  }

  async function toggle() {
    if (loading) return
    setLoading(true)
    try {
      if (subscribed) {
        await unsubscribe()
      } else {
        await subscribe()
      }
    } finally {
      setLoading(false)
    }
  }

  async function subscribe() {
    const permission = await Notification.requestPermission()
    if (permission !== 'granted') return

    // Register SW if not already
    let reg = await navigator.serviceWorker.getRegistration('/sw.js')
    if (!reg) reg = await navigator.serviceWorker.register('/sw.js')
    await navigator.serviceWorker.ready

    const keyData = await api.get<{ public_key: string }>('/push/vapid-public-key')
    const applicationServerKey = urlBase64ToUint8Array(keyData!.public_key)
    const sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey })
    const json = sub.toJSON()
    await api.post('/push/subscribe', {
      endpoint: json.endpoint,
      keys: json.keys,
    })
    setSubscribed(true)
  }

  async function unsubscribe() {
    const reg = await navigator.serviceWorker.getRegistration('/sw.js')
    if (!reg) return
    const sub = await reg.pushManager.getSubscription()
    if (sub) {
      await api.delete('/push/subscribe', { endpoint: sub.endpoint })
      await sub.unsubscribe()
    }
    setSubscribed(false)
  }

  if (!supported) return null

  return (
    <button
      onClick={toggle}
      disabled={loading}
      title={subscribed ? 'Matikan notifikasi hasil pertandingan' : 'Aktifkan notifikasi hasil pertandingan'}
      aria-label={subscribed ? 'Matikan notifikasi' : 'Aktifkan notifikasi'}
      className="rounded-lg p-2 text-stone-500 dark:text-zinc-400 transition-colors hover:bg-stone-100 dark:hover:bg-zinc-800 hover:text-stone-800 dark:hover:text-zinc-100 disabled:opacity-50"
    >
      {subscribed
        ? <BellSimple size={18} weight="fill" className="text-esi-red" />
        : <BellSimple size={18} />
      }
    </button>
  )
}
