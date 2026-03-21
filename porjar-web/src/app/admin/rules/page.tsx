'use client'

import { useState, useEffect, useCallback } from 'react'
import { AdminLayout } from '@/components/layouts/AdminLayout'
import { GAME_CONFIG } from '@/constants/games'
import { cn } from '@/lib/utils'
import { api } from '@/lib/api'
import {
  Plus,
  Trash,
  FloppyDisk,
  ArrowUp,
  ArrowDown,
  Eye,
  EyeSlash,
  SpinnerGap,
} from '@phosphor-icons/react'
import type { GameSlug } from '@/types'

interface GameRule {
  id: string
  game_id: string
  section_name: string
  section_order: number
  content: string
  is_published: boolean
  updated_at: string
}

interface SectionDraft {
  id?: string
  section_name: string
  section_order: number
  content: string
  is_published: boolean
}

const GAME_TABS: { slug: GameSlug; label: string }[] = [
  { slug: 'ml', label: 'MLBB' },
  { slug: 'hok', label: 'HOK' },
  { slug: 'ff', label: 'Free Fire' },
  { slug: 'pubgm', label: 'PUBG Mobile' },
  { slug: 'efootball', label: 'eFootball' },
]

const DEFAULT_SECTIONS = [
  'Peraturan Umum',
  'Ketentuan Peserta',
  'Penalti/Diskualifikasi',
  'Format Match',
  'Sistem Poin',
]

export default function AdminRulesPage() {
  const [activeGame, setActiveGame] = useState<GameSlug>('ml')
  const [sections, setSections] = useState<SectionDraft[]>([])
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const fetchRules = useCallback(async (slug: GameSlug) => {
    setLoading(true)
    setMessage(null)
    try {
      const data = await api.get<GameRule[]>(`/admin/games/${slug}/rules`)
      if (data && data.length > 0) {
        setSections(
          data.map((r) => ({
            id: r.id,
            section_name: r.section_name,
            section_order: r.section_order,
            content: r.content,
            is_published: r.is_published,
          }))
        )
      } else {
        // Provide default sections
        setSections(
          DEFAULT_SECTIONS.map((name, i) => ({
            section_name: name,
            section_order: i,
            content: '',
            is_published: true,
          }))
        )
      }
    } catch {
      // If admin endpoint fails (e.g. no rules yet), show defaults
      setSections(
        DEFAULT_SECTIONS.map((name, i) => ({
          section_name: name,
          section_order: i,
          content: '',
          is_published: true,
        }))
      )
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchRules(activeGame)
  }, [activeGame, fetchRules])

  const handleSave = async () => {
    // Validate
    const empty = sections.find((s) => !s.section_name.trim())
    if (empty) {
      setMessage({ type: 'error', text: 'Nama section tidak boleh kosong' })
      return
    }

    // Filter out sections with no content (don't save empty ones)
    const toSave = sections.filter((s) => s.content.trim() !== '')
    if (toSave.length === 0) {
      setMessage({ type: 'error', text: 'Minimal satu section harus memiliki konten' })
      return
    }

    setSaving(true)
    setMessage(null)
    try {
      await api.put(`/admin/games/${activeGame}/rules`, {
        sections: toSave.map((s, i) => ({
          section_name: s.section_name,
          section_order: i,
          content: s.content,
          is_published: s.is_published,
        })),
      })
      setMessage({ type: 'success', text: 'Aturan berhasil disimpan' })
      // Refresh to get IDs
      await fetchRules(activeGame)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Gagal menyimpan'
      setMessage({ type: 'error', text: msg })
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteSection = async (index: number) => {
    const section = sections[index]
    if (section.id) {
      try {
        await api.delete(`/admin/game-rules/${section.id}`)
      } catch {
        // ignore delete errors for sections not yet persisted
      }
    }
    setSections((prev) => prev.filter((_, i) => i !== index))
  }

  const handleAddSection = () => {
    setSections((prev) => [
      ...prev,
      {
        section_name: '',
        section_order: prev.length,
        content: '',
        is_published: true,
      },
    ])
  }

  const moveSection = (index: number, direction: 'up' | 'down') => {
    const newIndex = direction === 'up' ? index - 1 : index + 1
    if (newIndex < 0 || newIndex >= sections.length) return
    setSections((prev) => {
      const arr = [...prev]
      const temp = arr[index]
      arr[index] = arr[newIndex]
      arr[newIndex] = temp
      return arr.map((s, i) => ({ ...s, section_order: i }))
    })
  }

  const updateSection = (index: number, field: keyof SectionDraft, value: string | boolean) => {
    setSections((prev) =>
      prev.map((s, i) => (i === index ? { ...s, [field]: value } : s))
    )
  }

  return (
    <AdminLayout>
      <div className="mb-4 sm:mb-6">
        <h1 className="text-2xl font-bold text-stone-900">Aturan Turnamen</h1>
        <p className="mt-1 text-sm text-stone-500">
          Kelola peraturan untuk setiap cabang e-sport
        </p>
      </div>

      {/* Game Tabs */}
      <div className="mb-4 sm:mb-6 flex flex-wrap items-center gap-2">
        {GAME_TABS.map((game) => {
          const gc = GAME_CONFIG[game.slug]
          const isActive = activeGame === game.slug
          return (
            <button
              key={game.slug}
              onClick={() => setActiveGame(game.slug)}
              className={cn(
                'flex items-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-semibold transition-colors',
                isActive
                  ? 'border-porjar-red bg-porjar-red text-white shadow-sm'
                  : 'border-stone-200 text-stone-600 hover:text-stone-900 hover:bg-stone-50'
              )}
            >
              <span
                className={cn(
                  'flex h-6 w-6 shrink-0 items-center justify-center rounded-md',
                  isActive ? 'bg-white/20' : 'bg-stone-100'
                )}
              >
                <img
                  src={gc.logo}
                  alt={game.label}
                  className="h-4 w-4 rounded object-contain"
                />
              </span>
              {game.label}
            </button>
          )
        })}
      </div>

      {/* Message */}
      {message && (
        <div
          className={cn(
            'mb-4 rounded-lg border px-4 py-3 text-sm',
            message.type === 'success'
              ? 'border-green-200 bg-green-50 text-green-800'
              : 'border-red-200 bg-red-50 text-red-800'
          )}
        >
          {message.text}
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <SpinnerGap size={32} className="animate-spin text-stone-400" />
        </div>
      ) : (
        <>
          {/* Sections */}
          <div className="space-y-4">
            {sections.map((section, index) => (
              <div
                key={index}
                className="rounded-xl border border-stone-200 bg-white p-4 shadow-sm"
              >
                <div className="mb-3 flex items-center gap-2">
                  {/* Reorder buttons */}
                  <div className="flex flex-col gap-0.5">
                    <button
                      onClick={() => moveSection(index, 'up')}
                      disabled={index === 0}
                      className="rounded p-1 text-stone-400 hover:bg-stone-100 hover:text-stone-600 disabled:opacity-30"
                    >
                      <ArrowUp size={14} />
                    </button>
                    <button
                      onClick={() => moveSection(index, 'down')}
                      disabled={index === sections.length - 1}
                      className="rounded p-1 text-stone-400 hover:bg-stone-100 hover:text-stone-600 disabled:opacity-30"
                    >
                      <ArrowDown size={14} />
                    </button>
                  </div>

                  {/* Section name input */}
                  <input
                    type="text"
                    value={section.section_name}
                    onChange={(e) => updateSection(index, 'section_name', e.target.value)}
                    placeholder="Nama Section"
                    className="flex-1 rounded-lg border border-stone-200 px-3 py-2 text-sm font-semibold text-stone-800 placeholder:text-stone-400 focus:border-porjar-red focus:outline-none focus:ring-1 focus:ring-porjar-red"
                  />

                  {/* Publish toggle */}
                  <button
                    onClick={() => updateSection(index, 'is_published', !section.is_published)}
                    className={cn(
                      'flex items-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-medium transition-colors',
                      section.is_published
                        ? 'border-green-200 bg-green-50 text-green-700'
                        : 'border-stone-200 bg-stone-50 text-stone-500'
                    )}
                    title={section.is_published ? 'Published' : 'Draft'}
                  >
                    {section.is_published ? <Eye size={14} /> : <EyeSlash size={14} />}
                    {section.is_published ? 'Published' : 'Draft'}
                  </button>

                  {/* Delete button */}
                  <button
                    onClick={() => handleDeleteSection(index)}
                    className="rounded-lg border border-stone-200 p-2 text-stone-400 hover:border-red-200 hover:bg-red-50 hover:text-red-500 transition-colors"
                  >
                    <Trash size={16} />
                  </button>
                </div>

                {/* Content textarea */}
                <textarea
                  value={section.content}
                  onChange={(e) => updateSection(index, 'content', e.target.value)}
                  placeholder="Tulis konten aturan di sini... (gunakan baris baru untuk setiap poin)"
                  rows={5}
                  className="w-full rounded-lg border border-stone-200 px-3 py-2 text-sm text-stone-700 placeholder:text-stone-400 focus:border-porjar-red focus:outline-none focus:ring-1 focus:ring-porjar-red"
                />
                <p className="mt-1 text-xs text-stone-400">
                  Setiap baris akan ditampilkan sebagai poin terpisah di halaman publik.
                </p>
              </div>
            ))}
          </div>

          {/* Actions */}
          <div className="mt-4 sm:mt-6 flex flex-wrap items-center gap-3">
            <button
              onClick={handleAddSection}
              className="flex items-center gap-2 rounded-xl border border-dashed border-stone-300 px-4 py-2.5 text-sm font-medium text-stone-600 hover:border-stone-400 hover:bg-stone-50 transition-colors"
            >
              <Plus size={16} />
              Tambah Section
            </button>

            <button
              onClick={handleSave}
              disabled={saving}
              className="ml-auto flex items-center gap-2 rounded-xl bg-porjar-red px-6 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-red-700 disabled:opacity-50 transition-colors"
            >
              {saving ? (
                <SpinnerGap size={16} className="animate-spin" />
              ) : (
                <FloppyDisk size={16} />
              )}
              Simpan
            </button>
          </div>
        </>
      )}
    </AdminLayout>
  )
}
