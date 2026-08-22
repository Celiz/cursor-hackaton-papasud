'use client'

import { useState } from 'react'
import useSWR from 'swr'
import { GenericDataTable } from "@/components/core-ui/GenericDataTable"
import { columnsRoles } from "./columns"
import { LoadingLine } from "@/components/LoadingLine"
import { RoleFormDialog } from "@/components/core-ui/RoleFormDialog"
import { RoleDetailSheet } from "@/components/core-ui/RoleDetailSheet"
import { toast } from "sonner"
import { useUserPermissions } from "@/lib/hooks/use-user-permissions"
import type { Role } from "@/lib/types/roles"

const fetcher = (url: string) => fetch(url).then((res) => res.json())

export default function RolesPageClient() {
  const { data: roles, error, isLoading, mutate } = useSWR<Role[]>('/api/roles', fetcher)
  const { isAdmin, hasPermission } = useUserPermissions()

  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [detailSheetOpen, setDetailSheetOpen] = useState(false)
  const [selectedRole, setSelectedRole] = useState<Role | null>(null)

  // Solo admins pueden gestionar roles
  if (!isAdmin && !hasPermission('configuracion_roles', 'leer')) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-2">Sin Permisos</h2>
          <p className="text-muted-foreground">
            No tienes permisos para gestionar roles y permisos.
          </p>
        </div>
      </div>
    )
  }

  const handleCreate = () => {
    setCreateDialogOpen(true)
  }

  const handleSaveCreate = async (data: Partial<Role> & { permisos?: string[] }) => {
    const { permisos, ...roleData } = data

    const createPromise = async () => {
      const response = await fetch('/api/roles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(roleData),
      })

      if (!response.ok) {
        throw new Error('Error al crear rol')
      }

      const newRole = await response.json()

      // Guardar permisos si se especificaron
      if (permisos && permisos.length > 0 && newRole.id) {
        const permisosResponse = await fetch(`/api/roles/${newRole.id}/permisos`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ permiso_ids: permisos }),
        })

        if (!permisosResponse.ok) {
          console.error('Error al guardar permisos del rol')
        }
      }

      mutate()
      return newRole
    }

    toast.promise(createPromise(), {
      loading: 'Creando rol...',
      success: 'Rol creado correctamente',
      error: 'No se pudo crear el rol',
    })
  }

  const handleEdit = (role: Role) => {
    setSelectedRole(role)
    setEditDialogOpen(true)
  }

  const handleSaveEdit = async (data: Partial<Role> & { permisos?: string[] }) => {
    if (!selectedRole) return

    const { permisos, ...roleData } = data

    const editPromise = async () => {
      const response = await fetch(`/api/roles/${selectedRole.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(roleData),
      })

      if (!response.ok) {
        throw new Error('Error al actualizar rol')
      }

      // Actualizar permisos del rol
      if (permisos !== undefined) {
        const permisosResponse = await fetch(`/api/roles/${selectedRole.id}/permisos`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ permiso_ids: permisos }),
        })

        if (!permisosResponse.ok) {
          console.error('Error al actualizar permisos del rol')
        }
      }

      mutate()
      setEditDialogOpen(false)
      return response
    }

    toast.promise(editPromise(), {
      loading: 'Guardando cambios...',
      success: 'Rol actualizado correctamente',
      error: 'No se pudo actualizar el rol',
    })
  }

  const handleDelete = async (role: Role) => {
    // No permitir eliminar roles predefinidos
    if (role.es_admin) {
      toast.error('No se puede eliminar el rol de Admin')
      return
    }

    const deletePromise = async () => {
      const response = await fetch(`/api/roles/${role.id}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        throw new Error('Error al eliminar rol')
      }

      mutate((current: any) => Array.isArray(current) ? current.filter((item: any) => item.id !== role.id) : current, { revalidate: true })
      return response
    }

    toast.promise(deletePromise(), {
      loading: 'Eliminando rol...',
      success: 'Rol eliminado correctamente',
      error: 'No se pudo eliminar el rol',
    })
  }

  const handleRowClick = (role: Role) => {
    setSelectedRole(role)
    setDetailSheetOpen(true)
  }

  if (error) return <div>Error al cargar roles</div>

  return (
    <>
      <div className="flex-1 flex flex-col overflow-y-hidden">
        <GenericDataTable
          columns={columnsRoles}
          data={roles || []}
          isLoading={isLoading}
          pageTitle="Roles y Permisos"
          pageDescription="Gestiona los roles del sistema y sus permisos."
          searchColumnId="nombre"
          searchPlaceholder="Buscar por nombre de rol..."
          onNew={hasPermission('configuracion_roles', 'editar') ? handleCreate : undefined}
          newLabel="Nuevo Rol"
          onRowClick={handleRowClick}
          onEdit={hasPermission('configuracion_roles', 'editar') ? handleEdit : undefined}
          onDelete={hasPermission('configuracion_roles', 'editar') ? handleDelete : undefined}
          onRefresh={mutate}
        />
        <LoadingLine loading={isLoading} />
      </div>

      <RoleFormDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        onSave={handleSaveCreate}
      />

      {selectedRole && (
        <>
          <RoleFormDialog
            open={editDialogOpen}
            onOpenChange={setEditDialogOpen}
            onSave={handleSaveEdit}
            role={selectedRole}
          />

          <RoleDetailSheet
            role={selectedRole}
            open={detailSheetOpen}
            onOpenChange={setDetailSheetOpen}
            onEdit={() => {
              setDetailSheetOpen(false)
              setEditDialogOpen(true)
            }}
          />
        </>
      )}
    </>
  )
}
