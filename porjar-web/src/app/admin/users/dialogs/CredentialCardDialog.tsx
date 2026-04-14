'use client'

import { useEffect, useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import type { User } from '@/types'
import type { CredentialData } from '../constants'

interface CredentialCardDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  user: User | null
  passwordOverride?: string | null
  fetchCredential: (user: User) => Promise<CredentialData | null>
}

export function CredentialCardDialog({ open, onOpenChange, user, passwordOverride, fetchCredential }: CredentialCardDialogProps) {
  const [credentialData, setCredentialData] = useState<CredentialData | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    let cancelled = false
    if (open && user) {
      setCredentialData(null)
      setLoading(true)
      fetchCredential(user).then((data) => {
        if (cancelled) return
        if (data) {
          setCredentialData(data)
        } else {
          onOpenChange(false)
        }
      }).finally(() => {
        if (!cancelled) setLoading(false)
      })
    } else if (!open) {
      setCredentialData(null)
    }
    return () => { cancelled = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, user])

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onOpenChange(false) }}>
      <DialogContent className="bg-white dark:bg-zinc-900 border-stone-200 dark:border-zinc-700 text-stone-900 dark:text-zinc-100 sm:max-w-sm">
        <DialogHeader>
          <DialogTitle className="text-stone-900 dark:text-zinc-100">Kartu Peserta</DialogTitle>
        </DialogHeader>
        {loading ? (
          <div className="flex justify-center py-8"><div className="h-6 w-6 animate-spin rounded-full border-2 border-esi-red border-t-transparent" /></div>
        ) : credentialData ? (
          <div className="overflow-hidden rounded-xl border border-stone-200 dark:border-zinc-700 shadow-sm text-[11px]">
            {/* Red header */}
            <div className="bg-[#b41e1e] px-3 py-2 flex items-center justify-between">
              <span className="font-bold text-white tracking-wide text-[10px] uppercase">ESI ESPORT 2026</span>
              {credentialData.game_display && (
                <span className="rounded-full bg-white/20 px-2 py-0.5 text-[9px] font-semibold text-white">{credentialData.game_display}</span>
              )}
            </div>
            {/* Body */}
            <div className="bg-white dark:bg-zinc-900 px-3 py-2.5 space-y-1">
              <p className="font-bold text-[12px] text-stone-900 dark:text-zinc-100">{credentialData.full_name}</p>
              {(credentialData.team_name || credentialData.member_role) && (
                <p className="text-stone-500 dark:text-zinc-400 text-[10px]">
                  {[credentialData.team_name, credentialData.member_role].filter(Boolean).join(' · ')}
                </p>
              )}
              {credentialData.school_name && (
                <p className="text-stone-400 dark:text-zinc-500 text-[10px]">{credentialData.school_name}</p>
              )}
              <div className="my-2 border-t border-stone-100 dark:border-zinc-700" />
              <div className="flex items-center gap-2">
                <span className="w-16 text-stone-400 dark:text-zinc-500">NISN</span>
                <span className="font-bold text-stone-900 dark:text-zinc-100 font-mono">{credentialData.nisn || '—'}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-16 text-stone-400 dark:text-zinc-500">Password</span>
                <span className="font-bold text-stone-900 dark:text-zinc-100 font-mono">{credentialData.password || passwordOverride || '—'}</span>
              </div>
              <p className="pt-1 text-[9px] italic text-stone-400 dark:text-zinc-500">Simpan kartu ini dan jaga kerahasiaannya</p>
            </div>
          </div>
        ) : null}
        <DialogFooter>
          <Button
            onClick={() => onOpenChange(false)}
            className="bg-esi-red hover:bg-esi-red-dark text-white"
          >
            Tutup
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
