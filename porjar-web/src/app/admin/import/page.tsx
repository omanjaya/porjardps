'use client'

import { PageHeader } from '@/components/shared/PageHeader'
import { ImportUploadSection } from './ImportUploadSection'
import { CredentialSection } from './CredentialSection'
import { ChallongeImportSection } from './ChallongeImportSection'

export default function AdminImportPage() {
  return (
    <>
      <PageHeader
        title="Import & Kredensial"
        description="Import data peserta via CSV dan distribusikan kredensial login"
      />

      <div className="space-y-6">
        <ChallongeImportSection />
        <ImportUploadSection />
        <CredentialSection />
      </div>
    </>
  )
}
