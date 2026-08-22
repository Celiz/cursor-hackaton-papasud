'use client'

import { ColumnDef } from '@tanstack/react-table'
import { DataTableColumnHeader } from '@/components/data-table-column-header'
import { Badge } from '@/components/ui/badge'
import { Calendar, ClipboardList, AlertTriangle } from 'lucide-react'

export interface ConteoItem {
  id: string
  producto_id: string
  cantidad_sistema: number
  cantidad_contada: number | null
  diferencia: number | null
  contado: boolean
  producto?: {
    id: string
    codigo: string | null
    nombre: string
  }
}

export interface Conteo {
  id: string
  numero: string
  nombre: string
  descripcion: string | null
  deposito_id: string | null
  tipo_conteo: 'ciclico' | 'completo' | 'parcial' | 'sorpresa'
  criterio_seleccion: string | null
  fecha_programada: string | null
  fecha_inicio: string | null
  fecha_fin: string | null
  estado: 'planificado' | 'en_curso' | 'completado' | 'cancelado'
  responsable_id: string | null
  total_items: number
  items_contados: number
  items_con_diferencia: number
  valor_total_diferencias: number | null
  created_at: string
  updated_at: string
  deposito?: {
    id: string
    codigo: string
    nombre: string
  }
  items: ConteoItem[]
}

const ESTADO_STYLES: Record<string, { variant: 'default' | 'secondary' | 'outline' | 'destructive'; label: string }> = {
  planificado: { variant: 'secondary', label: 'Planificado' },
  en_curso: { variant: 'default', label: 'En Curso' },
  completado: { variant: 'default', label: 'Completado' },
  cancelado: { variant: 'destructive', label: 'Cancelado' },
}

const TIPO_STYLES: Record<string, string> = {
  ciclico: 'Cíclico',
  completo: 'Completo',
  parcial: 'Parcial',
  sorpresa: 'Sorpresa',
}

export const columnsConteos: ColumnDef<Conteo>[] = [
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
    accessorKey: 'nombre',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Nombre" />
    ),
    cell: ({ row }) => (
      <div className="flex items-center gap-2">
        <ClipboardList className="h-4 w-4 text-muted-foreground" />
        <span className="font-medium">{row.original.nombre}</span>
      </div>
    ),
  },
  {
    accessorKey: 'deposito',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Depósito" />
    ),
    cell: ({ row }) => {
      const deposito = row.original.deposito
      if (!deposito) return <span className="text-muted-foreground">Todos</span>
      return <span className="text-sm">{deposito.nombre}</span>
    },
  },
  {
    accessorKey: 'tipo_conteo',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Tipo" />
    ),
    cell: ({ row }) => (
      <Badge variant="outline">{TIPO_STYLES[row.original.tipo_conteo] || row.original.tipo_conteo}</Badge>
    ),
  },
  {
    accessorKey: 'fecha_programada',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Fecha Programada" />
    ),
    cell: ({ row }) => {
      const fecha = row.original.fecha_programada
      if (!fecha) return <span className="text-muted-foreground">-</span>
      return (
        <div className="flex items-center gap-2">
          <Calendar className="h-4 w-4 text-muted-foreground" />
          <span>{new Date(fecha).toLocaleDateString('es-AR')}</span>
        </div>
      )
    },
  },
  {
    accessorKey: 'progreso',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Progreso" />
    ),
    cell: ({ row }) => {
      const conteo = row.original
      const total = conteo.total_items || 0
      const contados = conteo.items_contados || 0
      const porcentaje = total > 0 ? (contados / total) * 100 : 0

      return (
        <div className="flex items-center gap-2 min-w-[120px]">
          <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-primary transition-all"
              style={{ width: `${Math.min(porcentaje, 100)}%` }}
            />
          </div>
          <span className="text-sm font-medium w-16 text-right">
            {contados}/{total}
          </span>
        </div>
      )
    },
  },
  {
    accessorKey: 'items_con_diferencia',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Diferencias" />
    ),
    cell: ({ row }) => {
      const diferencias = row.original.items_con_diferencia || 0
      if (diferencias === 0) {
        return <span className="text-muted-foreground">-</span>
      }
      return (
        <div className="flex items-center gap-1 text-amber-600">
          <AlertTriangle className="h-4 w-4" />
          <span className="font-medium">{diferencias}</span>
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
      const style = ESTADO_STYLES[estado] || { variant: 'secondary', label: estado }
      return <Badge variant={style.variant}>{style.label}</Badge>
    },
    filterFn: (row, id, value) => {
      return value.includes(row.getValue(id))
    },
  },
]
