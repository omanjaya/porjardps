import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'standalone',
  experimental: {
    optimizePackageImports: ['@phosphor-icons/react', 'recharts'],
    // optimizeCss: true, // disabled — incompatible with Next.js 16 data-precedence
  },
  async redirects() {
    const activeSlug = 'porjar-2026';
    return [
      // Redirect legacy global routes to active event-scoped pages (302)
      ...[
        'tournaments', 'schedule', 'games', 'rules', 'teams',
        'players', 'gallery', 'achievements', 'rundown',
      ].map(path => ({
        source: `/${path}`,
        destination: `/events/${activeSlug}/${path}`,
        permanent: false,
      })),
      { source: '/leaderboards', destination: `/events/${activeSlug}/leaderboard`, permanent: false },
      { source: '/schools', destination: `/events/${activeSlug}/schools`, permanent: false },
      { source: '/schools/standings', destination: `/events/${activeSlug}/schools/standings`, permanent: false },
      { source: '/matches/live', destination: `/events/${activeSlug}/matches/live`, permanent: false },
    ];
  },
  async headers() {
    return [{
      source: '/(.*)',
      headers: [
        { key: 'X-Content-Type-Options', value: 'nosniff' },
        { key: 'X-Frame-Options', value: 'DENY' },
        { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
        { key: 'X-XSS-Protection', value: '0' },
        { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
        { key: 'Strict-Transport-Security', value: 'max-age=31536000; includeSubDomains' },
        { key: 'Content-Security-Policy', value: "default-src 'self'; script-src 'self' 'unsafe-eval' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob: https:; font-src 'self' data:; connect-src 'self' ws: wss: http://localhost:* https:; frame-ancestors 'none'" },
      ],
    }]
  },
  images: {
    formats: ["image/avif", "image/webp"],
    minimumCacheTTL: 60,
    deviceSizes: [640, 750, 828, 1080, 1200, 1920],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    remotePatterns: [
      {
        protocol: "https",
        hostname: "185.214.124.85",
      },
      {
        protocol: "http",
        hostname: "localhost",
      },
      {
        protocol: "http",
        hostname: "127.0.0.1",
      },
      {
        protocol: "https",
        hostname: "esidenpasar.com",
      },
      {
        protocol: "https",
        hostname: "www.esidenpasar.com",
      },
    ],
  },
};

export default nextConfig;
