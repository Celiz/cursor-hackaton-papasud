'use client'

import { useState } from 'react'
import useSWR from 'swr'
import { ColumnDef } from "@tanstack/react-table"
import { GenericDataTable } from "@/components/core-ui/GenericDataTable"
import { DataTableColumnHeader } from "@/components/data-table-column-header"
import { Mail, Phone, Building2, Star } from 'lucide-react'
import { CreateContactoDialog } from "@/components/core-ui/CreateContactoDialog"

/** Contacto = persona de contacto dentro de un cliente (tabla `contactos`). */
export interface Contacto {
  id: string
  empresa_id: string
  nombre: string
  apellido: string | null
  cargo: string | null
  email: string[] | null
  telefono: string[] | null
  es_principal: boolean
  notas: string | null
  empresa_nombre: string | null
  empresa_fantasia: string | null
  empresa_identificador: number | null
}

const fetcher = async (url: string) => {
  const res = await fetch(url)
  const data = await res.json()
  if (!res.ok || data.error) throw new Error(data.error || 'Error al cargar datos')
  return Array.isArray(data) ? data : []
}

const list = (v: string[] | null): string[] =>
  Array.isArray(v) ? v.filter(Boolean) : []

const columns: ColumnDef<Contacto>[] = [
  {
    accessorKey: "nombre",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Contacto" />,
    cell: ({ row }) => (
      <div>
        <div className="font-medium text-sm flex items-center gap-1.5">
          {`${row.original.nombre} ${row.original.apellido || ''}`.trim()}
          {row.original.es_principal && (
            <Star className="h-3.5 w-3.5 text-amber-500 fill-amber-500" />
          )}
        </div>
        {row.original.cargo && (
          <div className="text-xs text-muted-foreground">{row.original.cargo}</div>
        )}
      </div>
    ),
  },
  {
    accessorKey: "empresa_nombre",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Empresa" />,
    cell: ({ row }) => (
      <div className="flex items-start gap-1.5">
        <Building2 className="h-3.5 w-3.5 mt-0.5 text-muted-foreground shrink-0" />
        <div>
          <div className="text-sm">{row.original.empresa_nombre || '-'}</div>
          {row.original.empresa_fantasia &&
            row.original.empresa_fantasia !== row.original.empresa_nombre && (
              <div className="text-xs text-muted-foreground">{row.original.empresa_fantasia}</div>
            )}
        </div>
      </div>
    ),
  },
  {
    accessorKey: "email",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Email" />,
    cell: ({ row }) => {
      const emails = list(row.original.email)
      if (emails.length === 0) return <span className="text-muted-foreground text-xs">-</span>
      return (
        <div className="space-y-0.5">
          {emails.slice(0, 2).map((e, i) => (
            <a key={i} href={`mailto:${e}`} className="flex items-center gap-1 text-xs text-blue-600 hover:underline">
              <Mail className="h-3 w-3" />{e}
            </a>
          ))}
          {emails.length > 2 && (
            <span className="text-xs text-muted-foreground">+{emails.length - 2} más</span>
          )}
        </div>
      )
    },
  },
  {
    accessorKey: "telefono",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Teléfono" />,
    cell: ({ row }) => {
      const tels = list(row.original.telefono)
      if (tels.length === 0) return <span className="text-muted-foreground text-xs">-</span>
      return (
        <div className="space-y-0.5">
          {tels.slice(0, 2).map((t, i) => (
            <div key={i} className="flex items-center gap-1 text-xs">
              <Phone className="h-3 w-3 text-muted-foreground" />{t}
            </div>
          ))}
        </div>
      )
    },
  },
]

interface ContactosTableProps {
  /** Título mostrado por GenericDataTable (omitir si el contenedor ya tiene su propio header). */
  pageTitle?: string
  pageDescription?: string
  /** Muestra el botón "Nuevo Contacto" + diálogo de creación. */
  enableCreate?: boolean
}

/**
 * Tabla única de contactos (tabla `contactos`, atados a un cliente).
 * Fuente compartida por el menú "Contactos" y la pestaña "Contactos" del CRM
 * para que no vuelvan a divergir.
 */
export function ContactosTable({ pageTitle, pageDescription, enableCreate }: ContactosTableProps) {
  const { data, error, isLoading, isValidating, mutate } = useSWR<Contacto[]>(
    '/api/contactos',
    fetcher
  )
  const [createOpen, setCreateOpen] = useState(false)

  if (error) {
    return (
      <div className="text-center py-8 text-red-500">
        Error al cargar contactos: {error.message}
      </div>
    )
  }

  return (
    <>
      <GenericDataTable
        columns={columns}
        data={data ?? []}
        isLoading={isLoading}
        pageTitle={pageTitle}
        pageDescription={pageDescription}
        enableGlobalSearch
        searchPlaceholder="Buscar por nombre, email, cliente..."
        onRefresh={() => mutate()}
        refreshLoading={isValidating}
        {...(enableCreate
          ? { onNew: () => setCreateOpen(true), newLabel: 'Nuevo Contacto' }
          : {})}
      />
      {enableCreate && (
        <CreateContactoDialog
          open={createOpen}
          onOpenChange={setCreateOpen}
          onCreated={() => mutate()}
        />
      )}
    </>
  )
}
