import { MetadataRoute } from 'next'

export const revalidate = 3600 // rebuild every hour

interface EventItem {
  slug: string
  updated_at?: string
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = 'https://esidenpasar.com'
  const highPriority = ['', '/events', '/tournaments', '/leaderboards', '/schools/standings']
  const mediumPriority = [
    '/cara-bertanding', '/schedule', '/games', '/rules',
    '/teams', '/players', '/schools', '/gallery', '/achievements',
    '/matches/live', '/rundown',
  ]
  const staticRoutes: MetadataRoute.Sitemap = [
    ...highPriority.map(path => ({
      url: base + path,
      lastModified: new Date(),
      changeFrequency: 'daily' as const,
      priority: path === '' ? 1.0 : 0.9,
    })),
    ...mediumPriority.map(path => ({
      url: base + path,
      lastModified: new Date(),
      changeFrequency: 'daily' as const,
      priority: 0.7,
    })),
  ]

  const dynamicRoutes: MetadataRoute.Sitemap = []
  try {
    const apiBase = process.env.NEXT_PUBLIC_API_URL
    if (apiBase) {
      const eventsRes = await fetch(apiBase + '/events', { next: { revalidate: 3600 } })
      if (eventsRes.ok) {
        const events = await eventsRes.json()
        const eventList: EventItem[] = Array.isArray(events?.data)
          ? events.data
          : Array.isArray(events) ? events : []
        for (const e of eventList) {
          if (!e?.slug) continue
          const slugRoutes = ['', '/tournaments', '/rules', '/schedule', '/teams', '/schools', '/gallery', '/leaderboard']
          for (const s of slugRoutes) {
            dynamicRoutes.push({
              url: base + '/events/' + e.slug + s,
              lastModified: new Date(e.updated_at ?? Date.now()),
              changeFrequency: 'daily',
              priority: 0.8,
            })
          }
        }
      }
    }
  } catch {
    // Fail gracefully — return static routes only
  }

  return [...staticRoutes, ...dynamicRoutes]
}
