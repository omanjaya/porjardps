'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import {
  Shield,
  Users,
  PencilSimple,
  WarningCircle,
  GameController,
  Camera,
  Trash,
} from '@phosphor-icons/react'
import { toast } from 'sonner'
import { useRef } from 'react'
import { api, ApiError } from '@/lib/api'
import { mediaUrl } from '@/lib/utils'
import { convertToWebP } from '@/lib/imageUtils'
import { DashboardLayout } from '@/components/layouts/DashboardLayout'
import { PageHeader } from '@/components/shared/PageHeader'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { EmptyState } from '@/components/shared/EmptyState'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { GAME_CONFIG } from '@/constants/games'
import { useAuthStore } from '@/store/auth-store'
import { InviteLinkCard } from '@/components/modules/team/InviteLinkCard'
import { TeamMembersSection } from './TeamMembersSection'
import { TeamTournamentSection } from './TeamTournamentSection'
import type { TeamDetail, TeamMember, Tournament, GameSlug, TeamMemberRole } from '@/types'

export default function TeamManagePage() {
  const params = useParams<{ id: string }>()
  const router = useRouter()
  const { user, isAuthenticated, isLoading: authLoading } = useAuthStore()

  const [team, setTeam] = useState<TeamDetail | null>(null)
  const [availableTournaments, setAvailableTournaments] = useState<Tournament[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Edit team state
  const [editing, setEditing] = useState(false)
  const [editName, setEditName] = useState('')
  const [saving, setSaving] = useState(false)

  // Add member state
  const [showAddMember, setShowAddMember] = useState(false)
  const [newMemberName, setNewMemberName] = useState('')
  const [newMemberGameId, setNewMemberGameId] = useState('')
  const [newMemberRole, setNewMemberRole] = useState<TeamMemberRole>('member')
  const [addingMember, setAddingMember] = useState(false)

  // Remove member state
  const [removeMemberId, setRemoveMemberId] = useState<string | null>(null)
  const [removingMember, setRemovingMember] = useState(false)

  // Register tournament state
  const [registeringTournament, setRegisteringTournament] = useState<string | null>(null)
  const [registerConfirm, setRegisterConfirm] = useState<{ tournamentId: string; tournamentName: string } | null>(null)

  // Logo upload
  const [uploadingLogo, setUploadingLogo] = useState(false)
  const logoInputRef = useRef<HTMLInputElement>(null)

  // Delete team
  const [deleteConfirm, setDeleteConfirm] = useState(false)
  const [deleteInput, setDeleteInput] = useState('')
  const [deletingTeam, setDeletingTeam] = useState(false)

  const isCaptain = team?.captain?.id === user?.id

  const fetchTeam = useCallback(async () => {
    if (!isAuthenticated || authLoading) return
    try {
      const data = await api.get<TeamDetail>(`/teams/${params.id}`)
      setTeam(data)
      setEditName(data.name)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal memuat data tim')
    } finally {
      setLoading(false)
    }
  }, [params.id, isAuthenticated, authLoading])

  const fetchTournaments = useCallback(async () => {
    if (!isAuthenticated || authLoading) return
    try {
      const data = await api.get<Tournament[]>('/tournaments?status=registration')
      setAvailableTournaments(data ?? [])
    } catch (err) {
      console.error('Gagal memuat turnamen:', err)
    }
  }, [isAuthenticated, authLoading])

  useEffect(() => {
    fetchTeam()
    fetchTournaments()
  }, [fetchTeam, fetchTournaments])

  // --- Handlers ---

  async function handleSaveTeamName() {
    if (!editName.trim() || !team) return
    setSaving(true)
    try {
      await api.put(`/teams/${team.id}`, { name: editName.trim() })
      setTeam((prev) => (prev ? { ...prev, name: editName.trim() } : prev))
      setEditing(false)
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Gagal menyimpan nama tim')
    } finally {
      setSaving(false)
    }
  }

  async function handleAddMember() {
    if (!newMemberName.trim() || !team) return
    setAddingMember(true)
    try {
      await api.post(`/teams/${team.id}/members`, {
        in_game_name: newMemberName.trim(),
        in_game_id: newMemberGameId.trim() || null,
        role: newMemberRole,
      })
      setNewMemberName('')
      setNewMemberGameId('')
      setNewMemberRole('member')
      setShowAddMember(false)
      await fetchTeam()
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Gagal menambahkan anggota')
    } finally {
      setAddingMember(false)
    }
  }

  async function handleRemoveMember() {
    if (!removeMemberId || !team) return
    setRemovingMember(true)
    try {
      await api.delete(`/teams/${team.id}/members/${removeMemberId}`)
      setRemoveMemberId(null)
      await fetchTeam()
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Gagal menghapus anggota')
    } finally {
      setRemovingMember(false)
    }
  }

  async function handleLogoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file || !team) return
    if (file.size > 5 * 1024 * 1024) { toast.error('Ukuran logo maksimal 5 MB'); return }
    setUploadingLogo(true)
    try {
      const webp = await convertToWebP(file, { maxSize: 400, quality: 0.88 })
      const uploaded = await api.upload<{ url: string }>('/upload', webp)
      await api.put(`/teams/${team.id}`, { logo_url: uploaded.url })
      toast.success('Logo tim diperbarui')
      await fetchTeam()
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Gagal mengupload logo')
    } finally {
      setUploadingLogo(false)
      if (logoInputRef.current) logoInputRef.current.value = ''
    }
  }

  async function handleDeleteTeam() {
    if (!team || deleteInput !== team.name) return
    setDeletingTeam(true)
    try {
      await api.delete(`/teams/${team.id}`)
      toast.success('Tim berhasil dihapus')
      router.push('/dashboard')
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Gagal menghapus tim')
      setDeletingTeam(false)
    }
  }

  async function handleRegisterTournament(tournamentId: string) {
    if (!team) return
    setRegisteringTournament(tournamentId)
    try {
      await api.post(`/tournaments/${tournamentId}/teams`, { team_id: team.id })
      await Promise.all([fetchTeam(), fetchTournaments()])
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Gagal mendaftar turnamen')
    } finally {
      setRegisteringTournament(null)
    }
  }

  // --- Render ---

  if (loading) {
    return (
      <DashboardLayout>
        <div className="space-y-6">
          <Skeleton className="h-10 w-48 rounded-lg bg-stone-200" />
          <Skeleton className="h-40 rounded-xl bg-stone-200" />
          <Skeleton className="h-60 rounded-xl bg-stone-200" />
        </div>
      </DashboardLayout>
    )
  }

  if (error || !team) {
    return (
      <DashboardLayout>
        <EmptyState
          icon={WarningCircle}
          title={error ? 'Terjadi Kesalahan' : 'Tim Tidak Ditemukan'}
          description={error ?? 'Tim yang kamu cari tidak ada atau sudah dihapus.'}
        />
      </DashboardLayout>
    )
  }

  const gameSlug = team.game.slug as GameSlug
  const gameConfig = GAME_CONFIG[gameSlug]
  const GameIcon = gameConfig?.icon ?? GameController

  const enrolledTournamentIds = new Set((team.tournaments ?? []).map((t) => t.id))
  const registrableTournaments = availableTournaments.filter(
    (t) => !enrolledTournamentIds.has(t.id) && t.game.slug === team.game.slug
  )

  return (
    <DashboardLayout>
      <PageHeader
        title=""
        breadcrumbs={[
          { label: 'Tim Saya', href: '/dashboard' },
          { label: team.name },
        ]}
      />

      {/* Team Info Header */}
      <div className="mb-6 rounded-xl border border-stone-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:gap-6">
          {/* Logo */}
          <div className="relative shrink-0">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-stone-100 overflow-hidden">
              {team.logo_url ? (
                <img src={mediaUrl(team.logo_url)!} alt="" className="h-16 w-16 rounded-2xl object-cover" />
              ) : (
                <Shield size={32} weight="duotone" className="text-stone-400" />
              )}
            </div>
            {isCaptain && (
              <button
                onClick={() => logoInputRef.current?.click()}
                disabled={uploadingLogo}
                className="absolute -bottom-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full bg-porjar-red text-white shadow hover:bg-porjar-red-dark disabled:opacity-50 transition-colors"
                title="Ubah logo tim"
              >
                <Camera size={12} />
              </button>
            )}
            <input ref={logoInputRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={handleLogoUpload} />
          </div>

          <div className="flex-1">
            {editing ? (
              <div>
                <div className="flex items-center gap-2">
                  <Input
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="max-w-xs border-stone-300 bg-white text-stone-900 focus:border-porjar-red"
                    onKeyDown={(e) => e.key === 'Enter' && handleSaveTeamName()}
                    maxLength={50}
                  />
                  <Button
                    size="sm"
                    onClick={handleSaveTeamName}
                    disabled={saving || editName.trim().length < 3 || editName.trim().length > 50}
                    className="bg-porjar-red hover:bg-porjar-red-dark text-white"
                  >
                    Simpan
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      setEditing(false)
                      setEditName(team.name)
                    }}
                    className="text-stone-500 hover:text-stone-700"
                  >
                    Batal
                  </Button>
                </div>
                {editName.trim().length > 0 && editName.trim().length < 3 && (
                  <p className="mt-1 text-xs text-red-500">Nama tim minimal 3 karakter</p>
                )}
                {editName.trim().length > 50 && (
                  <p className="mt-1 text-xs text-red-500">Nama tim maksimal 50 karakter</p>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-3">
                <h1 className="text-xl font-bold text-stone-900">{team.name}</h1>
                <StatusBadge status={team.status} />
                {isCaptain && (
                  <button
                    onClick={() => setEditing(true)}
                    className="rounded-md p-1 text-stone-400 transition-colors hover:bg-stone-100 hover:text-stone-600"
                  >
                    <PencilSimple size={16} />
                  </button>
                )}
              </div>
            )}

            <div className="mt-1 flex flex-wrap items-center gap-3 text-sm text-stone-500">
              <span
                className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold ${gameConfig?.bgColor ?? 'bg-stone-100'} ${gameConfig?.color ?? 'text-stone-500'} border ${gameConfig?.borderColor ?? 'border-stone-200'}`}
              >
                <GameIcon size={12} weight="fill" />
                {team.game.name}
              </span>
              {team.school && <span>{team.school.name}</span>}
              <span className="flex items-center gap-1">
                <Users size={14} />
                {team.member_count} anggota
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Members Section */}
      <TeamMembersSection
        team={team}
        isCaptain={isCaptain}
        showAddMember={showAddMember}
        setShowAddMember={setShowAddMember}
        newMemberName={newMemberName}
        setNewMemberName={setNewMemberName}
        newMemberGameId={newMemberGameId}
        setNewMemberGameId={setNewMemberGameId}
        newMemberRole={newMemberRole}
        setNewMemberRole={setNewMemberRole}
        addingMember={addingMember}
        onAddMember={handleAddMember}
        onRemoveMember={(memberId) => setRemoveMemberId(memberId)}
      />

      {/* Invite Link (captain only) */}
      {isCaptain && (
        <div className="mb-6">
          <InviteLinkCard teamId={team.id} />
        </div>
      )}

      {/* Tournament Registration */}
      <TeamTournamentSection
        team={team}
        isCaptain={isCaptain}
        registrableTournaments={registrableTournaments}
        registeringTournament={registeringTournament}
        onRegisterConfirm={setRegisterConfirm}
      />

      {/* Confirm Remove Member Dialog */}
      <ConfirmDialog
        open={!!removeMemberId}
        title="Hapus Anggota"
        description="Apakah kamu yakin ingin menghapus anggota ini dari tim? Tindakan ini tidak bisa dibatalkan."
        confirmLabel="Hapus"
        variant="destructive"
        onConfirm={handleRemoveMember}
        onCancel={() => setRemoveMemberId(null)}
        loading={removingMember}
      />

      {/* Danger zone — captain only */}
      {isCaptain && (
        <div className="mt-6 rounded-xl border border-red-200 bg-red-50/50 p-5">
          <h3 className="mb-1 text-sm font-semibold text-red-700">Zona Berbahaya</h3>
          <p className="mb-3 text-xs text-red-500">
            Menghapus tim bersifat permanen. Semua data anggota dan riwayat tim akan hilang.
            Tim yang masih terdaftar di turnamen aktif tidak bisa dihapus.
          </p>
          <Button
            variant="outline"
            onClick={() => { setDeleteConfirm(true); setDeleteInput('') }}
            className="border-red-300 text-red-600 hover:bg-red-100 hover:text-red-700"
          >
            <Trash size={14} className="mr-1.5" />
            Hapus Tim
          </Button>
        </div>
      )}

      {/* Delete team confirmation dialog */}
      <Dialog open={deleteConfirm} onOpenChange={(open) => { if (!open) { setDeleteConfirm(false); setDeleteInput('') } }}>
        <DialogContent className="bg-white border-stone-200">
          <DialogHeader>
            <DialogTitle className="text-red-700">Hapus Tim</DialogTitle>
            <DialogDescription className="text-stone-500">
              Tindakan ini <strong>tidak dapat dibatalkan</strong>. Semua data anggota, undangan, dan riwayat tim akan dihapus permanen.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700">
              <strong>{team.member_count} anggota</strong> aktif akan dikeluarkan dari tim ini.
            </div>
            <div>
              <p className="mb-1.5 text-xs text-stone-600">
                Ketik <strong className="text-stone-900">{team.name}</strong> untuk mengkonfirmasi:
              </p>
              <Input
                value={deleteInput}
                onChange={(e) => setDeleteInput(e.target.value)}
                placeholder={team.name}
                className="border-stone-200 focus:border-red-400"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setDeleteConfirm(false); setDeleteInput('') }} className="border-stone-300">
              Batal
            </Button>
            <Button
              onClick={handleDeleteTeam}
              disabled={deleteInput !== team.name || deletingTeam}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              {deletingTeam ? 'Menghapus...' : 'Ya, Hapus Tim'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirm Register Tournament Dialog */}
      <Dialog open={!!registerConfirm} onOpenChange={(open) => !open && setRegisterConfirm(null)}>
        <DialogContent className="bg-white border-stone-200 text-stone-900">
          <DialogHeader>
            <DialogTitle>Konfirmasi Pendaftaran</DialogTitle>
            <DialogDescription className="text-stone-500">
              Daftarkan tim ke turnamen <strong>{registerConfirm?.tournamentName}</strong>? Tindakan ini tidak dapat dibatalkan.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRegisterConfirm(null)} className="border-stone-300">Batal</Button>
            <Button
              onClick={() => {
                handleRegisterTournament(registerConfirm!.tournamentId)
                setRegisterConfirm(null)
              }}
              className="bg-porjar-red hover:bg-porjar-red-dark text-white"
            >
              Ya, Daftarkan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  )
}
