'use client'

import { ProfilePageContent } from '@/components/pages/ProfilePageContent'
import { CoachLayout } from '@/components/layouts/CoachLayout'

export default function CoachProfilePage() {
  return <ProfilePageContent Layout={CoachLayout} baseHref="/coach" baseLabel="Coach" />
}
