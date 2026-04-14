'use client'

import { useEffect } from 'react'

/**
 * Warn user before leaving page if form has unsaved changes.
 * Attaches beforeunload listener when `dirty` is true.
 */
export function useUnsavedChanges(dirty: boolean, message = 'Perubahan belum disimpan. Yakin ingin keluar?') {
  useEffect(() => {
    if (!dirty) return
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault()
      e.returnValue = message
      return message
    }
    window.addEventListener('beforeunload', handler)
    return () => window.removeEventListener('beforeunload', handler)
  }, [dirty, message])
}
