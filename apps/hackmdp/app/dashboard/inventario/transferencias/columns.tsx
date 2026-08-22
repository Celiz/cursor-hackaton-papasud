'use client'

import { ColumnDef } from '@tanstack/react-table'
import { DataTableColumnHeader } from '@/components/data-table-column-header'
import { Badge } from '@/components/ui/badge'
import { ArrowRight, Package } from 'lucide-react'

export interface TransferenciaItem {
  id: string
  producto_id: string
  cantidad: number
  lote_id: string | null
  serial_id: string | null
  observaciones: string | null
  producto?: {
    id: string
    codigo: string | null
    nombre: string
  }
}

export interface Transferencia {
  id: string
  numero: string
  deposito_origen_id: string
  deposito_destino_id: string
  fecha_transferencia: string
  motivo: string | null
  observaciones: string | null
  estado: 'borrador' | 'pendiente' | 'en_transito' | 'completada' | 'cancelada'
  fecha_confirmacion: string | null
  confirmado_por: string | null
  created_at: string
  updated_at: string
  origen?: {
    id: string
    codigo: string
    nombre: string
  }
  destino?: {
    id: string
    codigo: string
    nombre: string
  }
  items: TransferenciaItem[]
  total_items: number
  total_cantidad: number
}

const ESTADO_STYLES: Record<string, { variant: 'default' | 'secondary' | 'outline' | 'destructive'; label: string }> = {
  borrador: { variant: 'secondary', label: 'Borrador' },
  pendiente: { variant: 'outline', label: 'Pendiente' },
  en_transito: { variant: 'default', label: 'En Tránsito' },
  completada: { variant: 'default', label: 'Completada' },
  cancelada: { variant: 'destructive', label: 'Cancelada' },
}

export const columnsTransferencias: ColumnDef<Transferencia>[] = [
  {
    accessorKey: 'numero',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Número" />
    ),
    cell: ({ row }) => (
      <span className="font-mono font-medium">{row.original.numero}</span>
    ),
  },
  {
    accessorKey: 'ruta',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Origen → Destino" />
    ),
    cell: ({ row }) => {
      const t = row.original
      return (
        <div className="flex items-center gap-2">
          <span className="font-medium">{t.origen?.nombre || '-'}</span>
          <ArrowRight className="h-4 w-4 text-muted-foreground" />
          <span className="font-medium">{t.destino?.nombre || '-'}</span>
        </div>
      )
    },
  },
  {
    accessorKey: 'fecha_transferencia',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Fecha" />
    ),
    cell: ({ row }) => (
      <span>{new Date(row.original.fecha_transferencia).toLocaleDateString('es-AR')}</span>
    ),
  },
  {
    accessorKey: 'items',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Items" />
    ),
    cell: ({ row }) => {
      const t = row.original
      return (
        <div className="flex items-center gap-2">
          <Package className="h-4 w-4 text-muted-foreground" />
          <span>{t.total_items} productos</span>
          <span className="text-muted-foreground">({t.total_cantidad} unid.)</span>
        </div>
      )
    },
  },
  {
    accessorKey: 'motivo',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Motivo" />
    ),
    cell: ({ row }) => (
      <span className="text-sm line-clamp-1">{row.original.motivo || '-'}</span>
    ),
  },
  {
    accessorKey: 'estado',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Estado" />
    ),
    cell: ({ row }) => {
      const estado = row.original.estado
      const style = ESTADO_STYLES[estado] || { variant: 'secondary', label: estado }
      return <Badge variant={style.variant}>{style.label}</Badge>
    },
    filterFn: (row, id, value) => {
      return value.includes(row.getValue(id))
    },
  },
]
