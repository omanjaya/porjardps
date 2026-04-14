import { api } from '@/lib/api'

/**
 * Push notification utilities.
 * Entire module is a no-op when VAPID key is not configured on the backend
 * or when the browser doesn't support Push API.
 */

const OPTOUT_KEY = 'push_optout_until'

function urlBase64ToUint8Array(base64String: string): Uint8Array<ArrayBuffer> {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const raw = atob(base64)
  const buf = new ArrayBuffer(raw.length)
  const view = new Uint8Array(buf)
  for (let i = 0; i < raw.length; i++) view[i] = raw.charCodeAt(i)
  return view
}

/** Check whether the browser supports push notifications */
export function isPushSupported(): boolean {
  return (
    typeof window !== 'undefined' &&
    'Notification' in window &&
    'serviceWorker' in navigator &&
    'PushManager' in window
  )
}

/** Request notification permission. Returns true if granted. */
export async function requestPushPermission(): Promise<boolean> {
  if (!isPushSupported()) return false
  const perm = await Notification.requestPermission()
  return perm === 'granted'
}

/** Fetch the VAPID public key from the backend. Returns null if not configured. */
export async function getVapidKey(): Promise<string | null> {
  try {
    const data = await api.get<{ public_key: string }>('/push/vapid-public-key')
    return data?.public_key || null
  } catch {
    return null
  }
}

/** Subscribe the current browser to push and register with the backend. */
export async function subscribeToPush(): Promise<PushSubscription | null> {
  if (!isPushSupported()) return null

  const vapidKey = await getVapidKey()
  if (!vapidKey) return null

  const reg = await navigator.serviceWorker.ready
  const applicationServerKey = urlBase64ToUint8Array(vapidKey)

  let sub = await reg.pushManager.getSubscription()
  if (!sub) {
    sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey,
    })
  }

  const json = sub.toJSON()
  await api
    .post('/push/subscribe', {
      endpoint: json.endpoint,
      keys: json.keys,
    })
    .catch(() => null)

  return sub
}

/** Unsubscribe from push and notify the backend. */
export async function unsubscribeFromPush(): Promise<void> {
  if (!isPushSupported()) return
  try {
    const reg = await navigator.serviceWorker.ready
    const sub = await reg.pushManager.getSubscription()
    if (!sub) return
    await api.delete('/push/subscribe', { endpoint: sub.endpoint }).catch(() => null)
    await sub.unsubscribe()
  } catch {
    // ignore
  }
}

/** Check whether the browser has an active push subscription. */
export async function isSubscribed(): Promise<boolean> {
  if (!isPushSupported()) return false
  try {
    const reg = await navigator.serviceWorker.ready
    const sub = await reg.pushManager.getSubscription()
    return !!sub
  } catch {
    return false
  }
}

/** User chose "later" — suppress opt-in for 7 days. */
export function dismissOptIn(): void {
  const until = Date.now() + 7 * 24 * 60 * 60 * 1000
  localStorage.setItem(OPTOUT_KEY, String(until))
}

/** Whether the opt-in banner should be shown (not dismissed recently). */
export function isOptInDismissed(): boolean {
  try {
    const until = localStorage.getItem(OPTOUT_KEY)
    if (!until) return false
    return Date.now() < Number(until)
  } catch {
    return false
  }
}
