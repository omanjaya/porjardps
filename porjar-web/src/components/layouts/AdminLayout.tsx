'use client'

import { BaseLayout } from './BaseLayout'
import { adminConfig } from './configs/admin.config'

export function AdminLayout({ children }: { children: React.ReactNode }) {
  return <BaseLayout config={adminConfig}>{children}</BaseLayout>
}
