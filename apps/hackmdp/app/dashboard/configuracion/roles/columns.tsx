"use client"

import { ColumnDef } from "@tanstack/react-table"
import { Badge } from "@/components/ui/badge"
import { DataTableColumnHeader } from "@/components/data-table-column-header"
import type { Role } from "@/lib/types/roles"
import { Shield, ShieldCheck } from "lucide-react"

export const columnsRoles: ColumnDef<Role>[] = [
  {
    accessorKey: "nombre",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Rol" />
    ),
    cell: ({ row }) => {
      const role = row.original
      return (
        <div className="flex items-center gap-2">
          {role.es_admin ? (
            <ShieldCheck className="h-4 w-4 text-destructive" />
          ) : (
            <Shield className="h-4 w-4 text-primary" />
          )}
          <span className="font-medium">{role.nombre}</span>
        </div>
      )
    },
  },
  {
    accessorKey: "descripcion",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Descripción" />
    ),
    cell: ({ row }) => {
      return (
        <span className="text-sm text-muted-foreground">
          {row.getValue("descripcion") || "—"}
        </span>
      )
    },
  },
  {
    accessorKey: "es_admin",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Tipo" />
    ),
    cell: ({ row }) => {
      const esAdmin = row.getValue("es_admin") as boolean
      return esAdmin ? (
        <Badge variant="destructive">Admin</Badge>
      ) : (
        <Badge variant="secondary">Estándar</Badge>
      )
    },
    filterFn: (row, id, value) => {
      return value.includes(row.getValue(id))
    },
  },
  {
    accessorKey: "color",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Color" />
    ),
    cell: ({ row }) => {
      const color = row.getValue("color") as string
      return (
        <div className="flex items-center gap-2">
          <div
            className="h-4 w-4 rounded border"
            style={{ backgroundColor: color }}
          />
          <span className="text-xs font-mono">{color}</span>
        </div>
      )
    },
  },
  {
    accessorKey: "created_at",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Creado" />
    ),
    cell: ({ row }) => {
      const date = new Date(row.getValue("created_at"))
      return (
        <span className="text-sm text-muted-foreground">
          {date.toLocaleDateString('es-AR')}
        </span>
      )
    },
  },
]
