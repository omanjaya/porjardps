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
import type { News } from '@/types'

interface DeleteNewsDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  news: News | null
  processing: boolean
  onConfirm: (news: News) => Promise<boolean>
}

export function DeleteNewsDialog({ open, onOpenChange, news, processing, onConfirm }: DeleteNewsDialogProps) {
  async function handleConfirm() {
    if (!news) return
    const ok = await onConfirm(news)
    if (ok) onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onOpenChange(false) }}>
      <DialogContent className="bg-white dark:bg-zinc-900 border-stone-200 dark:border-zinc-700 text-stone-900 dark:text-zinc-100 sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-red-600">Hapus Berita</DialogTitle>
          <DialogDescription className="text-stone-500 dark:text-zinc-400">
            Yakin hapus berita <strong className="text-stone-900 dark:text-zinc-100">{news?.title}</strong>? Tindakan ini tidak dapat dibatalkan.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} className="border-stone-300 dark:border-zinc-600 text-stone-600 dark:text-zinc-400">
            Batal
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={processing}
            className="bg-red-600 hover:bg-red-700 text-white disabled:opacity-40"
          >
            {processing ? 'Menghapus...' : 'Hapus Berita'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
