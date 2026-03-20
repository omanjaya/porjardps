'use client'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
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
  upcoming: { label: 'Akan Datang', dot: 'bg-blue-500', bg: 'bg-blue-50', text: 'text-blue-700', ring: 'ring-blue-200' },
  ongoing: { label: 'Berlangsung', dot: 'bg-red-500 animate-pulse', bg: 'bg-red-50', text: 'text-red-700', ring: 'ring-red-200' },
  completed: { label: 'Selesai', dot: 'bg-green-500', bg: 'bg-green-50', text: 'text-green-700', ring: 'ring-green-200' },
  postponed: { label: 'Ditunda', dot: 'bg-amber-500', bg: 'bg-amber-50', text: 'text-amber-700', ring: 'ring-amber-200' },
  cancelled: { label: 'Dibatalkan', dot: 'bg-stone-400', bg: 'bg-stone-100', text: 'text-stone-500', ring: 'ring-stone-200' },
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
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-white border-stone-200 text-stone-900 sm:max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-stone-900">
            {editingId ? 'Edit Jadwal' : 'Tambah Jadwal Manual'}
          </DialogTitle>
          {editingId && form.bracket_match_id && (
            <p className="text-xs text-green-600 mt-0.5">
              Terhubung ke bracket · Waktu akan disinkronkan otomatis
            </p>
          )}
        </DialogHeader>
        <div className="space-y-4">
          {/* Tournament selector */}
          <div>
            <label className="mb-1.5 block text-xs font-medium text-stone-500">
              Turnamen <span className="text-red-500">*</span>
            </label>
            <Select value={form.tournament_id} onValueChange={(v) => setForm((f) => ({ ...f, tournament_id: v as string }))}>
              <SelectTrigger className="w-full bg-white border-stone-300 text-stone-900">
                <SelectValue placeholder="Pilih turnamen..." />
              </SelectTrigger>
              <SelectContent>
                {tournaments.map((t) => {
                  const gameSlug = t.game?.slug as GameSlug | undefined
                  const config = gameSlug ? GAME_CONFIG[gameSlug] : null
                  return (
                    <SelectItem key={t.id} value={t.id} className="text-stone-900">
                      <div className="flex items-center gap-2">
                        {config?.logo && (
                          <img src={config.logo} alt="" className="h-4 w-4 object-contain" />
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
            <label className="mb-1.5 block text-xs font-medium text-stone-500">
              Judul <span className="text-red-500">*</span>
            </label>
            <Input
              value={form.title}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              placeholder="Match A vs B - Round 1"
              className="bg-white border-stone-300 text-stone-900 focus:border-porjar-red focus:ring-porjar-red/20"
            />
          </div>

          {/* Description */}
          <div>
            <label className="mb-1.5 block text-xs font-medium text-stone-500">Deskripsi</label>
            <Textarea
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              placeholder="Detail tambahan tentang jadwal ini..."
              rows={2}
              className="bg-white border-stone-300 text-stone-900 focus:border-porjar-red focus:ring-porjar-red/20"
            />
          </div>

          {/* Date/Time row */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1.5 block text-xs font-medium text-stone-500">
                Waktu Mulai <span className="text-red-500">*</span>
              </label>
              <Input
                type="datetime-local"
                value={form.scheduled_at}
                onChange={(e) => setForm((f) => ({ ...f, scheduled_at: e.target.value }))}
                className="bg-white border-stone-300 text-stone-900 focus:border-porjar-red focus:ring-porjar-red/20"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-stone-500">Waktu Selesai</label>
              <Input
                type="datetime-local"
                value={form.end_at}
                onChange={(e) => setForm((f) => ({ ...f, end_at: e.target.value }))}
                className="bg-white border-stone-300 text-stone-900 focus:border-porjar-red focus:ring-porjar-red/20"
              />
            </div>
          </div>

          {/* Venue */}
          <div>
            <label className="mb-1.5 block text-xs font-medium text-stone-500">Venue</label>
            <Input
              value={form.venue}
              onChange={(e) => setForm((f) => ({ ...f, venue: e.target.value }))}
              placeholder="GOR Ngurah Rai"
              className="bg-white border-stone-300 text-stone-900 focus:border-porjar-red focus:ring-porjar-red/20"
            />
          </div>

          {/* Status (only on edit) */}
          {editingId && (
            <div>
              <label className="mb-1.5 block text-xs font-medium text-stone-500">Status</label>
              <div className="flex flex-wrap gap-1.5">
                {(['upcoming', 'ongoing', 'completed', 'postponed', 'cancelled'] as ScheduleStatus[]).map((s) => {
                  const cfg = STATUS_CONFIG[s]
                  return (
                    <button
                      key={s}
                      onClick={() => setForm((f) => ({ ...f, status: s }))}
                      className={cn(
                        'rounded-lg border px-3 py-1.5 text-xs font-semibold transition-colors',
                        form.status === s
                          ? 'border-porjar-red bg-porjar-red text-white'
                          : 'border-stone-200 text-stone-600 hover:bg-stone-50'
                      )}
                    >
                      {cfg.label}
                    </button>
                  )
                })}
              </div>
            </div>
          )}
        </div>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="border-stone-300 text-stone-600"
          >
            Batal
          </Button>
          <Button
            onClick={onSubmit}
            disabled={submitting}
            className="bg-porjar-red hover:bg-porjar-red-dark text-white"
          >
            {submitting ? 'Menyimpan...' : editingId ? 'Perbarui' : 'Simpan'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
