'use client'

import {
  Users,
  Crown,
  UserCircle,
  ArrowsClockwise,
  Plus,
  Trash,
  TShirt,
} from '@phosphor-icons/react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import type { TeamDetail, TeamMemberRole } from '@/types'

const roleLabels: Record<string, { label: string; color: string }> = {
  captain: { label: 'Kapten', color: 'bg-amber-50 text-amber-600 border-amber-200' },
  member: { label: 'Anggota', color: 'bg-blue-50 text-blue-600 border-blue-200' },
  substitute: { label: 'Cadangan', color: 'bg-stone-100 text-stone-500 border-stone-200' },
}

const roleIcons: Record<string, typeof Crown> = {
  captain: Crown,
  member: UserCircle,
  substitute: ArrowsClockwise,
}

interface TeamMembersSectionProps {
  team: TeamDetail
  isCaptain: boolean
  showAddMember: boolean
  setShowAddMember: (v: boolean) => void
  newMemberName: string
  setNewMemberName: (v: string) => void
  newMemberGameId: string
  setNewMemberGameId: (v: string) => void
  newMemberRole: TeamMemberRole
  setNewMemberRole: (v: TeamMemberRole) => void
  addingMember: boolean
  onAddMember: () => void
  onRemoveMember: (memberId: string) => void
}

export function TeamMembersSection({
  team,
  isCaptain,
  showAddMember,
  setShowAddMember,
  newMemberName,
  setNewMemberName,
  newMemberGameId,
  setNewMemberGameId,
  newMemberRole,
  setNewMemberRole,
  addingMember,
  onAddMember,
  onRemoveMember,
}: TeamMembersSectionProps) {
  return (
    <div className="mb-6 rounded-xl border border-stone-200 bg-white p-6 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-lg font-semibold text-stone-900">
          <Users size={20} weight="bold" />
          Anggota Tim
        </h2>
        {isCaptain && (
          <Button
            size="sm"
            onClick={() => setShowAddMember(!showAddMember)}
            className="gap-1 bg-porjar-red hover:bg-porjar-red-dark text-white"
          >
            <Plus size={14} />
            Tambah
          </Button>
        )}
      </div>

      {/* Add Member Form */}
      {showAddMember && isCaptain && (
        <div className="mb-4 rounded-xl border border-stone-200 bg-porjar-bg p-4">
          <h3 className="mb-3 text-sm font-medium text-stone-700">Tambah Anggota Baru</h3>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs text-stone-500">In-Game Name *</label>
              <Input
                value={newMemberName}
                onChange={(e) => setNewMemberName(e.target.value)}
                placeholder="Nama in-game"
                className="border-stone-300 bg-white text-stone-900 focus:border-porjar-red"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs text-stone-500">In-Game ID</label>
              <Input
                value={newMemberGameId}
                onChange={(e) => setNewMemberGameId(e.target.value)}
                placeholder="ID in-game (opsional)"
                className="border-stone-300 bg-white text-stone-900 focus:border-porjar-red"
              />
            </div>
          </div>

          {/* Role selector */}
          <div className="mt-3">
            <label className="mb-1 block text-xs text-stone-500">Role</label>
            <div className="flex gap-2">
              {(['member', 'substitute'] as TeamMemberRole[]).map((role) => (
                <button
                  key={role}
                  onClick={() => setNewMemberRole(role)}
                  className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                    newMemberRole === role
                      ? 'bg-porjar-red/10 text-porjar-red border border-porjar-red/30'
                      : 'bg-white text-stone-500 border border-stone-200 hover:text-stone-700'
                  }`}
                >
                  {role === 'member' ? 'Anggota' : 'Cadangan'}
                </button>
              ))}
            </div>
          </div>

          <div className="mt-4 flex gap-2">
            <Button
              size="sm"
              onClick={onAddMember}
              disabled={addingMember || !newMemberName.trim()}
              className="bg-porjar-red hover:bg-porjar-red-dark text-white"
            >
              {addingMember ? 'Menambahkan...' : 'Tambah Anggota'}
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setShowAddMember(false)}
              className="text-stone-500 hover:text-stone-700"
            >
              Batal
            </Button>
          </div>
        </div>
      )}

      {/* Members List */}
      {team.members.length === 0 ? (
        <div className="flex flex-col items-center py-8 text-center">
          <Users size={36} weight="thin" className="mb-2 text-stone-300" />
          <p className="text-sm text-stone-500">Belum ada anggota</p>
        </div>
      ) : (
        <div className="space-y-2">
          {team.members
            .sort((a, b) => {
              const order = { captain: 0, member: 1, substitute: 2 }
              return (order[a.role] ?? 1) - (order[b.role] ?? 1)
            })
            .map((member) => {
              const roleInfo = roleLabels[member.role] ?? roleLabels.member
              const RoleIcon = roleIcons[member.role] ?? UserCircle

              return (
                <div
                  key={member.id}
                  className="flex items-center gap-4 rounded-xl border border-stone-200 bg-porjar-bg p-3"
                >
                  {/* Avatar */}
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white">
                    <RoleIcon
                      size={20}
                      weight={member.role === 'captain' ? 'fill' : 'regular'}
                      className={member.role === 'captain' ? 'text-amber-500' : 'text-stone-400'}
                    />
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="truncate text-sm font-medium text-stone-900">
                        {member.in_game_name}
                      </span>
                      <span
                        className={`rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${roleInfo.color}`}
                      >
                        {roleInfo.label}
                      </span>
                    </div>
                    {member.in_game_id && (
                      <p className="mt-0.5 text-xs text-stone-400">
                        ID: {member.in_game_id}
                      </p>
                    )}
                  </div>

                  {/* Jersey */}
                  {member.jersey_number != null && (
                    <span className="flex items-center gap-1 text-xs text-stone-400">
                      <TShirt size={12} />
                      #{member.jersey_number}
                    </span>
                  )}

                  {/* Remove button (captain only, can't remove self) */}
                  {isCaptain && member.role !== 'captain' && (
                    <button
                      onClick={() => onRemoveMember(member.id)}
                      className="rounded-md p-1.5 text-stone-400 transition-colors hover:bg-red-50 hover:text-red-500"
                      title="Hapus anggota"
                    >
                      <Trash size={16} />
                    </button>
                  )}
                </div>
              )
            })}
        </div>
      )}
    </div>
  )
}
