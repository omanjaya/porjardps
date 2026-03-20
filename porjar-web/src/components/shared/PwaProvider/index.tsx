'use client'

import { useEffect } from 'react'
import { registerServiceWorker } from '@/lib/sw-register'
import { InstallPrompt } from '@/components/shared/InstallPrompt'

export function PwaProvider() {
  useEffect(() => {
    registerServiceWorker()
  }, [])

  return <InstallPrompt />
}
