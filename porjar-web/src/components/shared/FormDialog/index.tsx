'use client'
import { ReactNode } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'

export interface FormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description?: string
  children: ReactNode
  onSubmit: (e: React.FormEvent) => void | Promise<void>
  submitLabel?: string
  cancelLabel?: string
  submitting?: boolean
  submitDisabled?: boolean
  submitVariant?: 'default' | 'destructive'
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl'
}

export function FormDialog({
  open, onOpenChange, title, description, children, onSubmit,
  submitLabel = 'Simpan', cancelLabel = 'Batal',
  submitting = false, submitDisabled = false, submitVariant = 'default',
  maxWidth = 'md',
}: FormDialogProps) {
  const widthClass = {
    sm: 'sm:max-w-sm', md: 'sm:max-w-md', lg: 'sm:max-w-lg',
    xl: 'sm:max-w-xl', '2xl': 'sm:max-w-2xl',
  }[maxWidth]

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={widthClass}>
        <form onSubmit={onSubmit}>
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
            {description && <DialogDescription>{description}</DialogDescription>}
          </DialogHeader>
          <div className="py-4 space-y-4">{children}</div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
              {cancelLabel}
            </Button>
            <Button type="submit" variant={submitVariant} disabled={submitting || submitDisabled}>
              {submitting ? 'Menyimpan...' : submitLabel}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
