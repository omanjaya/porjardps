import { EventProvider } from '@/contexts/EventContext'
import { EventPublicLayout } from '@/components/layouts/EventPublicLayout'
import type { Event } from '@/types'
import { notFound } from 'next/navigation'

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
