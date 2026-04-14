'use client'

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { WarningCircle } from '@phosphor-icons/react'
import type { ConfirmAction } from '../hooks/useTeamCrud'

interface Props {
  confirmAction: ConfirmAction | null
  onOpenChange: (open: boolean) => void
  processing: boolean
  onConfirm: () => void
}

export function BulkActionDialog({ confirmAction, onOpenChange, processing, onConfirm }: Props) {
  return (
    <Dialog open={!!confirmAction} onOpenChange={(open) => !open && onOpenChange(false)}>
      <DialogContent className="bg-white dark:bg-zinc-900 border-stone-200 dark:border-zinc-700 text-stone-900 dark:text-zinc-100">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-stone-900 dark:text-zinc-100">
            <WarningCircle size={20} className={confirmAction?.action === 'delete' ? 'text-red-500' : 'text-amber-500'} />
            Konfirmasi {confirmAction?.action === 'approve' ? 'Approve' : confirmAction?.action === 'reject' ? 'Reject' : 'Hapus'}
          </DialogTitle>
          <DialogDescription className="text-stone-500 dark:text-zinc-400">
            {confirmAction?.action === 'approve' && `Setujui tim "${confirmAction?.teamName}" untuk mengikuti turnamen?`}
            {confirmAction?.action === 'reject' && `Tolak pendaftaran tim "${confirmAction?.teamName}"?`}
            {confirmAction?.action === 'delete' && `Hapus tim "${confirmAction?.teamName}" secara permanen? Tindakan ini tidak bisa dibatalkan.`}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} className="border-stone-300 dark:border-zinc-600 text-stone-600 dark:text-zinc-400">Batal</Button>
          <Button
            onClick={onConfirm}
            disabled={processing}
            className={confirmAction?.action === 'approve' ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'}
          >
            {processing ? 'Memproses...' : confirmAction?.action === 'approve' ? 'Ya, Approve' : confirmAction?.action === 'reject' ? 'Ya, Reject' : 'Ya, Hapus'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
