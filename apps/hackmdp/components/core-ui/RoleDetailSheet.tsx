"use client"

import { useEffect, useState } from "react"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { Shield, ShieldCheck, Edit, Users } from "lucide-react"
import type { Role, Permiso } from "@/lib/types/roles"
import { MODULO_LABELS, ACCION_LABELS } from "@/lib/types/roles"

interface RoleDetailSheetProps {
  role: Role | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onEdit?: () => void
}

export function RoleDetailSheet({ role, open, onOpenChange, onEdit }: RoleDetailSheetProps) {
  const [permisos, setPermisos] = useState<Permiso[]>([])
  const [loading, setLoading] = useState(false)
  const [userCount, setUserCount] = useState(0)

  useEffect(() => {
    if (role && open) {
      loadPermisos()
      loadUserCount()
    }
  }, [role, open])

  const loadPermisos = async () => {
    if (!role) return

    setLoading(true)
    try {
      const response = await fetch(`/api/roles/${role.id}/permisos`)
      const data = await response.json()
      setPermisos(data)
    } catch (error) {
      console.error('Error loading permisos:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadUserCount = async () => {
    if (!role) return

    try {
      const response = await fetch(`/api/roles/${role.id}/users`)
      const data = await response.json()
      setUserCount(data.count || 0)
    } catch (error) {
      console.error('Error loading user count:', error)
    }
  }

  if (!role) return null

  // Agrupar permisos por módulo
  const permisosPorModulo = permisos.reduce((acc, permiso) => {
    if (!acc[permiso.modulo]) {
      acc[permiso.modulo] = []
    }
    acc[permiso.modulo].push(permiso)
    return acc
  }, {} as Record<string, Permiso[]>)

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-[600px] sm:max-w-[600px]">
        <SheetHeader>
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <SheetTitle className="flex items-center gap-2">
                {role.es_admin ? (
                  <ShieldCheck className="h-5 w-5 text-destructive" />
                ) : (
                  <Shield className="h-5 w-5 text-primary" />
                )}
                {role.nombre}
              </SheetTitle>
              <SheetDescription>
                {role.descripcion || 'Sin descripción'}
              </SheetDescription>
            </div>
            {onEdit && (
              <Button variant="outline" size="small" onClick={onEdit}>
                <Edit className="h-4 w-4" />
              </Button>
            )}
          </div>
        </SheetHeader>

        <div className="mt-6 space-y-6">
          {/* Información del rol */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Tipo</span>
              {role.es_admin ? (
                <Badge variant="destructive">Administrador</Badge>
              ) : (
                <Badge variant="secondary">Estándar</Badge>
              )}
            </div>

            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Color</span>
              <div className="flex items-center gap-2">
                <div
                  className="h-6 w-6 rounded border"
                  style={{ backgroundColor: role.color }}
                />
                <span className="text-xs font-mono">{role.color}</span>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Usuarios</span>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Users className="h-4 w-4" />
                {userCount} usuario{userCount !== 1 ? 's' : ''}
              </div>
            </div>
          </div>

          <Separator />

          {/* Permisos */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold">Permisos del Rol</h3>

            {role.es_admin ? (
              <div className="rounded-lg border border-destructive/20 bg-destructive/10 p-4">
                <p className="text-sm text-destructive">
                  Este rol tiene acceso completo a todos los módulos y funciones del sistema.
                </p>
              </div>
            ) : loading ? (
              <div className="space-y-2">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-16 animate-pulse rounded-lg bg-muted" />
                ))}
              </div>
            ) : Object.keys(permisosPorModulo).length === 0 ? (
              <div className="rounded-lg border border-dashed p-8 text-center">
                <p className="text-sm text-muted-foreground">
                  Este rol no tiene permisos asignados.
                </p>
              </div>
            ) : (
              <ScrollArea className="h-[400px] pr-4">
                <div className="space-y-3">
                  {Object.entries(permisosPorModulo)
                    .sort(([a], [b]) => a.localeCompare(b))
                    .map(([modulo, permisosModulo]) => (
                      <div
                        key={modulo}
                        className="rounded-lg border bg-card p-3 space-y-2"
                      >
                        <div className="font-medium text-sm">
                          {MODULO_LABELS[modulo as keyof typeof MODULO_LABELS] || modulo}
                        </div>
                        <div className="flex flex-wrap gap-1">
                          {permisosModulo.map((permiso) => (
                            <Badge key={permiso.id} variant="secondary" className="text-xs">
                              {ACCION_LABELS[permiso.accion as keyof typeof ACCION_LABELS] || permiso.accion}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    ))}
                </div>
              </ScrollArea>
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}
