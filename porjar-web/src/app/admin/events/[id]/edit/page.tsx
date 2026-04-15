'use client'

import { useParams } from 'next/navigation'
import { EventFormContent } from '../../EventFormContent'

export default function EditEventPage() {
  const params = useParams<{ id: string }>()
  return <EventFormContent eventId={params.id} />
}
