'use client'

import { ColumnDef } from '@tanstack/react-table'
import { DataTableColumnHeader } from '@/components/data-table-column-header'
import { Badge } from '@/components/ui/badge'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { AlertTriangle, Clock, CheckCircle, XCircle, Package } from 'lucide-react'

export interface Lote {
  id: string
  producto_id: string
  numero_lote: string
  fecha_fabricacion: string | null
  fecha_vencimiento: string | null
  proveedor_id: string | null
  orden_compra: string | null
  cantidad_original: number
  cantidad_disponible: number
  cantidad_reservada: number
  cantidad_defectuosa: number
  costo_unitario: number | null
  costo_total: number | null
  estado: 'activo' | 'cuarentena' | 'vencido' | 'recall' | 'agotado'
  certificado_calidad: boolean
  certificado_anmat: boolean
  certificado_url: string | null
  notas: string | null
  created_at: string
  updated_at: string
  producto: { id: string; codigo: string; nombre: string } | null
  proveedor: { id: string; nombre: string } | null
  dias_hasta_vencimiento?: number
  vencido?: boolean
  proximo_a_vencer?: boolean
}

const ESTADO_STYLES: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  activo: { label: 'Activo', variant: 'default' },
  cuarentena: { label: 'Cuarentena', variant: 'secondary' },
  vencido: { label: 'Vencido', variant: 'destructive' },
  recall: { label: 'Recall', variant: 'destructive' },
  agotado: { label: 'Agotado', variant: 'outline' },
}

export const columnsLotes: ColumnDef<Lote>[] = [
  {
    accessorKey: 'numero_lote',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Lote" />
    ),
    cell: ({ row }) => {
      const lote = row.original
      return (
        <div className="flex items-center gap-2">
          <Package className="h-4 w-4 text-muted-foreground" />
          <span className="font-mono font-medium">{lote.numero_lote}</span>
        </div>
      )
    },
  },
  {
    accessorKey: 'producto',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Producto" />
    ),
    cell: ({ row }) => {
      const producto = row.original.producto
      if (!producto) return <span className="text-muted-foreground">-</span>
      return (
        <div>
          <p className="font-medium">{producto.nombre}</p>
          {producto.codigo && (
            <p className="text-xs text-muted-foreground font-mono">{producto.codigo}</p>
          )}
        </div>
      )
    },
  },
  {
    accessorKey: 'cantidad_disponible',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Disponible" />
    ),
    cell: ({ row }) => {
      const disponible = row.original.cantidad_disponible
      const original = row.original.cantidad_original
      const porcentaje = original > 0 ? (disponible / original) * 100 : 0

      return (
        <div className="flex flex-col">
          <span className="font-mono font-bold">{disponible}</span>
          <span className="text-xs text-muted-foreground">
            de {original} ({porcentaje.toFixed(0)}%)
          </span>
        </div>
      )
    },
  },
  {
    accessorKey: 'fecha_vencimiento',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Vencimiento" />
    ),
    cell: ({ row }) => {
      const lote = row.original
      if (!lote.fecha_vencimiento) {
        return <span className="text-muted-foreground">Sin vencimiento</span>
      }

      const fecha = new Date(lote.fecha_vencimiento)
      const dias = lote.dias_hasta_vencimiento

      let statusIcon = <CheckCircle className="h-4 w-4 text-green-500" />
      let statusClass = 'text-green-700'

      if (lote.vencido) {
        statusIcon = <XCircle className="h-4 w-4 text-red-500" />
        statusClass = 'text-red-700'
      } else if (lote.proximo_a_vencer) {
        statusIcon = <AlertTriangle className="h-4 w-4 text-amber-500" />
        statusClass = 'text-amber-700'
      }

      return (
        <div className="flex items-center gap-2">
          {statusIcon}
          <div>
            <p className={statusClass}>
              {format(fecha, 'dd/MM/yyyy', { locale: es })}
            </p>
            {dias !== undefined && (
              <p className="text-xs text-muted-foreground">
                {lote.vencido
                  ? `Venció hace ${Math.abs(dias)} días`
                  : `${dias} días restantes`
                }
              </p>
            )}
          </div>
        </div>
      )
    },
  },
  {
    accessorKey: 'estado',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Estado" />
    ),
    cell: ({ row }) => {
      const estado = row.original.estado
      const style = ESTADO_STYLES[estado] || ESTADO_STYLES.activo
      return <Badge variant={style.variant}>{style.label}</Badge>
    },
    filterFn: (row, id, value) => {
      return value.includes(row.getValue(id))
    },
  },
  {
    accessorKey: 'proveedor',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Proveedor" />
    ),
    cell: ({ row }) => {
      const proveedor = row.original.proveedor
      return proveedor?.nombre || <span className="text-muted-foreground">-</span>
    },
  },
  {
    accessorKey: 'certificados',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Certificados" />
    ),
    cell: ({ row }) => {
      const lote = row.original
      return (
        <div className="flex gap-1">
          {lote.certificado_calidad && (
            <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
              Calidad
            </Badge>
          )}
          {lote.certificado_anmat && (
            <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
              ANMAT
            </Badge>
          )}
          {!lote.certificado_calidad && !lote.certificado_anmat && (
            <span className="text-muted-foreground text-sm">-</span>
          )}
        </div>
      )
    },
  },
]
