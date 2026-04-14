'use client'

import { useEffect, useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import type { User } from '@/types'

interface DeleteUserDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  user: User | null
  processing: boolean
  onConfirm: (user: User) => Promise<boolean>
}

export function DeleteUserDialog({ open, onOpenChange, user, processing, onConfirm }: DeleteUserDialogProps) {
  const [confirmName, setConfirmName] = useState('')

  useEffect(() => {
    if (!open) setConfirmName('')
  }, [open])

  async function handleConfirm() {
    if (!user) return
    const ok = await onConfirm(user)
    if (ok) onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onOpenChange(false) }}>
      <DialogContent className="bg-white dark:bg-zinc-900 border-stone-200 dark:border-zinc-700 text-stone-900 dark:text-zinc-100 sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-red-600">Hapus Pengguna</DialogTitle>
          <DialogDescription className="text-stone-500 dark:text-zinc-400">
            Yakin hapus user <strong className="text-stone-900 dark:text-zinc-100">{user?.full_name}</strong>? Data tim terkait juga akan terhapus.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3 py-2">
          <p className="text-sm text-stone-600 dark:text-zinc-400">
            Ketik <strong className="text-stone-900 dark:text-zinc-100 font-mono bg-stone-100 dark:bg-zinc-800 px-1 py-0.5 rounded">{user?.full_name}</strong> untuk mengonfirmasi penghapusan.
          </p>
          <Input
            placeholder="Ketik nama pengguna untuk konfirmasi"
            value={confirmName}
            onChange={(e) => setConfirmName(e.target.value)}
            className="bg-white dark:bg-zinc-900 border-stone-300 dark:border-zinc-600 focus:border-red-500"
          />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} className="border-stone-300 dark:border-zinc-600 text-stone-600 dark:text-zinc-400">
            Batal
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={processing || confirmName !== user?.full_name}
            className="bg-red-600 hover:bg-red-700 text-white disabled:opacity-40"
          >
            {processing ? 'Menghapus...' : 'Hapus Pengguna'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
