"use client"

import { ColumnDef } from "@tanstack/react-table"
import { DataTableColumnHeader } from "@/components/data-table-column-header"
import { Badge } from "@/components/ui/badge"
import { TableInlineActions } from "@/components/core-ui/TableInlineActions"
import { Phone, BellOff, StickyNote } from "lucide-react"

export interface AlertaReposicion {
  id: string
  cliente_id: string
  producto_id: string
  cantidad_habitual: number | null
  frecuencia_dias: number
  ultima_compra: string
  total_compras: number
  es_favorito: boolean
  reposicion_snooze_hasta: string | null
  reposicion_contactado_at: string | null
  reposicion_notas: string | null
  cliente_nombre: string
  cliente_fantasia: string | null
  cliente_telefono: string | null
  cliente_email: string | null
  producto_nombre: string
  producto_codigo: string
  producto_stock: number | null
  producto_categoria: string | null
  dias_desde_compra: number
  ratio: number
  urgencia: "critica" | "alta" | "media"
  contactado_por_nombre: string | null
}

export interface AlertaReposicionActionHandlers {
  onSnooze?: (alerta: AlertaReposicion, dias: number) => void
  onContactar?: (alerta: AlertaReposicion) => void
  onNota?: (alerta: AlertaReposicion) => void
}

const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString("es-AR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  })
}

const urgenciaConfig = {
  critica: { label: "Crítica", className: "bg-red-100 text-red-700 border-red-200 dark:bg-red-950 dark:text-red-400 dark:border-red-800" },
  alta: { label: "Alta", className: "bg-orange-100 text-orange-700 border-orange-200 dark:bg-orange-950 dark:text-orange-400 dark:border-orange-800" },
  media: { label: "Media", className: "bg-yellow-100 text-yellow-700 border-yellow-200 dark:bg-yellow-950 dark:text-yellow-400 dark:border-yellow-800" },
}

export function getColumns(handlers?: AlertaReposicionActionHandlers): ColumnDef<AlertaReposicion>[] {
  return [
    {
      accessorKey: "cliente_nombre",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Cliente" />
      ),
      cell: ({ row }) => {
        const fantasia = row.original.cliente_fantasia
        return (
          <div className="min-w-0">
            <div className="font-medium text-sm truncate">
              {fantasia || row.original.cliente_nombre}
            </div>
            {fantasia && (
              <div className="text-xs text-muted-foreground truncate">
                {row.original.cliente_nombre}
              </div>
            )}
          </div>
        )
      },
    },
    {
      accessorKey: "producto_nombre",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Producto" />
      ),
      cell: ({ row }) => (
        <div className="min-w-0">
          <div className="font-medium text-sm truncate">{row.original.producto_nombre}</div>
          <div className="text-xs text-muted-foreground font-mono">{row.original.producto_codigo}</div>
        </div>
      ),
    },
    {
      accessorKey: "urgencia",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Urgencia" />
      ),
      cell: ({ row }) => {
        const config = urgenciaConfig[row.original.urgencia]
        return (
          <Badge variant="outline" className={config.className}>
            {config.label}
          </Badge>
        )
      },
      filterFn: (row, id, value) => value.includes(row.getValue(id)),
    },
    {
      accessorKey: "dias_desde_compra",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Días atrasado" />
      ),
      cell: ({ row }) => {
        const dias = row.original.dias_desde_compra
        const freq = row.original.frecuencia_dias
        const atraso = dias - freq
        return (
          <div className="text-center">
            <div className="font-bold text-sm">
              +{atraso}d
            </div>
            <div className="text-xs text-muted-foreground">
              de {freq}d ciclo
            </div>
          </div>
        )
      },
    },
    {
      accessorKey: "cantidad_habitual",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Cant. habitual" />
      ),
      cell: ({ row }) => (
        <div className="text-center text-sm">
          {row.original.cantidad_habitual ?? "-"}
        </div>
      ),
    },
    {
      accessorKey: "ultima_compra",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Última compra" />
      ),
      cell: ({ row }) => (
        <div className="text-sm text-muted-foreground">
          {formatDate(row.original.ultima_compra)}
        </div>
      ),
    },
    {
      accessorKey: "total_compras",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Compras" />
      ),
      cell: ({ row }) => (
        <div className="text-center text-sm">
          {row.original.total_compras}
        </div>
      ),
    },
    {
      accessorKey: "producto_categoria",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Categoría" />
      ),
      cell: ({ row }) => (
        <div className="text-sm text-muted-foreground truncate">
          {row.original.producto_categoria || "-"}
        </div>
      ),
    },
    {
      id: "estado",
      header: "Estado",
      cell: ({ row }) => {
        const contactado = row.original.reposicion_contactado_at
        return contactado ? (
          <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 dark:bg-green-950 dark:text-green-400">
            <Phone className="h-3 w-3 mr-1" />
            Contactado
          </Badge>
        ) : null
      },
    },
    {
      id: "acciones",
      cell: ({ row }) => {
        const customActions: { label: string; icon: React.ReactNode; action: () => void }[] = []
        if (handlers?.onContactar) {
          customActions.push({
            label: "Marcar contactado",
            icon: <Phone className="h-3.5 w-3.5" />,
            action: () => handlers.onContactar!(row.original),
          })
        }
        if (handlers?.onSnooze) {
          customActions.push(
            { label: "Posponer 7 días", icon: <BellOff className="h-3.5 w-3.5" />, action: () => handlers.onSnooze!(row.original, 7) },
            { label: "Posponer 15 días", icon: <BellOff className="h-3.5 w-3.5" />, action: () => handlers.onSnooze!(row.original, 15) },
            { label: "Posponer 30 días", icon: <BellOff className="h-3.5 w-3.5" />, action: () => handlers.onSnooze!(row.original, 30) },
          )
        }
        if (handlers?.onNota) {
          customActions.push({
            label: "Agregar nota",
            icon: <StickyNote className="h-3.5 w-3.5" />,
            action: () => handlers.onNota!(row.original),
          })
        }
        if (customActions.length === 0) return null
        return <TableInlineActions row={row.original} customActions={customActions} />
      },
    },
  ]
}
