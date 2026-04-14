'use client'

import { useEffect } from 'react'

interface ShortcutOpts {
  ctrl?: boolean
  shift?: boolean
  meta?: boolean
}

/**
 * useKeyboardShortcut — register a global keyboard shortcut.
 *
 * - Ignores key events that originate inside `<input>`, `<textarea>`, or
 *   contentEditable elements (except for `Escape`, which is always allowed
 *   so dialogs/modals can close even when an input has focus).
 * - For `ctrl`, matches Ctrl on Windows/Linux and Meta (Cmd) on macOS — this
 *   way `Ctrl+K` and `Cmd+K` both work with `{ ctrl: true }`.
 */
export function useKeyboardShortcut(
  key: string,
  handler: () => void,
  opts: ShortcutOpts = {}
) {
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const target = e.target as HTMLElement | null
      const inEditable =
        target?.tagName === 'INPUT' ||
        target?.tagName === 'TEXTAREA' ||
        !!target?.isContentEditable

      if (inEditable && key !== 'Escape') return

      if (e.key !== key) return

      if (opts.ctrl && !e.ctrlKey && !e.metaKey) return
      if (opts.shift && !e.shiftKey) return
      if (opts.meta && !e.metaKey) return

      e.preventDefault()
      handler()
    }

    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [key, handler, opts.ctrl, opts.shift, opts.meta])
}
