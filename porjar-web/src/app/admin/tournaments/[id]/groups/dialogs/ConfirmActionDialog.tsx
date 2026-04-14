'use client'

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'

interface ConfirmActionDialogProps {
  action: { message: string; action: () => void } | null
  onClose: () => void
}

export function ConfirmActionDialog({ action, onClose }: ConfirmActionDialogProps) {
  return (
    <Dialog open={!!action} onOpenChange={(open) => { if (!open) onClose() }}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader><DialogTitle>Konfirmasi</DialogTitle></DialogHeader>
        <p className="text-sm text-stone-600 dark:text-zinc-400 py-2">{action?.message}</p>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Batal</Button>
          <Button onClick={() => { action?.action(); onClose() }} className="bg-esi-red hover:bg-esi-red/90">
            Ya, Lanjutkan
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
