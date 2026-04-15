'use client'

import { NotificationsPageContent } from '@/components/pages/NotificationsPageContent'
import { DashboardLayout } from '@/components/layouts/DashboardLayout'

export default function NotificationsPage() {
  return <NotificationsPageContent Layout={DashboardLayout} baseHref="/dashboard" baseLabel="Dashboard" />
}
