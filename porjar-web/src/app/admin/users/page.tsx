'use client'

import { useState } from 'react'
import { PageHeader } from '@/components/shared/PageHeader'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { ExportButton } from '@/components/shared/ExportButton'
import { Plus } from '@phosphor-icons/react'
import { downloadCSV } from '@/lib/csv'
import type { User, UserRole } from '@/types'
import { roleLabels, type FilterRole } from './constants'
import { usePaginatedUsers } from './hooks/usePaginatedUsers'
import { useUserCrud } from './hooks/useUserCrud'
import { UserFilterBar } from './components/UserFilterBar'
import { UsersTable } from './components/UsersTable'
import { CreateUserDialog } from './dialogs/CreateUserDialog'
import { EditUserDialog } from './dialogs/EditUserDialog'
import { DeleteUserDialog } from './dialogs/DeleteUserDialog'
import { ChangeRoleDialog } from './dialogs/ChangeRoleDialog'
import { ResetPasswordDialog } from './dialogs/ResetPasswordDialog'
import { CredentialCardDialog } from './dialogs/CredentialCardDialog'

export default function AdminUsersPage() {
  const {
    users,
    totalUsers,
    totalPages,
    loading,
    filterRole,
    setFilterRole,
    search,
    setSearch,
    currentPage,
    setCurrentPage,
    perPage,
    refetch,
  } = usePaginatedUsers()

  const crud = useUserCrud(refetch)

  const [showCreate, setShowCreate] = useState(false)
  const [editUser, setEditUser] = useState<User | null>(null)
  const [deleteUser, setDeleteUser] = useState<User | null>(null)
  const [resetUser, setResetUser] = useState<User | null>(null)
  const [changeRole, setChangeRole] = useState<{ user: User; newRole: UserRole } | null>(null)
  const [credentialUser, setCredentialUser] = useState<User | null>(null)
  const [credentialPassword, setCredentialPassword] = useState<string | null>(null)

  function handleFilterChange(role: FilterRole) {
    setFilterRole(role)
    setCurrentPage(1)
  }

  if (loading) {
    return (
      <>
        <Skeleton className="h-10 w-64 bg-stone-200" />
        <Skeleton className="mt-4 h-96 w-full bg-stone-200" />
      </>
    )
  }

  return (
    <>
      <PageHeader
        title="Manajemen Pengguna"
        description="Kelola pengguna dan hak akses (Superadmin only)"
        actions={
          <div className="flex items-center gap-2">
            {users.length > 0 && (
              <ExportButton
                options={[
                  {
                    label: 'Export CSV',
                    type: 'csv',
                    onExport: () => {
                      const data = users.map((u) => ({
                        full_name: u.full_name,
                        email: u.email,
                        phone: u.phone ?? '-',
                        role: roleLabels[u.role],
                      }))
                      downloadCSV(data, 'users.csv', [
                        { key: 'full_name', header: 'Nama' },
                        { key: 'email', header: 'Email' },
                        { key: 'phone', header: 'Telepon' },
                        { key: 'role', header: 'Role' },
                      ])
                    },
                  },
                ]}
              />
            )}
            <Button
              onClick={() => setShowCreate(true)}
              className="bg-esi-red hover:bg-esi-red-dark text-white"
            >
              <Plus size={16} weight="bold" className="mr-1" />
              Tambah Pengguna
            </Button>
          </div>
        }
      />

      <UserFilterBar
        filterRole={filterRole}
        onFilterRoleChange={handleFilterChange}
        search={search}
        onSearchChange={setSearch}
      />

      <UsersTable
        users={users}
        totalUsers={totalUsers}
        totalPages={totalPages}
        currentPage={currentPage}
        perPage={perPage}
        onPageChange={setCurrentPage}
        onEdit={setEditUser}
        onResetPassword={setResetUser}
        onShowCredential={(u) => { setCredentialPassword(null); setCredentialUser(u) }}
        onDelete={setDeleteUser}
        onChangeRole={(user, newRole) => setChangeRole({ user, newRole })}
      />

      <CreateUserDialog
        open={showCreate}
        onOpenChange={setShowCreate}
        processing={crud.processing}
        onSubmit={crud.createUser}
      />

      <EditUserDialog
        open={!!editUser}
        onOpenChange={(o) => { if (!o) setEditUser(null) }}
        user={editUser}
        processing={crud.processing}
        onSubmit={crud.editUser}
      />

      <DeleteUserDialog
        open={!!deleteUser && !resetUser}
        onOpenChange={(o) => { if (!o) setDeleteUser(null) }}
        user={deleteUser}
        processing={crud.processing}
        onConfirm={crud.deleteUser}
      />

      <ChangeRoleDialog
        open={!!changeRole}
        onOpenChange={(o) => { if (!o) setChangeRole(null) }}
        target={changeRole}
        processing={crud.processing}
        onConfirm={crud.changeRole}
      />

      <ResetPasswordDialog
        open={!!resetUser}
        onOpenChange={(o) => { if (!o) setResetUser(null) }}
        user={resetUser}
        processing={crud.processing}
        onReset={crud.resetPassword}
        onShowCard={(u, pw) => { setResetUser(null); setCredentialPassword(pw); setCredentialUser(u) }}
      />

      <CredentialCardDialog
        open={!!credentialUser}
        onOpenChange={(o) => { if (!o) { setCredentialUser(null); setCredentialPassword(null) } }}
        user={credentialUser}
        passwordOverride={credentialPassword}
        fetchCredential={crud.fetchCredential}
      />
    </>
  )
}
