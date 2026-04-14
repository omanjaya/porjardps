'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { MagnifyingGlass, ArrowRight } from '@phosphor-icons/react'
import { useAuthStore } from '@/store/auth-store'
import { useKeyboardShortcut } from '@/lib/useKeyboardShortcuts'
import { cn } from '@/lib/utils'

interface PaletteRoute {
  href: string
  label: string
  section: string
  roles?: Array<'admin' | 'player' | 'coach' | 'referee'>
}

const ROUTES: PaletteRoute[] = [
  // Public
  { href: '/', label: 'Beranda', section: 'Publik' },
  { href: '/events', label: 'Event', section: 'Publik' },
  { href: '/tournaments', label: 'Turnamen', section: 'Publik' },
  { href: '/schools', label: 'Sekolah', section: 'Publik' },
  { href: '/teams', label: 'Tim', section: 'Publik' },
  { href: '/players', label: 'Pemain', section: 'Publik' },
  { href: '/matches', label: 'Pertandingan', section: 'Publik' },
  { href: '/leaderboards', label: 'Papan Peringkat', section: 'Publik' },
  { href: '/schedule', label: 'Jadwal', section: 'Publik' },
  { href: '/gallery', label: 'Galeri', section: 'Publik' },
  { href: '/rules', label: 'Aturan', section: 'Publik' },
  { href: '/cara-bertanding', label: 'Cara Bertanding', section: 'Publik' },

  // Player
  { href: '/dashboard', label: 'Dashboard Saya', section: 'Pemain', roles: ['player', 'coach'] },
  { href: '/achievements', label: 'Pencapaian', section: 'Pemain', roles: ['player', 'coach'] },

  // Admin
  { href: '/admin', label: 'Admin — Dashboard', section: 'Admin', roles: ['admin'] },
  { href: '/admin/approvals', label: 'Admin — Persetujuan', section: 'Admin', roles: ['admin'] },
  { href: '/admin/users', label: 'Admin — Pengguna', section: 'Admin', roles: ['admin'] },
  { href: '/admin/teams', label: 'Admin — Tim', section: 'Admin', roles: ['admin'] },
  { href: '/admin/schools', label: 'Admin — Sekolah', section: 'Admin', roles: ['admin'] },
  { href: '/admin/tournaments', label: 'Admin — Turnamen', section: 'Admin', roles: ['admin'] },
  { href: '/admin/events', label: 'Admin — Event', section: 'Admin', roles: ['admin'] },
  { href: '/admin/schedules', label: 'Admin — Jadwal', section: 'Admin', roles: ['admin'] },
  { href: '/admin/submissions', label: 'Admin — Submisi Skor', section: 'Admin', roles: ['admin'] },
  { href: '/admin/live', label: 'Admin — Live', section: 'Admin', roles: ['admin'] },
  { href: '/admin/analytics', label: 'Admin — Analitik', section: 'Admin', roles: ['admin'] },
  { href: '/admin/activity', label: 'Admin — Aktivitas', section: 'Admin', roles: ['admin'] },
  { href: '/admin/announcements', label: 'Admin — Pengumuman', section: 'Admin', roles: ['admin'] },
  { href: '/admin/news', label: 'Admin — Berita', section: 'Admin', roles: ['admin'] },
  { href: '/admin/rules', label: 'Admin — Aturan', section: 'Admin', roles: ['admin'] },
  { href: '/admin/broadcast', label: 'Admin — Broadcast', section: 'Admin', roles: ['admin'] },
  { href: '/admin/import', label: 'Admin — Import', section: 'Admin', roles: ['admin'] },
  { href: '/admin/export', label: 'Admin — Export', section: 'Admin', roles: ['admin'] },
  { href: '/admin/webhooks', label: 'Admin — Webhook', section: 'Admin', roles: ['admin'] },
  { href: '/admin/settings', label: 'Admin — Pengaturan', section: 'Admin', roles: ['admin'] },
  { href: '/admin/site-settings', label: 'Admin — Pengaturan Situs', section: 'Admin', roles: ['admin'] },
]

function fuzzyScore(query: string, text: string): number {
  if (!query) return 1
  const q = query.toLowerCase()
  const t = text.toLowerCase()
  if (t.includes(q)) return 100 - t.indexOf(q)
  // char-by-char subsequence
  let qi = 0
  for (let i = 0; i < t.length && qi < q.length; i++) {
    if (t[i] === q[qi]) qi++
  }
  return qi === q.length ? 1 : 0
}

export function CommandPalette() {
  const router = useRouter()
  const { user } = useAuthStore()
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [activeIdx, setActiveIdx] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLUListElement>(null)

  useKeyboardShortcut('k', () => setOpen((o) => !o), { ctrl: true })
  useKeyboardShortcut('Escape', () => setOpen(false))

  const role = user?.role

  const filtered = useMemo(() => {
    return ROUTES.filter((r) => {
      if (r.roles && r.roles.length > 0) {
        if (!role || !r.roles.includes(role as 'admin' | 'player' | 'coach' | 'referee')) return false
      }
      return fuzzyScore(query, r.label) > 0 || fuzzyScore(query, r.section) > 0
    })
      .map((r) => ({
        route: r,
        score: Math.max(fuzzyScore(query, r.label), fuzzyScore(query, r.section) * 0.5),
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 20)
      .map((r) => r.route)
  }, [query, role])

  // Reset active index when filter changes
  useEffect(() => {
    setActiveIdx(0)
  }, [query])

  // Focus input & reset when opening
  useEffect(() => {
    if (open) {
      setQuery('')
      setActiveIdx(0)
      // next tick so the input exists
      setTimeout(() => inputRef.current?.focus(), 10)
    }
  }, [open])

  // Ensure the active item stays visible
  useEffect(() => {
    if (!open || !listRef.current) return
    const active = listRef.current.querySelector<HTMLElement>(`[data-idx="${activeIdx}"]`)
    active?.scrollIntoView({ block: 'nearest' })
  }, [activeIdx, open])

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActiveIdx((i) => Math.min(i + 1, filtered.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActiveIdx((i) => Math.max(i - 1, 0))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      const target = filtered[activeIdx]
      if (target) {
        setOpen(false)
        router.push(target.href)
      }
    }
  }

  if (!open) return null

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Command palette"
      className="fixed inset-0 z-[100] flex items-start justify-center p-4 pt-[10vh]"
    >
      {/* overlay */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={() => setOpen(false)}
      />

      <div
        className="relative z-10 w-full max-w-xl overflow-hidden rounded-xl border border-stone-200 bg-white shadow-2xl dark:border-zinc-700 dark:bg-zinc-900"
      >
        {/* search bar */}
        <div className="flex items-center gap-2 border-b border-stone-200 px-3 py-3 dark:border-zinc-700">
          <MagnifyingGlass size={18} className="text-stone-400 dark:text-zinc-500" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder="Cari halaman..."
            className="w-full bg-transparent text-sm text-stone-900 placeholder:text-stone-400 focus:outline-none dark:text-zinc-100 dark:placeholder:text-zinc-500"
            aria-label="Cari halaman"
          />
          <kbd className="hidden rounded bg-stone-100 px-1.5 py-0.5 text-[10px] font-medium text-stone-500 dark:bg-zinc-800 dark:text-zinc-400 sm:inline">
            ESC
          </kbd>
        </div>

        {/* results */}
        <ul
          ref={listRef}
          className="max-h-[50vh] overflow-y-auto py-1"
          role="listbox"
        >
          {filtered.length === 0 ? (
            <li className="px-4 py-6 text-center text-sm text-stone-500 dark:text-zinc-400">
              Tidak ada hasil
            </li>
          ) : (
            filtered.map((route, idx) => {
              const active = idx === activeIdx
              return (
                <li
                  key={route.href}
                  data-idx={idx}
                  role="option"
                  aria-selected={active}
                >
                  <button
                    type="button"
                    onMouseEnter={() => setActiveIdx(idx)}
                    onClick={() => {
                      setOpen(false)
                      router.push(route.href)
                    }}
                    className={cn(
                      'flex w-full items-center justify-between gap-3 px-3 py-2 text-left text-sm transition-colors',
                      active
                        ? 'bg-stone-100 text-stone-900 dark:bg-zinc-800 dark:text-zinc-100'
                        : 'text-stone-700 dark:text-zinc-300'
                    )}
                  >
                    <span className="flex min-w-0 items-center gap-2">
                      <span className="truncate">{route.label}</span>
                    </span>
                    <span className="flex items-center gap-2">
                      <span className="hidden rounded bg-stone-100 px-1.5 py-0.5 text-[10px] font-medium text-stone-500 dark:bg-zinc-800 dark:text-zinc-400 sm:inline">
                        {route.section}
                      </span>
                      <ArrowRight size={14} className="text-stone-400 dark:text-zinc-500" />
                    </span>
                  </button>
                </li>
              )
            })
          )}
        </ul>

        {/* footer hint */}
        <div className="flex items-center justify-between gap-3 border-t border-stone-200 bg-stone-50 px-3 py-2 text-[11px] text-stone-500 dark:border-zinc-700 dark:bg-zinc-800/50 dark:text-zinc-400">
          <span>
            <kbd className="rounded bg-white px-1 py-0.5 font-medium shadow-sm dark:bg-zinc-900">↑</kbd>{' '}
            <kbd className="rounded bg-white px-1 py-0.5 font-medium shadow-sm dark:bg-zinc-900">↓</kbd>{' '}
            navigasi
          </span>
          <span>
            <kbd className="rounded bg-white px-1 py-0.5 font-medium shadow-sm dark:bg-zinc-900">Enter</kbd>{' '}
            pilih
          </span>
          <span>
            <kbd className="rounded bg-white px-1 py-0.5 font-medium shadow-sm dark:bg-zinc-900">Ctrl+K</kbd>{' '}
            toggle
          </span>
        </div>
      </div>
    </div>
  )
}

export default CommandPalette
