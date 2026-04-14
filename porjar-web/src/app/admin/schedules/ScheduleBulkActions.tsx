'use client'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  Clock,
  Trash,
} from '@phosphor-icons/react'
import { cn } from '@/lib/utils'

interface ScheduleBulkActionsProps {
  selectedIds: Set<string>
  toggleSelectAll: () => void
  totalCount: number
  onBulkDelete: () => void
  onShift: () => void
  onClearSelection: () => void
  // Shift dialog state
  shiftOpen: boolean
  setShiftOpen: (open: boolean) => void
  shiftTarget: 'selected' | number
  shiftMinutes: string
  setShiftMinutes: (value: string) => void
  shifting: boolean
  onShiftSubmit: () => void
}

export function ScheduleBulkActions({
  selectedIds,
  toggleSelectAll,
  totalCount,
  onBulkDelete,
  onShift,
  onClearSelection,
  shiftOpen,
  setShiftOpen,
  shiftTarget,
  shiftMinutes,
  setShiftMinutes,
  shifting,
  onShiftSubmit,
}: ScheduleBulkActionsProps) {
  return (
    <>
      {/* Bulk action bar */}
      {selectedIds.size > 0 && (
        <div className="mb-4 flex items-center gap-3 rounded-lg border border-esi-red/20 bg-esi-red/5 px-4 py-2.5">
          <input
            type="checkbox"
            checked={selectedIds.size === totalCount}
            onChange={toggleSelectAll}
            className="rounded border-stone-300"
          />
          <span className="text-sm font-medium text-stone-700 dark:text-zinc-200">
            {selectedIds.size} jadwal dipilih
          </span>
          <Button
            size="sm"
            variant="outline"
            onClick={onShift}
            className="ml-auto border-stone-300"
          >
            <Clock size={14} className="mr-1" />
            Geser Waktu
          </Button>
          <Button
            size="sm"
            variant="destructive"
            onClick={onBulkDelete}
          >
            <Trash size={14} className="mr-1" />
            Hapus ({selectedIds.size})
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={onClearSelection}
            className="border-stone-300 text-stone-600"
          >
            Batal
          </Button>
        </div>
      )}

      {/* Geser Jadwal Dialog */}
      <Dialog open={shiftOpen} onOpenChange={setShiftOpen}>
        <DialogContent className="bg-white border-stone-200 sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-stone-900">Geser Jadwal</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <p className="text-sm text-stone-500">
              {shiftTarget === 'selected'
                ? `Geser ${selectedIds.size} jadwal yang dipilih`
                : `Geser semua jadwal Day ${shiftTarget}`
              }
            </p>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-stone-500">Geser (menit)</label>
              <Input
                type="number"
                value={shiftMinutes}
                onChange={(e) => setShiftMinutes(e.target.value)}
                onFocus={(e) => e.target.select()}
                placeholder="misal: 60 (maju 1 jam) atau -30 (mundur 30 menit)"
                className="bg-white border-stone-300 text-stone-900 focus:border-esi-red [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none"
              />
              <div className="mt-2 flex flex-wrap gap-1.5">
                {[-60, -30, -15, 15, 30, 60].map((m) => (
                  <button
                    key={m}
                    onClick={() => setShiftMinutes(String(m))}
                    className={cn(
                      'rounded-md border px-2.5 py-1 text-xs font-semibold transition-colors',
                      shiftMinutes === String(m)
                        ? 'border-esi-red bg-esi-red text-white'
                        : 'border-stone-200 text-stone-600 hover:bg-stone-50'
                    )}
                  >
                    {m > 0 ? '+' : ''}{m}m
                  </button>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShiftOpen(false)} className="border-stone-300 text-stone-600">
              Batal
            </Button>
            <Button onClick={onShiftSubmit} disabled={shifting || !shiftMinutes} className="bg-esi-red hover:bg-esi-red-dark text-white">
              {shifting ? 'Menggeser...' : 'Geser Jadwal'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
