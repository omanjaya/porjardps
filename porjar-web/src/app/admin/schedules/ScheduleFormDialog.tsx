'use client'

import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { FormDialog } from '@/components/shared/FormDialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import Image from 'next/image'
import { GAME_CONFIG } from '@/constants/games'
import { cn } from '@/lib/utils'
import type { ScheduleStatus, Tournament, GameSlug } from '@/types'

// ─── Form state ───
export interface ScheduleFormData {
  title: string
  tournament_id: string
  description: string
  scheduled_at: string
  end_at: string
  venue: string
  status: string
  bracket_match_id: string
}

export const emptyForm: ScheduleFormData = {
  title: '',
  tournament_id: '',
  description: '',
  scheduled_at: '',
  end_at: '',
  venue: '',
  status: 'upcoming',
  bracket_match_id: '',
}

// ─── Status config for timeline cards ───
export const STATUS_CONFIG: Record<ScheduleStatus, { label: string; dot: string; bg: string; text: string; ring: string }> = {
  upcoming: { label: 'Akan Datang', dot: 'bg-blue-500', bg: 'bg-blue-50 dark:bg-blue-950/30', text: 'text-blue-700', ring: 'ring-blue-200' },
  ongoing: { label: 'Berlangsung', dot: 'bg-red-500 animate-pulse', bg: 'bg-red-50 dark:bg-red-950/30', text: 'text-red-700', ring: 'ring-red-200' },
  completed: { label: 'Selesai', dot: 'bg-green-500', bg: 'bg-green-50 dark:bg-green-950/30', text: 'text-green-700', ring: 'ring-green-200' },
  postponed: { label: 'Ditunda', dot: 'bg-amber-500', bg: 'bg-amber-50 dark:bg-amber-950/30', text: 'text-amber-700', ring: 'ring-amber-200' },
  cancelled: { label: 'Dibatalkan', dot: 'bg-stone-400', bg: 'bg-stone-100 dark:bg-zinc-800', text: 'text-stone-500 dark:text-zinc-400', ring: 'ring-stone-200' },
}

interface ScheduleFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  form: ScheduleFormData
  setForm: React.Dispatch<React.SetStateAction<ScheduleFormData>>
  editingId: string | null
  tournaments: Tournament[]
  onSubmit: () => void
  submitting: boolean
}

export function ScheduleFormDialog({
  open,
  onOpenChange,
  form,
  setForm,
  editingId,
  tournaments,
  onSubmit,
  submitting,
}: ScheduleFormDialogProps) {
  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      title={editingId ? 'Edit Jadwal' : 'Tambah Jadwal Manual'}
      description={editingId && form.bracket_match_id ? 'Terhubung ke bracket · Waktu akan disinkronkan otomatis' : undefined}
      onSubmit={(e) => { e.preventDefault(); onSubmit() }}
      submitting={submitting}
      submitLabel={editingId ? 'Perbarui' : 'Simpan'}
      maxWidth="lg"
    >
      <>
        {/* Tournament selector */}
          <div>
            <label className="mb-1.5 block text-xs font-medium text-stone-500 dark:text-zinc-400">
              Turnamen <span className="text-red-500">*</span>
            </label>
            <Select value={form.tournament_id} onValueChange={(v) => setForm((f) => ({ ...f, tournament_id: v as string }))}>
              <SelectTrigger className="w-full bg-white dark:bg-zinc-900 border-stone-300 dark:border-zinc-600 text-stone-900 dark:text-zinc-100">
                <SelectValue placeholder="Pilih turnamen..." />
              </SelectTrigger>
              <SelectContent>
                {tournaments.map((t) => {
                  const gameSlug = t.game?.slug as GameSlug | undefined
                  const config = gameSlug ? GAME_CONFIG[gameSlug] : null
                  return (
                    <SelectItem key={t.id} value={t.id} className="text-stone-900 dark:text-zinc-100">
                      <div className="flex items-center gap-2">
                        {config?.logo && (
                          <Image src={config.logo} alt="" width={16} height={16} className="h-4 w-4 object-contain" unoptimized />
                        )}
                        {t.name}
                      </div>
                    </SelectItem>
                  )
                })}
              </SelectContent>
            </Select>
          </div>

          {/* Title */}
          <div>
            <label className="mb-1.5 block text-xs font-medium text-stone-500 dark:text-zinc-400">
              Judul <span className="text-red-500">*</span>
            </label>
            <Input
              value={form.title}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              placeholder="Match A vs B - Round 1"
              className="bg-white dark:bg-zinc-900 border-stone-300 dark:border-zinc-600 text-stone-900 dark:text-zinc-100 focus:border-esi-red focus:ring-esi-red/20"
            />
          </div>

          {/* Description */}
          <div>
            <label className="mb-1.5 block text-xs font-medium text-stone-500 dark:text-zinc-400">Deskripsi</label>
            <Textarea
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              placeholder="Detail tambahan tentang jadwal ini..."
              rows={2}
              className="bg-white dark:bg-zinc-900 border-stone-300 dark:border-zinc-600 text-stone-900 dark:text-zinc-100 focus:border-esi-red focus:ring-esi-red/20"
            />
          </div>

          {/* Date/Time row */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1.5 block text-xs font-medium text-stone-500 dark:text-zinc-400">
                Waktu Mulai <span className="text-red-500">*</span>
              </label>
              <Input
                type="datetime-local"
                value={form.scheduled_at}
                onChange={(e) => setForm((f) => ({ ...f, scheduled_at: e.target.value }))}
                className="bg-white dark:bg-zinc-900 border-stone-300 dark:border-zinc-600 text-stone-900 dark:text-zinc-100 focus:border-esi-red focus:ring-esi-red/20"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-stone-500 dark:text-zinc-400">Waktu Selesai</label>
              <Input
                type="datetime-local"
                value={form.end_at}
                onChange={(e) => setForm((f) => ({ ...f, end_at: e.target.value }))}
                className="bg-white dark:bg-zinc-900 border-stone-300 dark:border-zinc-600 text-stone-900 dark:text-zinc-100 focus:border-esi-red focus:ring-esi-red/20"
              />
            </div>
          </div>

          {/* Venue */}
          <div>
            <label className="mb-1.5 block text-xs font-medium text-stone-500 dark:text-zinc-400">Venue</label>
            <Input
              value={form.venue}
              onChange={(e) => setForm((f) => ({ ...f, venue: e.target.value }))}
              placeholder="GOR Ngurah Rai"
              className="bg-white dark:bg-zinc-900 border-stone-300 dark:border-zinc-600 text-stone-900 dark:text-zinc-100 focus:border-esi-red focus:ring-esi-red/20"
            />
          </div>

          {/* Status (only on edit) */}
          {editingId && (
            <div>
              <label className="mb-1.5 block text-xs font-medium text-stone-500 dark:text-zinc-400">Status</label>
              <div className="flex flex-wrap gap-1.5">
                {(['upcoming', 'ongoing', 'completed', 'postponed', 'cancelled'] as ScheduleStatus[]).map((s) => {
                  const cfg = STATUS_CONFIG[s]
                  return (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setForm((f) => ({ ...f, status: s }))}
                      className={cn(
                        'rounded-lg border px-3 py-1.5 text-xs font-semibold transition-colors',
                        form.status === s
                          ? 'border-esi-red bg-esi-red text-white'
                          : 'border-stone-200 dark:border-zinc-700 text-stone-600 dark:text-zinc-400 hover:bg-stone-50 dark:hover:bg-zinc-800 dark:bg-zinc-800/50'
                      )}
                    >
                      {cfg.label}
                    </button>
                  )
                })}
              </div>
            </div>
          )}
      </>
    </FormDialog>
  )
}
