import { useCallback } from 'react'
import { api } from '@/lib/api'

function urlBase64ToUint8Array(base64String: string): Uint8Array<ArrayBuffer> {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = window.atob(base64)
  const buffer = new ArrayBuffer(rawData.length)
  const outputArray = new Uint8Array(buffer)
  for (let i = 0; i < rawData.length; ++i) outputArray[i] = rawData.charCodeAt(i)
  return outputArray
}

export function usePushNotification() {
  const subscribe = useCallback(async (): Promise<boolean> => {
    try {
      if (!('serviceWorker' in navigator) || !('PushManager' in window)) return false

      const registration = await navigator.serviceWorker.ready

      // Get VAPID public key
      const keyData = await api.get<{ public_key: string }>('/push/vapid-public-key')
      if (!keyData?.public_key) return false

      const applicationServerKey = urlBase64ToUint8Array(keyData.public_key)

      // Check existing subscription
      let subscription = await registration.pushManager.getSubscription()
      if (!subscription) {
        subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey,
        })
      }

      // Send to backend
      const subJson = subscription.toJSON()
      await api.post('/push/subscribe', {
        endpoint: subscription.endpoint,
        expirationTime: subscription.expirationTime,
        keys: {
          p256dh: subJson.keys?.p256dh ?? '',
          auth: subJson.keys?.auth ?? '',
        },
      })

      return true
    } catch (err) {
      console.error('Push subscribe error:', err)
      return false
    }
  }, [])

  const unsubscribe = useCallback(async (): Promise<void> => {
    try {
      if (!('serviceWorker' in navigator)) return
      const registration = await navigator.serviceWorker.ready
      const subscription = await registration.pushManager.getSubscription()
      if (!subscription) return
      await api.delete('/push/subscribe', { endpoint: subscription.endpoint })
      await subscription.unsubscribe()
    } catch (err) {
      console.error('Push unsubscribe error:', err)
    }
  }, [])

  const requestPermission = useCallback(async (): Promise<NotificationPermission> => {
    if (!('Notification' in window)) return 'denied'
    if (Notification.permission === 'granted') return 'granted'
    if (Notification.permission === 'denied') return 'denied'
    return await Notification.requestPermission()
  }, [])

  return { subscribe, unsubscribe, requestPermission }
}
