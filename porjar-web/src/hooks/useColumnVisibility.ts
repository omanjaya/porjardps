'use client'
import { useEffect, useState } from 'react'

export function useColumnVisibility(storageKey: string, defaultVisible: Record<string, boolean>) {
  const [visible, setVisible] = useState<Record<string, boolean>>(defaultVisible)
  const [hydrated, setHydrated] = useState(false)

  useEffect(() => {
    try {
      const saved = localStorage.getItem(storageKey)
      if (saved) setVisible({ ...defaultVisible, ...JSON.parse(saved) })
    } catch {}
    setHydrated(true)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storageKey])

  useEffect(() => {
    if (!hydrated) return
    try {
      localStorage.setItem(storageKey, JSON.stringify(visible))
    } catch {}
  }, [visible, storageKey, hydrated])

  function toggle(col: string) {
    setVisible(v => ({ ...v, [col]: !v[col] }))
  }

  return { visible, toggle, hydrated }
}
