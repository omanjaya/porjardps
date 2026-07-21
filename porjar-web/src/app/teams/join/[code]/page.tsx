'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import {
  Shield,
  Users,
  GameController,
  WarningCircle,
  CheckCircle,
} from '@phosphor-icons/react'
import { api, ApiError } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { useUser } from '@/store/auth-store'

interface InviteInfo {
  team_id: string
  team_name: string
  game_name: string
  game_slug: string
  school_id: string | null
  member_count: number
  max_members: number
  expires_at: string
  is_full: boolean
}

export default function JoinTeamPage() {
  const params = useParams<{ code: string }>()
  const router = useRouter()
  const user = useUser()

  const [info, setInfo] = useState<InviteInfo | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [joining, setJoining] = useState(false)
  const [success, setSuccess] = useState(false)

  // Form
  const [inGameName, setInGameName] = useState(user?.full_name || '')
  const [inGameId, setInGameId] = useState('')

  useEffect(() => {
    async function fetchInfo() {
      try {
        const data = await api.get<InviteInfo>(`/teams/invite/${params.code}`)
        setInfo(data)
      } catch (err) {
        if (err instanceof ApiError) {
          setError(err.message)
        } else {
          setError('Link undangan tidak valid atau sudah kedaluwarsa')
        }
      } finally {
        setLoading(false)
      }
    }
    fetchInfo()
  }, [params.code])

  async function handleJoin() {
    if (!inGameName.trim()) return

    setJoining(true)
    setError(null)
    try {
      await api.post(`/teams/join/${params.code}`, {
        in_game_name: inGameName.trim(),
        in_game_id: inGameId.trim() || undefined,
      })
      setSuccess(true)
      setTimeout(() => {
        router.push('/dashboard')
      }, 2000)
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message)
      } else {
        setError('Gagal bergabung ke tim')
      }
    } finally {
      setJoining(false)
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-[100dvh] items-center justify-center bg-esi-bg p-4">
        <div className="w-full max-w-md space-y-4">
          <Skeleton className="h-8 w-48 rounded-lg bg-stone-200 dark:bg-zinc-700" />
          <Skeleton className="h-40 rounded-xl bg-stone-200 dark:bg-zinc-700" />
          <Skeleton className="h-32 rounded-xl bg-stone-200 dark:bg-zinc-700" />
        </div>
      </div>
    )
  }

  if (success) {
    return (
      <div className="flex min-h-[100dvh] items-center justify-center bg-esi-bg p-4">
        <div className="w-full max-w-md text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-50 dark:bg-green-950">
            <CheckCircle size={40} weight="fill" className="text-green-500" />
          </div>
          <h1 className="text-xl font-bold text-stone-900 dark:text-zinc-100">Berhasil Bergabung!</h1>
          <p className="mt-2 text-sm text-stone-500 dark:text-zinc-400">
            Kamu berhasil bergabung ke tim {info?.team_name}. Mengalihkan ke dashboard...
          </p>
        </div>
      </div>
    )
  }

  if (!info) {
    return (
      <div className="flex min-h-[100dvh] items-center justify-center bg-esi-bg p-4">
        <div className="w-full max-w-md text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-50 dark:bg-red-950">
            <WarningCircle size={40} weight="fill" className="text-red-500" />
          </div>
          <h1 className="text-xl font-bold text-stone-900 dark:text-zinc-100">Link Tidak Valid</h1>
          <p className="mt-2 text-sm text-stone-500 dark:text-zinc-400">
            {error ?? 'Link undangan tidak valid atau sudah kedaluwarsa.'}
          </p>
          <Button
            className="mt-4 bg-esi-red hover:bg-esi-red-dark text-white"
            onClick={() => router.push('/')}
          >
            Kembali ke Beranda
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-[100dvh] items-center justify-center bg-esi-bg p-4">
      <div className="w-full max-w-md">
        <h1 className="mb-6 text-center text-2xl font-bold text-stone-900 dark:text-zinc-100">Gabung Tim</h1>

        {/* Team Info Card */}
        <div className="mb-6 rounded-xl border border-stone-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 p-6 shadow-sm">
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-stone-100 dark:bg-zinc-800">
              <Shield size={28} weight="duotone" className="text-stone-400 dark:text-zinc-500" />
            </div>
            <div className="min-w-0 flex-1">
              <h2 className="truncate text-lg font-bold text-stone-900 dark:text-zinc-100">{info.team_name}</h2>
              <div className="mt-1 flex flex-wrap items-center gap-3 text-sm text-stone-500 dark:text-zinc-400">
                <span className="inline-flex items-center gap-1">
                  <GameController size={14} />
                  {info.game_name}
                </span>
                <span className="inline-flex items-center gap-1">
                  <Users size={14} />
                  {info.member_count}/{info.max_members}
                </span>
              </div>
            </div>
          </div>

          {info.is_full && (
            <div className="mt-4 rounded-lg border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950 px-3 py-2 text-sm text-amber-600">
              Tim ini sudah penuh dan tidak dapat menerima anggota baru.
            </div>
          )}

          <div className="mt-4 rounded-lg border border-stone-200 dark:border-zinc-700 bg-stone-50 dark:bg-zinc-800/50 px-3 py-2 text-xs text-stone-500 dark:text-zinc-400">
            Tim baru mungkin masih menunggu persetujuan admin sebelum dapat mengikuti turnamen.
          </div>
        </div>

        {/* Join Form */}
        {!info.is_full && (
          <div className="rounded-xl border border-stone-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 p-6 shadow-sm">
            {!user ? (
              <div className="text-center">
                <p className="mb-4 text-sm text-stone-500 dark:text-zinc-400">
                  Kamu harus login terlebih dahulu untuk bergabung ke tim.
                </p>
                <Button
                  className="bg-esi-red hover:bg-esi-red-dark text-white"
                  onClick={() => router.push(`/login?redirect=/teams/join/${params.code}`)}
                >
                  Login untuk Bergabung
                </Button>
              </div>
            ) : (
              <>
                <div className="space-y-4">
                  <div>
                    <label className="mb-1 block text-sm font-medium text-stone-700 dark:text-zinc-300">
                      In-Game Name <span className="text-red-500">*</span>
                    </label>
                    <Input
                      value={inGameName}
                      onChange={(e) => setInGameName(e.target.value)}
                      placeholder="Nama in-game kamu"
                      className="border-stone-300 bg-white dark:bg-zinc-900 text-stone-900 dark:text-zinc-100 focus:border-esi-red"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-medium text-stone-700 dark:text-zinc-300">
                      In-Game ID <span className="text-xs text-stone-400 dark:text-zinc-500">(opsional)</span>
                    </label>
                    <Input
                      value={inGameId}
                      onChange={(e) => setInGameId(e.target.value)}
                      placeholder="ID in-game kamu"
                      className="border-stone-300 bg-white dark:bg-zinc-900 text-stone-900 dark:text-zinc-100 focus:border-esi-red"
                    />
                  </div>
                </div>

                {error && (
                  <div className="mt-4 rounded-lg border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950 px-3 py-2 text-sm text-red-600">
                    {error}
                  </div>
                )}

                <Button
                  className="mt-6 w-full bg-esi-red hover:bg-esi-red-dark text-white"
                  onClick={handleJoin}
                  disabled={joining || !inGameName.trim()}
                >
                  {joining ? 'Bergabung...' : 'Gabung Tim'}
                </Button>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
