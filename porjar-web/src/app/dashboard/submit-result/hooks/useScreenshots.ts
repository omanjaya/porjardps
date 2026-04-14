'use client'

import { useState } from 'react'
import { api } from '@/lib/api'
import { toast } from 'sonner'
import type { SubmissionData } from '@/components/modules/submission/SubmissionCard'

export function useEditScreenshots() {
  const [editNewScreenshots, setEditNewScreenshots] = useState<string[]>([])
  const [editExistingScreenshots, setEditExistingScreenshots] = useState<string[]>([])
  const [deletingScreenshot, setDeletingScreenshot] = useState<string | null>(null)

  function initFrom(sub: SubmissionData) {
    setEditNewScreenshots([])
    setEditExistingScreenshots(sub.screenshots ?? [])
  }

  async function handleDeleteExistingScreenshot(submissionId: string, url: string) {
    setDeletingScreenshot(url)
    try {
      await api.delete(`/submissions/${submissionId}/screenshot`, { url })
      setEditExistingScreenshots(prev => prev.filter(u => u !== url))
      toast.success('Screenshot dihapus')
    } catch {
      toast.error('Gagal menghapus screenshot')
    } finally {
      setDeletingScreenshot(null)
    }
  }

  return {
    editNewScreenshots,
    setEditNewScreenshots,
    editExistingScreenshots,
    setEditExistingScreenshots,
    deletingScreenshot,
    initFrom,
    handleDeleteExistingScreenshot,
  }
}
