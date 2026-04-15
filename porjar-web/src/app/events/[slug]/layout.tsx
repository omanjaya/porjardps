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
    const ogUrl = `/api/og?title=${encodeURIComponent(event.name)}&subtitle=${encodeURIComponent(event.venue ?? event.city ?? '')}&type=event`
    return {
      title: event.name,
      description: `${event.short_name ?? ''} — ${event.venue ?? ''}, ${event.city ?? 'Denpasar'}`.trim(),
      openGraph: {
        title: event.name,
        description: event.description || `${event.venue ?? ''}, ${event.city ?? ''}`,
        images: [{ url: ogUrl, width: 1200, height: 630 }],
      },
      twitter: { card: 'summary_large_image', title: event.name, images: [ogUrl] },
    }
  } catch {
    return { title: 'Event' }
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
