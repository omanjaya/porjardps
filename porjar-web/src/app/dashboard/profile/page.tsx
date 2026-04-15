'use client'

import { Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { ProfilePageContent } from '@/components/pages/ProfilePageContent'
import { DashboardLayout } from '@/components/layouts/DashboardLayout'

function ProfileWithIntent() {
  const searchParams = useSearchParams()
  const fromIntent = searchParams?.get('from') ?? null
  return <ProfilePageContent Layout={DashboardLayout} baseHref="/dashboard" baseLabel="Dashboard" fromIntent={fromIntent} />
}

export default function ProfilePage() {
  return (
    <Suspense fallback={null}>
      <ProfileWithIntent />
    </Suspense>
  )
}
