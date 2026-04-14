'use client'

import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Copy, Eye, EyeSlash, IdentificationCard } from '@phosphor-icons/react'
import type { User } from '@/types'
import type { CredentialData } from '../constants'

interface ResetPasswordDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  user: User | null
  processing: boolean
  onReset: (user: User) => Promise<{ password: string; credential: CredentialData | null } | null>
  onShowCard: (user: User, password: string) => void
}

export function ResetPasswordDialog({ open, onOpenChange, user, processing, onReset, onShowCard }: ResetPasswordDialogProps) {
  const [generatedPassword, setGeneratedPassword] = useState<string | null>(null)
  const [credentialData, setCredentialData] = useState<CredentialData | null>(null)
  const [showPassword, setShowPassword] = useState(false)

  useEffect(() => {
    if (!open) {
      setGeneratedPassword(null)
      setCredentialData(null)
      setShowPassword(false)
    }
  }, [open])

  function copyToClipboard(text: string) {
    navigator.clipboard.writeText(text).then(() => {
      toast.success('Password disalin ke clipboard')
    }).catch(() => {
      toast.error('Gagal menyalin password')
    })
  }

  async function handleReset() {
    if (!user) return
    const result = await onReset(user)
    if (result) {
      setGeneratedPassword(result.password)
      setCredentialData(result.credential)
    }
  }

  function handleShowCard() {
    if (!user || !generatedPassword) return
    const u = user
    const pw = generatedPassword
    onOpenChange(false)
    onShowCard(u, pw)
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onOpenChange(false) }}>
      <DialogContent className="bg-white dark:bg-zinc-900 border-stone-200 dark:border-zinc-700 text-stone-900 dark:text-zinc-100 sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-stone-900 dark:text-zinc-100">
            {generatedPassword ? 'Password Baru' : 'Reset Password'}
          </DialogTitle>
          <DialogDescription className="text-stone-500 dark:text-zinc-400">
            {generatedPassword
              ? <>Password baru untuk <strong className="text-stone-900 dark:text-zinc-100">{user?.full_name}</strong>. Salin sekarang, password ini hanya ditampilkan sekali.</>
              : <>Reset password user <strong className="text-stone-900 dark:text-zinc-100">{user?.full_name}</strong>? Password baru akan dibuat secara otomatis.</>
            }
          </DialogDescription>
        </DialogHeader>

        {generatedPassword ? (
          <div className="py-2">
            <div className="flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 dark:bg-amber-950/30 p-3">
              <code className="flex-1 font-mono text-sm text-stone-900 dark:text-zinc-100 select-all">
                {showPassword ? generatedPassword : '••••••••••••'}
              </code>
              <button
                onClick={() => setShowPassword((v) => !v)}
                className="rounded p-1 text-stone-500 dark:text-zinc-400 hover:text-stone-700 dark:text-zinc-300 hover:bg-amber-100 transition-colors"
                title={showPassword ? 'Sembunyikan' : 'Tampilkan'}
              >
                {showPassword ? <EyeSlash size={16} /> : <Eye size={16} />}
              </button>
              <button
                onClick={() => copyToClipboard(generatedPassword)}
                className="rounded p-1 text-stone-500 dark:text-zinc-400 hover:text-stone-700 dark:text-zinc-300 hover:bg-amber-100 transition-colors"
                title="Salin password"
              >
                <Copy size={16} />
              </button>
            </div>
            <p className="mt-2 text-xs text-amber-600">
              Password ini hanya ditampilkan sekali. Pastikan sudah disalin sebelum menutup dialog.
            </p>
          </div>
        ) : null}

        <DialogFooter>
          {generatedPassword ? (
            <div className="flex gap-2 flex-wrap justify-end">
              {credentialData && (
                <Button
                  variant="outline"
                  onClick={handleShowCard}
                  className="border-indigo-300 text-indigo-600 hover:bg-indigo-50"
                >
                  <IdentificationCard size={15} className="mr-1" />
                  Lihat Kartu
                </Button>
              )}
              <Button
                onClick={() => onOpenChange(false)}
                className="bg-esi-red hover:bg-esi-red-dark text-white"
              >
                Tutup
              </Button>
            </div>
          ) : (
            <>
              <Button variant="outline" onClick={() => onOpenChange(false)} className="border-stone-300 dark:border-zinc-600 text-stone-600 dark:text-zinc-400">
                Batal
              </Button>
              <Button onClick={handleReset} disabled={processing} className="bg-amber-500 hover:bg-amber-600 text-white">
                {processing ? 'Mereset...' : 'Ya, Reset Password'}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
