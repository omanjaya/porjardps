'use client'

import { NotificationsPageContent } from '@/components/pages/NotificationsPageContent'
import { CoachLayout } from '@/components/layouts/CoachLayout'

export default function CoachNotificationsPage() {
  return <NotificationsPageContent Layout={CoachLayout} baseHref="/coach" baseLabel="Coach" />
}
