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
  captain: { label: 'Kapten', color: 'bg-amber-50 dark:bg-amber-950/30 text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-800' },
  member: { label: 'Anggota', color: 'bg-blue-50 dark:bg-blue-950/30 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-800' },
  substitute: { label: 'Cadangan', color: 'bg-stone-100 dark:bg-zinc-800 text-stone-500 dark:text-zinc-400 border-stone-200 dark:border-zinc-700' },
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
    <div className="mb-6 rounded-xl border border-stone-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 p-6 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-lg font-semibold text-stone-900 dark:text-zinc-100">
          <Users size={20} weight="bold" />
          Anggota Tim
        </h2>
        {isCaptain && (
          <Button
            size="sm"
            onClick={() => setShowAddMember(!showAddMember)}
            className="gap-1 bg-esi-red hover:bg-esi-red-dark text-white"
          >
            <Plus size={14} />
            Tambah
          </Button>
        )}
      </div>

      {/* Add Member Form */}
      {showAddMember && isCaptain && (
        <div className="mb-4 rounded-xl border border-stone-200 dark:border-zinc-700 bg-esi-bg p-4">
          <h3 className="mb-3 text-sm font-medium text-stone-700 dark:text-zinc-300">Tambah Anggota Baru</h3>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs text-stone-500 dark:text-zinc-400">In-Game Name *</label>
              <Input
                value={newMemberName}
                onChange={(e) => setNewMemberName(e.target.value)}
                placeholder="Nama in-game"
                className="border-stone-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-stone-900 dark:text-zinc-100 focus:border-esi-red"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs text-stone-500 dark:text-zinc-400">In-Game ID</label>
              <Input
                value={newMemberGameId}
                onChange={(e) => setNewMemberGameId(e.target.value)}
                placeholder="ID in-game (opsional)"
                className="border-stone-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-stone-900 dark:text-zinc-100 focus:border-esi-red"
              />
            </div>
          </div>

          {/* Role selector */}
          <div className="mt-3">
            <label className="mb-1 block text-xs text-stone-500 dark:text-zinc-400">Role</label>
            <div className="flex gap-2">
              {(['member', 'substitute'] as TeamMemberRole[]).map((role) => (
                <button
                  key={role}
                  onClick={() => setNewMemberRole(role)}
                  className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                    newMemberRole === role
                      ? 'bg-esi-red/10 text-esi-red border border-esi-red/30'
                      : 'bg-white dark:bg-zinc-800 text-stone-500 dark:text-zinc-400 border border-stone-200 dark:border-zinc-700 hover:text-stone-700 dark:hover:text-zinc-200'
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
              className="bg-esi-red hover:bg-esi-red-dark text-white"
            >
              {addingMember ? 'Menambahkan...' : 'Tambah Anggota'}
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setShowAddMember(false)}
              className="text-stone-500 dark:text-zinc-400 hover:text-stone-700 dark:hover:text-zinc-200"
            >
              Batal
            </Button>
          </div>
        </div>
      )}

      {/* Members List */}
      {team.members.length === 0 ? (
        <div className="flex flex-col items-center py-8 text-center">
          <Users size={36} weight="thin" className="mb-2 text-stone-300 dark:text-zinc-600" />
          <p className="text-sm text-stone-500 dark:text-zinc-400">Belum ada anggota</p>
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
                  className="flex items-center gap-4 rounded-xl border border-stone-200 dark:border-zinc-700 bg-esi-bg p-3"
                >
                  {/* Avatar */}
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white dark:bg-zinc-800">
                    <RoleIcon
                      size={20}
                      weight={member.role === 'captain' ? 'fill' : 'regular'}
                      className={member.role === 'captain' ? 'text-amber-500' : 'text-stone-400 dark:text-zinc-500'}
                    />
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="truncate text-sm font-medium text-stone-900 dark:text-zinc-100">
                        {member.in_game_name}
                      </span>
                      <span
                        className={`rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${roleInfo.color}`}
                      >
                        {roleInfo.label}
                      </span>
                    </div>
                    {member.in_game_id && (
                      <p className="mt-0.5 text-xs text-stone-400 dark:text-zinc-500">
                        ID: {member.in_game_id}
                      </p>
                    )}
                  </div>

                  {/* Jersey */}
                  {member.jersey_number != null && (
                    <span className="flex items-center gap-1 text-xs text-stone-400 dark:text-zinc-500">
                      <TShirt size={12} />
                      #{member.jersey_number}
                    </span>
                  )}

                  {/* Remove button (captain only, can't remove self) */}
                  {isCaptain && member.role !== 'captain' && (
                    <button
                      onClick={() => onRemoveMember(member.id)}
                      className="rounded-md p-1.5 text-stone-400 dark:text-zinc-500 transition-colors hover:bg-red-50 dark:hover:bg-red-950/30 hover:text-red-500"
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
