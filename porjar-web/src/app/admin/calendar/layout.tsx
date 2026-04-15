import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Kalender Event',
  description: 'Tampilan kalender event dan turnamen esport.',
}

export default function CalendarLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
