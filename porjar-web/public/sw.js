const CACHE_NAME = 'porjar-v1'
const STATIC_CACHE = 'porjar-static-v1'
const API_CACHE = 'porjar-api-v1'

const STATIC_ASSETS = [
  '/',
  '/manifest.json',
  '/icons/icon.svg',
]

// Install: cache static assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => {
      return cache.addAll(STATIC_ASSETS)
    })
  )
  self.skipWaiting()
})

// Activate: clean old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME && key !== STATIC_CACHE && key !== API_CACHE)
          .map((key) => caches.delete(key))
      )
    })
  )
  self.clients.claim()
})

// Fetch: strategy based on request type
self.addEventListener('fetch', (event) => {
  const { request } = event
  const url = new URL(request.url)

  // Skip non-GET requests
  if (request.method !== 'GET') return

  // Skip WebSocket and chrome-extension requests
  if (url.protocol === 'ws:' || url.protocol === 'wss:' || url.protocol === 'chrome-extension:') return

  // API requests: network-first
  if (url.pathname.startsWith('/api/') || url.hostname !== self.location.hostname) {
    event.respondWith(networkFirst(request, API_CACHE))
    return
  }

  // Static assets (JS, CSS, fonts, images): cache-first
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

  // HTML pages: network-first with offline fallback
  event.respondWith(networkFirst(request, CACHE_NAME))
})

async function cacheFirst(request, cacheName) {
  const cached = await caches.match(request)
  if (cached) return cached

  try {
    const response = await fetch(request)
    if (response.ok) {
      const cache = await caches.open(cacheName)
      cache.put(request, response.clone())
    }
    return response
  } catch {
    return new Response('Offline', { status: 503, statusText: 'Service Unavailable' })
  }
}

async function networkFirst(request, cacheName) {
  try {
    const response = await fetch(request)
    if (response.ok) {
      const cache = await caches.open(cacheName)
      cache.put(request, response.clone())
    }
    return response
  } catch {
    const cached = await caches.match(request)
    if (cached) return cached

    // Offline fallback for navigation requests
    if (request.mode === 'navigate') {
      const fallback = await caches.match('/')
      if (fallback) return fallback
    }

    return new Response(
      JSON.stringify({ error: 'Kamu sedang offline. Data terakhir tidak tersedia.' }),
      { status: 503, headers: { 'Content-Type': 'application/json' } }
    )
  }
}
