import { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: [
          '/admin/',
          '/dashboard/',
          '/api/',
          '/coach/',
          '/referee/',
          '/embed/',
        ],
      },
    ],
    sitemap: 'https://esidenpasar.com/sitemap.xml',
  }
}
