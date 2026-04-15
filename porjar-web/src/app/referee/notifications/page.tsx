'use client'

import { NotificationsPageContent } from '@/components/pages/NotificationsPageContent'
import { RefereeLayout } from '@/components/layouts/RefereeLayout'

export default function RefereeNotificationsPage() {
  return <NotificationsPageContent Layout={RefereeLayout} baseHref="/referee" baseLabel="Wasit" />
}
