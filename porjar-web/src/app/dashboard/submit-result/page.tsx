'use client'

import { useState } from 'react'
import Link from 'next/link'
import { CheckCircle, House, PaperPlaneTilt, ListChecks } from '@phosphor-icons/react'
import { DashboardLayout } from '@/components/layouts/DashboardLayout'
import { PageHeader } from '@/components/shared/PageHeader'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import type { SubmissionData } from '@/components/modules/submission/SubmissionCard'
import { useActiveMatches, type ActiveMatch } from './hooks/useActiveMatches'
import { useSubmissionForm } from './hooks/useSubmissionForm'
import { MatchSelector } from './components/MatchSelector'
import { FormTypeSelector } from './components/FormTypeSelector'
import { SubmissionStatus } from './components/SubmissionStatus'
import { EditSubmissionDialog } from './components/EditSubmissionDialog'

const STEPS = ['Pilih Match', 'Isi Hasil', 'Upload Bukti', 'Konfirmasi'] as const

function ProgressStepper({ current }: { current: number }) {
  return (
    <div className="mb-4 sm:mb-6">
      <div className="flex items-center justify-between gap-1 sm:gap-2">
        {STEPS.map((label, i) => {
          const stepNum = i + 1
          const active = stepNum === current
          const done = stepNum < current
          return (
            <div key={label} className="flex flex-1 items-center gap-1 sm:gap-2 min-w-0">
              <div
                className={cn(
                  'flex h-7 w-7 sm:h-8 sm:w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold transition-colors',
                  done && 'bg-green-500 text-white',
                  active && 'bg-esi-red text-white ring-4 ring-esi-red/20',
                  !done && !active && 'bg-stone-200 dark:bg-zinc-800 text-stone-500 dark:text-zinc-500'
                )}
              >
                {done ? '✓' : stepNum}
              </div>
              <span
                className={cn(
                  'hidden sm:block truncate text-xs font-semibold',
                  active ? 'text-esi-text' : 'text-esi-muted'
                )}
              >
                {label}
              </span>
              {i < STEPS.length - 1 && (
                <div className={cn('h-0.5 flex-1 rounded', done ? 'bg-green-500' : 'bg-stone-200 dark:bg-zinc-800')} />
              )}
            </div>
          )
        })}
      </div>
      <p className="mt-2 text-xs font-semibold text-esi-text sm:hidden">
        Langkah {current} dari {STEPS.length}: <span className="text-esi-red">{STEPS[current - 1]}</span>
      </p>
    </div>
  )
}

export default function SubmitResultPage() {
  const { activeMatches, submissions, loading, loadData } = useActiveMatches()
  const [selectedMatch, setSelectedMatch] = useState<ActiveMatch | null>(null)
  const [editingFullSub, setEditingFullSub] = useState<SubmissionData | null>(null)
  const [justSubmitted, setJustSubmitted] = useState(false)
  const [submittedId, setSubmittedId] = useState<string | null>(null)

  // Wrap loadData so a successful submission triggers the success screen.
  const loadDataAndCelebrate = (submissionId?: string) => {
    setJustSubmitted(true)
    setSubmittedId(submissionId ?? null)
    loadData()
  }

  const form = useSubmissionForm({ loadData: loadDataAndCelebrate, setSelectedMatch })

  // Determine current step (1-4) for progress indicator.
  let currentStep = 1
  if (selectedMatch) {
    const isBR = selectedMatch.type === 'battle_royale'
    const filledResult = isBR
      ? Boolean(form.placement)
      : Boolean(form.scoreA && form.scoreB && form.scoreA !== form.scoreB)
    const hasScreenshots = form.screenshots.length > 0
    if (form.submitting) currentStep = 4
    else if (hasScreenshots && filledResult) currentStep = 4
    else if (filledResult) currentStep = 3
    else currentStep = 2
  }

  function selectMatch(match: ActiveMatch) {
    setSelectedMatch(match)
    form.resetForm()
  }

  function handleBack() {
    setSelectedMatch(null)
    form.resetForm()
  }

  function handleResubmit(sub: SubmissionData) {
    const match = activeMatches.find(m => m.id === sub.match_id)
    if (match) {
      setSelectedMatch(match)
      form.applyResubmit(sub)
    }
  }

  return (
    <DashboardLayout>
      <PageHeader
        title="Kirim Hasil Pertandingan"
        description="Upload bukti dan skor pertandingan kamu"
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Kirim Hasil' },
        ]}
      />

      {justSubmitted && (
        <div className="rounded-2xl border border-green-200 dark:border-green-900/50 bg-gradient-to-b from-green-50 to-white dark:from-green-950/30 dark:to-zinc-900 p-6 sm:p-10 text-center shadow-sm">
          <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/40">
            <CheckCircle size={56} weight="fill" className="text-green-500" />
          </div>
          <h2 className="text-2xl font-bold text-esi-text">Hasil terkirim!</h2>
          <p className="mt-2 text-sm text-esi-muted max-w-sm mx-auto">
            Admin akan verifikasi dalam 15 menit. Kamu akan mendapat notifikasi setelah hasil diverifikasi.
          </p>
          {submittedId && (
            <div className="text-xs text-stone-500 dark:text-zinc-400 mt-2">
              ID Pengajuan: <span className="font-mono font-bold text-esi-text">#{submittedId.slice(0, 8)}</span>
            </div>
          )}
          <div className="mt-6 flex flex-col sm:flex-row gap-2 sm:gap-3 justify-center">
            <Button
              onClick={() => { setJustSubmitted(false); setSubmittedId(null) }}
              className="min-h-[48px] bg-esi-red text-white hover:brightness-110"
            >
              <PaperPlaneTilt size={18} weight="fill" className="mr-1.5" />
              Submit Match Lain
            </Button>
            <Link
              href="/dashboard/my-matches"
              className="inline-flex min-h-[48px] items-center justify-center gap-1.5 rounded-lg border border-stone-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-4 text-sm font-semibold text-esi-text hover:bg-stone-50 dark:hover:bg-zinc-800"
            >
              <ListChecks size={18} weight="duotone" />
              Lihat Status
            </Link>
            <Link
              href="/dashboard"
              className="inline-flex min-h-[48px] items-center justify-center gap-1.5 rounded-lg border border-stone-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-4 text-sm font-semibold text-esi-text hover:bg-stone-50 dark:hover:bg-zinc-800"
            >
              <House size={18} weight="duotone" />
              Ke Dashboard
            </Link>
          </div>
        </div>
      )}

      {!justSubmitted && selectedMatch && <ProgressStepper current={currentStep} />}

      {!justSubmitted && !selectedMatch && (
        <>
          <ProgressStepper current={1} />
          <MatchSelector
            matches={activeMatches}
            loading={loading}
            onSelect={selectMatch}
          />
          <SubmissionStatus
            submissions={submissions}
            loading={loading}
            onEditSubmission={setEditingFullSub}
            onResubmit={handleResubmit}
          />
        </>
      )}

      {!justSubmitted && selectedMatch && (
        <FormTypeSelector
          selectedMatch={selectedMatch}
          resubmittingSub={form.resubmittingSub}
          onBack={handleBack}
          scoreA={form.scoreA}
          setScoreA={form.setScoreA}
          scoreB={form.scoreB}
          setScoreB={form.setScoreB}
          placement={form.placement}
          setPlacement={form.setPlacement}
          killsP1={form.killsP1}
          setKillsP1={form.setKillsP1}
          killsP2={form.killsP2}
          setKillsP2={form.setKillsP2}
          killsP3={form.killsP3}
          setKillsP3={form.setKillsP3}
          killsP4={form.killsP4}
          setKillsP4={form.setKillsP4}
          setScreenshots={form.setScreenshots}
          submitting={form.submitting}
          onSubmitBracket={() => form.handleSubmitBracket(selectedMatch)}
          onSubmitBR={() => form.handleSubmitBR(selectedMatch)}
        />
      )}

      {editingFullSub && (
        <EditSubmissionDialog
          submission={editingFullSub}
          onClose={() => setEditingFullSub(null)}
          onSaved={loadData}
        />
      )}
    </DashboardLayout>
  )
}
