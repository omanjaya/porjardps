'use client'

import { BaseLayout } from './BaseLayout'
import { coachConfig } from './configs/coach.config'

export function CoachLayout({ children }: { children: React.ReactNode }) {
  return <BaseLayout config={coachConfig}>{children}</BaseLayout>
}
