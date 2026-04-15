import type { Metadata } from 'next'
import { EventProvider } from '@/contexts/EventContext'
import { EventPublicLayout } from '@/components/layouts/EventPublicLayout'
import type { Event } from '@/types'
import { notFound } from 'next/navigation'

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params
  const API = process.env.NEXT_PUBLIC_API_URL ?? ''
  try {
    const res = await fetch(`${API}/events/${slug}`, { next: { revalidate: 300 } })
    if (!res.ok) throw new Error()
    const body = await res.json()
    const event = body.data
    if (!event) throw new Error()
    const ogUrl = `/api/og?title=${encodeURIComponent(event.name)}&subtitle=${encodeURIComponent(event.venue ?? event.city ?? 'Denpasar')}&type=event`
    const descParts: string[] = []
    if (event.description) descParts.push(event.description)
    else {
      if (event.venue) descParts.push(event.venue)
      if (event.city) descParts.push(event.city)
      else descParts.push('Denpasar, Bali')
    }
    const description = descParts.join(', ') + ' — Turnamen esport pelajar ESI Kota Denpasar.'
    return {
      title: event.name,
      description: description.slice(0, 160),
      openGraph: {
        title: event.name,
        description: description.slice(0, 160),
        images: [{ url: ogUrl, width: 1200, height: 630 }],
      },
      twitter: { card: 'summary_large_image', title: event.name, images: [ogUrl] },
      alternates: { canonical: `https://esidenpasar.com/events/${slug}` },
    }
  } catch {
    return {
      title: 'Event Turnamen',
      description: 'Detail event turnamen esport pelajar ESI Kota Denpasar.',
    }
  }
}

// This must be a Server Component to fetch data
export default async function EventLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params

  let event: Event
  try {
    // Fetch event data server-side
    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/events/${slug}`, {
      next: { revalidate: 60 },
    })
    if (!res.ok) return notFound()
    const body = await res.json()
    event = body.data
  } catch {
    return notFound()
  }

  return (
    <EventProvider event={event}>
      <EventPublicLayout>{children}</EventPublicLayout>
    </EventProvider>
  )
}
