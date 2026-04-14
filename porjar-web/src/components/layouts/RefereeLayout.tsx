'use client'

import { BaseLayout } from './BaseLayout'
import { refereeConfig } from './configs/referee.config'

export function RefereeLayout({ children }: { children: React.ReactNode }) {
  return <BaseLayout config={refereeConfig}>{children}</BaseLayout>
}
