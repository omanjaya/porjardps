'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { useAuthStore } from '@/store/auth-store'
import { api } from '@/lib/api'
import { DashboardLayout } from '@/components/layouts/DashboardLayout'
import { PageHeader } from '@/components/shared/PageHeader'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { ArrowLeft } from '@phosphor-icons/react'
import type { Game, School } from '@/types'

export default function CreateTeamPage() {
  const router = useRouter()
  const { isAuthenticated, isLoading: authLoading } = useAuthStore()
  const [games, setGames] = useState<Game[]>([])
  const [schools, setSchools] = useState<School[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)

  const [teamName, setTeamName] = useState('')
  const [selectedGameId, setSelectedGameId] = useState<string>('')
  const [selectedSchoolId, setSelectedSchoolId] = useState<string>('')

  useEffect(() => {
    if (!isAuthenticated || authLoading) return
    async function load() {
      try {
        const [g, s] = await Promise.all([
          api.get<Game[]>('/games'),
          api.get<School[]>('/schools'),
        ])
        setGames((g ?? []).filter((game) => game.is_active))
        setSchools(s ?? [])
      } catch {
        toast.error('Gagal memuat data')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [isAuthenticated, authLoading])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    if (!teamName.trim()) {
      toast.error('Nama tim wajib diisi')
      return
    }
    if (!selectedGameId) {
      toast.error('Pilih cabang e-sport')
      return
    }
    if (!selectedSchoolId) {
      toast.error('Pilih sekolah')
      return
    }

    setSubmitting(true)
    try {
      await api.post('/teams', {
        name: teamName.trim(),
        game_id: selectedGameId,
        school_id: selectedSchoolId,
      })
      toast.success('Tim berhasil dibuat! Menunggu persetujuan admin.')
      router.push('/dashboard/teams')
    } catch {
      toast.error('Gagal membuat tim')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <DashboardLayout>
        <Skeleton className="h-10 w-64 bg-stone-200" />
        <Skeleton className="mt-4 h-64 w-full bg-stone-200" />
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout>
      <PageHeader
        title="Buat Tim Baru"
        description="Daftarkan tim baru untuk mengikuti turnamen"
        breadcrumbs={[
          { label: 'Tim Saya', href: '/dashboard/teams' },
          { label: 'Buat Tim' },
        ]}
      />

      <div className="mx-auto max-w-lg">
        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Team name */}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-stone-700">
              Nama Tim
            </label>
            <Input
              value={teamName}
              onChange={(e) => setTeamName(e.target.value)}
              placeholder="Masukkan nama tim"
              className="bg-white border-stone-300 text-stone-900 placeholder:text-stone-400 focus:border-porjar-red"
            />
          </div>

          {/* Game selector */}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-stone-700">
              Cabang E-Sport
            </label>
            <Select value={selectedGameId} onValueChange={(v) => setSelectedGameId(v ?? '')}>
              <SelectTrigger className="w-full bg-white border-stone-300 text-stone-900">
                <SelectValue placeholder="Pilih game" />
              </SelectTrigger>
              <SelectContent className="bg-white border-stone-200">
                {games.map((game) => (
                  <SelectItem key={game.id} value={game.id} className="text-stone-900">
                    {game.name} ({game.game_type === 'bracket' ? 'Bracket' : 'Battle Royale'})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {selectedGameId && (() => {
              const game = games.find((g) => g.id === selectedGameId)
              if (!game) return null
              return (
                <p className="mt-1 text-xs text-stone-400">
                  {game.min_team_members}-{game.max_team_members} pemain
                  {game.max_substitutes > 0 ? ` + ${game.max_substitutes} cadangan` : ''}
                </p>
              )
            })()}
          </div>

          {/* School selector */}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-stone-700">
              Sekolah
            </label>
            <Select value={selectedSchoolId} onValueChange={(v) => setSelectedSchoolId(v ?? '')}>
              <SelectTrigger className="w-full bg-white border-stone-300 text-stone-900">
                <SelectValue placeholder="Pilih sekolah" />
              </SelectTrigger>
              <SelectContent className="bg-white border-stone-200">
                {schools.map((school) => (
                  <SelectItem key={school.id} value={school.id} className="text-stone-900">
                    {school.name} ({school.level})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => router.push('/dashboard/teams')}
              className="border-stone-300 text-stone-600"
            >
              <ArrowLeft size={16} className="mr-1" />
              Batal
            </Button>
            <Button type="submit" disabled={submitting} className="flex-1 bg-porjar-red hover:bg-porjar-red-dark text-white">
              {submitting ? 'Membuat Tim...' : 'Buat Tim'}
            </Button>
          </div>
        </form>

        {/* Info */}
        <div className="mt-6 rounded-xl border-l-4 border-porjar-red bg-white border border-stone-200 p-4 text-xs text-stone-500 shadow-sm">
          <p className="font-medium text-stone-700 mb-1">Catatan:</p>
          <ul className="list-disc list-inside space-y-0.5">
            <li>Tim akan menunggu persetujuan admin sebelum bisa mengikuti turnamen.</li>
            <li>Pastikan nama tim sesuai dan tidak mengandung kata tidak pantas.</li>
            <li>Anggota tim dapat ditambahkan setelah tim dibuat.</li>
          </ul>
        </div>
      </div>
    </DashboardLayout>
  )
}
