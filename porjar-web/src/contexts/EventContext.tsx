'use client'

import { createContext, useContext } from 'react'
import type { Event } from '@/types'

interface EventContextValue {
  event: Event
}

const EventContext = createContext<EventContextValue | null>(null)

export function EventProvider({ event, children }: { event: Event; children: React.ReactNode }) {
  return (
    <EventContext.Provider value={{ event }}>
      <div style={{ '--event-primary': event.primary_color } as React.CSSProperties}>
        {children}
      </div>
    </EventContext.Provider>
  )
}

export function useEvent() {
  const ctx = useContext(EventContext)
  if (!ctx) throw new Error('useEvent must be used within EventProvider')
  return ctx.event
}
