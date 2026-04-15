'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { api } from '@/lib/api'
import { CheckCircle, WarningCircle, CircleNotch } from '@phosphor-icons/react'

export default function VerifyEmailPage() {
  const params = useParams<{ token: string }>()
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading')
  const [message, setMessage] = useState('')

  useEffect(() => {
    api.post(`/auth/verify-email/${params.token}`, {})
      .then(() => {
        setStatus('success')
        setMessage('Email kamu berhasil terverifikasi.')
      })
      .catch((err: unknown) => {
        setStatus('error')
        const msg = err instanceof Error ? err.message : 'Link tidak valid atau sudah kadaluarsa'
        setMessage(msg)
      })
  }, [params.token])

  return (
    <div className="mx-auto max-w-md w-full rounded-2xl bg-white dark:bg-zinc-900 shadow-xl ring-1 ring-stone-200/50 dark:ring-zinc-800 p-8 text-center">
      {status === 'loading' && (
        <>
          <CircleNotch size={48} className="mx-auto mb-4 text-esi-red animate-spin" />
          <h2 className="text-lg font-bold text-stone-900 dark:text-zinc-100 mb-2">Memverifikasi...</h2>
          <p className="text-sm text-stone-500 dark:text-zinc-400">Mohon tunggu sebentar.</p>
        </>
      )}
      {status === 'success' && (
        <>
          <CheckCircle size={48} weight="fill" className="mx-auto mb-4 text-green-500" />
          <h2 className="text-lg font-bold text-stone-900 dark:text-zinc-100 mb-2">Email Terverifikasi!</h2>
          <p className="text-sm text-stone-500 dark:text-zinc-400 mb-6">{message}</p>
          <Link href="/login" className="inline-flex items-center justify-center rounded-xl bg-esi-red px-6 py-3 text-sm font-bold text-white hover:brightness-110 transition">
            Login Sekarang
          </Link>
        </>
      )}
      {status === 'error' && (
        <>
          <WarningCircle size={48} weight="fill" className="mx-auto mb-4 text-red-500" />
          <h2 className="text-lg font-bold text-stone-900 dark:text-zinc-100 mb-2">Verifikasi Gagal</h2>
          <p className="text-sm text-stone-500 dark:text-zinc-400 mb-6">{message}</p>
          <Link href="/login" className="inline-flex items-center justify-center rounded-xl border border-stone-300 dark:border-zinc-600 px-6 py-3 text-sm font-bold text-stone-700 dark:text-zinc-300 hover:bg-stone-50 dark:hover:bg-zinc-800 transition">
            Ke Login
          </Link>
        </>
      )}
    </div>
  )
}
