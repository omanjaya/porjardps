'use client'

import { BaseLayout } from './BaseLayout'
import { playerConfig } from './configs/player.config'

export function DashboardLayout({ children }: { children: React.ReactNode }) {
  return <BaseLayout config={playerConfig}>{children}</BaseLayout>
}
