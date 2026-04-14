import { create } from 'zustand'
import { useEffect, useState } from 'react'

interface ThemeState {
  isDark: boolean
  toggle: () => void
  setDark: (dark: boolean) => void
}

export const useThemeStore = create<ThemeState>((set) => ({
  // Always start false (matches server). Hydrated on client via useThemeHydrated().
  isDark: false,
  toggle: () =>
    set((state) => {
      const newDark = !state.isDark
      localStorage.setItem('porjar_theme', newDark ? 'dark' : 'light')
      document.documentElement.classList.toggle('dark', newDark)
      return { isDark: newDark }
    }),
  setDark: (dark) => {
    localStorage.setItem('porjar_theme', dark ? 'dark' : 'light')
    document.documentElement.classList.toggle('dark', dark)
    set({ isDark: dark })
  },
}))

// Hydrate theme from localStorage after mount (avoids SSR mismatch).
// The inline <script> in layout.tsx already applies the .dark class instantly,
// so the page looks correct. This hook just syncs the Zustand state.
let hydrated = false
export function useThemeHydrated() {
  const setDark = useThemeStore((s) => s.setDark)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    if (hydrated) { setMounted(true); return }
    hydrated = true
    const stored = localStorage.getItem('porjar_theme')
    if (stored === 'dark') {
      setDark(true)
    }
    setMounted(true)
  }, [setDark])

  return mounted
}
