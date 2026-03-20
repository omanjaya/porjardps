'use client'

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { LoadingSpinner } from '@/components/shared/LoadingSpinner'

interface ConfirmDialogProps {
  open: boolean
  title: string
  description: string
  confirmLabel?: string
  variant?: 'destructive' | 'default'
  onConfirm: () => void
  onCancel: () => void
  loading?: boolean
}

export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = 'Hapus',
  variant = 'destructive',
  onConfirm,
  onCancel,
  loading = false,
}: ConfirmDialogProps) {
  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onCancel()}>
      <DialogContent
        showCloseButton={false}
        className="bg-white border-stone-200 text-stone-900"
      >
        <DialogHeader>
          <DialogTitle className="text-stone-900">{title}</DialogTitle>
          <DialogDescription className="text-stone-500">
            {description}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="border-stone-200 bg-stone-50/50">
          <Button
            variant="outline"
            onClick={onCancel}
            disabled={loading}
            className="border-stone-200 bg-white text-stone-700 hover:bg-stone-50 hover:text-stone-900"
          >
            Batal
          </Button>
          <Button
            variant={variant}
            onClick={onConfirm}
            disabled={loading}
            className={
              variant === 'destructive'
                ? 'bg-red-600 text-white hover:bg-red-700'
                : 'bg-blue-600 text-white hover:bg-blue-700'
            }
          >
            {loading && <LoadingSpinner size="sm" className="mr-1.5" />}
            {confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
