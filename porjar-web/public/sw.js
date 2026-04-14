const CACHE_VERSION = 'v2'
const CACHE_NAME = `esi-denpasar-${CACHE_VERSION}`
const STATIC_CACHE = `esi-denpasar-static-${CACHE_VERSION}`
const API_CACHE = `esi-denpasar-api-${CACHE_VERSION}`

const STATIC_ASSETS = [
  '/manifest.json',
  '/icons/icon.svg',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
]

// Always return a Response, never undefined
function offlineResponse(request) {
  if (request.destination === 'image' || /\.(png|jpg|jpeg|webp|svg|ico)$/i.test(request.url)) {
    return new Response('', { status: 204 })
  }
  return new Response(
    JSON.stringify({ error: 'offline' }),
    { status: 503, headers: { 'Content-Type': 'application/json' } }
  )
}

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) =>
      Promise.allSettled(STATIC_ASSETS.map((u) => cache.add(u).catch(() => null)))
    )
  )
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => !key.endsWith(CACHE_VERSION))
          .map((key) => caches.delete(key))
      )
    )
  )
  self.clients.claim()
})

self.addEventListener('fetch', (event) => {
  const { request } = event
  if (request.method !== 'GET') return

  const url = new URL(request.url)

  // Bypass: cross-origin, websocket, chrome-extension, range requests
  if (url.origin !== self.location.origin) return
  if (url.protocol === 'ws:' || url.protocol === 'wss:' || url.protocol === 'chrome-extension:') return
  if (request.headers.has('range')) return

  // Bypass: Next.js RSC prefetch (?_rsc= query) — let browser handle directly
  if (url.searchParams.has('_rsc')) return

  // Bypass: favicon — let browser/server handle
  if (url.pathname === '/favicon.ico' || url.pathname.startsWith('/favicon')) return

  // Bypass: API mutations and any /api/admin/* — never cache
  if (url.pathname.startsWith('/api/v1/admin/') || url.pathname.startsWith('/api/v1/auth/')) return

  // API GET: stale-while-revalidate
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(staleWhileRevalidate(request, API_CACHE))
    return
  }

  // Static assets: cache-first
  if (
    request.destination === 'style' ||
    request.destination === 'script' ||
    request.destination === 'font' ||
    request.destination === 'image' ||
    url.pathname.startsWith('/_next/static/')
  ) {
    event.respondWith(cacheFirst(request, STATIC_CACHE))
    return
  }

  // HTML pages (navigations): network-first
  if (request.mode === 'navigate' || request.destination === 'document') {
    event.respondWith(networkFirst(request, CACHE_NAME))
    return
  }
})

async function safeCachePut(cacheName, request, response) {
  try {
    if (!response || !response.ok) return
    const cache = await caches.open(cacheName)
    await cache.put(request, response.clone())
  } catch (_) {
    // ignore put errors (opaque responses, partial reads, etc.)
  }
}

async function cacheFirst(request, cacheName) {
  try {
    const cached = await caches.match(request)
    if (cached) return cached
    const response = await fetchWithTimeout(request, 10000)
    safeCachePut(cacheName, request, response)
    return response
  } catch (_) {
    return offlineResponse(request)
  }
}

async function networkFirst(request, cacheName) {
  try {
    const response = await fetchWithTimeout(request, 8000)
    safeCachePut(cacheName, request, response)
    return response
  } catch (_) {
    const cached = await caches.match(request)
    if (cached) return cached
    if (request.mode === 'navigate') {
      const fallback = await caches.match('/')
      if (fallback) return fallback
    }
    return offlineResponse(request)
  }
}

async function staleWhileRevalidate(request, cacheName) {
  let cached
  try {
    const cache = await caches.open(cacheName)
    cached = await cache.match(request)
  } catch (_) {
    cached = undefined
  }

  const fetchPromise = fetchWithTimeout(request, 8000)
    .then((response) => {
      safeCachePut(cacheName, request, response)
      return response
    })
    .catch(() => null)

  if (cached) {
    // Fire-and-forget revalidation
    fetchPromise.catch(() => null)
    return cached
  }

  const fresh = await fetchPromise
  return fresh || offlineResponse(request)
}

function fetchWithTimeout(request, timeoutMs) {
  return new Promise((resolve, reject) => {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), timeoutMs)
    fetch(request, { signal: controller.signal })
      .then((res) => { clearTimeout(timer); resolve(res) })
      .catch((err) => { clearTimeout(timer); reject(err) })
  })
}

// Push notification handlers
self.addEventListener('push', function (event) {
  if (!event.data) return
  let data = {}
  try { data = event.data.json() } catch (e) {
    data = { title: 'ESI Denpasar', body: event.data.text(), url: '/admin/submissions' }
  }
  const title = data.title || 'ESI Kota Denpasar'
  const options = {
    body: data.body || 'Ada notifikasi baru',
    icon: '/icons/icon-192.png',
    badge: '/icons/icon-192.png',
    data: { url: data.url || '/admin/submissions' },
    requireInteraction: true,
    tag: 'esi-submission',
    renotify: true,
  }
  event.waitUntil(self.registration.showNotification(title, options))
})

self.addEventListener('notificationclick', function (event) {
  event.notification.close()
  const url = event.notification.data?.url || '/admin/submissions'
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function (clientList) {
      for (const client of clientList) {
        if (client.url.includes(url) && 'focus' in client) return client.focus()
      }
      if (clients.openWindow) return clients.openWindow(url)
    })
  )
})
