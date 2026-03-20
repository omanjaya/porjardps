'use client'

import dynamic from 'next/dynamic'

// Lazy-load LandingPage (which bundles gsap + ScrollTrigger) so it is only
// sent to the client, reducing the initial JS payload.
const LandingPage = dynamic(() => import('@/components/landing/LandingPage'), {
  ssr: false,
})

export default function HomePage() {
  return <LandingPage />
}
