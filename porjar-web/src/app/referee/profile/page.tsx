'use client'

import { ProfilePageContent } from '@/components/pages/ProfilePageContent'
import { RefereeLayout } from '@/components/layouts/RefereeLayout'

export default function RefereeProfilePage() {
  return <ProfilePageContent Layout={RefereeLayout} baseHref="/referee" baseLabel="Wasit" />
}
