'use client'

import { ColumnDef } from '@tanstack/react-table'
import { DataTableColumnHeader } from '@/components/data-table-column-header'
import { Badge } from '@/components/ui/badge'
import { Warehouse, Thermometer, Package, Star } from 'lucide-react'

export interface Deposito {
  id: string
  codigo: string
  nombre: string
  tipo: 'almacen' | 'tienda' | 'frigorifico' | 'transito' | 'devolucion' | 'cuarentena'
  direccion: string | null
  ciudad: string | null
  provincia: string | null
  codigo_postal: string | null
  telefono: string | null
  responsable: string | null
  capacidad_m3: number | null
  temperatura_controlada: boolean
  temperatura_min: number | null
  temperatura_max: number | null
  requiere_autorizacion: boolean
  permite_picking: boolean
  permite_recepcion: boolean
  es_principal: boolean
  activo: boolean
  notas: string | null
  created_at: string
  updated_at: string
  // Campos calculados
  total_bins: number
  total_productos: number
  total_stock: number
  total_reservado: number
  stock: any[]
}

const TIPO_STYLES: Record<string, { variant: 'default' | 'secondary' | 'outline'; label: string }> = {
  almacen: { variant: 'default', label: 'Almacén' },
  tienda: { variant: 'secondary', label: 'Tienda' },
  frigorifico: { variant: 'outline', label: 'Frigorífico' },
  transito: { variant: 'outline', label: 'Tránsito' },
  devolucion: { variant: 'outline', label: 'Devolución' },
  cuarentena: { variant: 'outline', label: 'Cuarentena' },
}

export const columnsDepositos: ColumnDef<Deposito>[] = [
  {
    accessorKey: 'codigo',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Código" />
    ),
    cell: ({ row }) => (
      <span className="font-mono font-medium">{row.original.codigo}</span>
    ),
  },
  {
    accessorKey: 'nombre',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Nombre" />
    ),
    cell: ({ row }) => {
      const deposito = row.original
      return (
        <div className="flex items-center gap-2">
          <Warehouse className="h-4 w-4 text-muted-foreground" />
          <span className="font-medium">{deposito.nombre}</span>
          {deposito.es_principal && (
            <Star className="h-4 w-4 text-amber-500 fill-amber-500" />
          )}
        </div>
      )
    },
  },
  {
    accessorKey: 'tipo',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Tipo" />
    ),
    cell: ({ row }) => {
      const tipo = row.original.tipo
      const style = TIPO_STYLES[tipo] || { variant: 'secondary', label: tipo }
      return <Badge variant={style.variant}>{style.label}</Badge>
    },
    filterFn: (row, id, value) => {
      return value.includes(row.getValue(id))
    },
  },
  {
    accessorKey: 'ubicacion',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Ubicación" />
    ),
    cell: ({ row }) => {
      const deposito = row.original
      if (!deposito.ciudad && !deposito.provincia) {
        return <span className="text-muted-foreground">-</span>
      }
      return (
        <span className="text-sm">
          {[deposito.ciudad, deposito.provincia].filter(Boolean).join(', ')}
        </span>
      )
    },
  },
  {
    accessorKey: 'temperatura_controlada',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Temp. Control" />
    ),
    cell: ({ row }) => {
      const deposito = row.original
      if (!deposito.temperatura_controlada) {
        return <span className="text-muted-foreground">-</span>
      }
      return (
        <div className="flex items-center gap-1 text-blue-600">
          <Thermometer className="h-4 w-4" />
          <span className="text-sm">
            {deposito.temperatura_min}°C - {deposito.temperatura_max}°C
          </span>
        </div>
      )
    },
  },
  {
    accessorKey: 'total_bins',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Bins" />
    ),
    cell: ({ row }) => (
      <span className="font-medium">{row.original.total_bins || 0}</span>
    ),
  },
  {
    accessorKey: 'total_stock',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Stock" />
    ),
    cell: ({ row }) => {
      const stock = row.original.total_stock || 0
      const reservado = row.original.total_reservado || 0
      return (
        <div className="flex items-center gap-2">
          <Package className="h-4 w-4 text-muted-foreground" />
          <span className="font-medium">{stock.toLocaleString('es-AR')}</span>
          {reservado > 0 && (
            <span className="text-xs text-muted-foreground">
              ({reservado} reservados)
            </span>
          )}
        </div>
      )
    },
  },
  {
    accessorKey: 'activo',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Estado" />
    ),
    cell: ({ row }) => {
      const activo = row.original.activo
      return (
        <Badge variant={activo ? 'default' : 'destructive'}>
          {activo ? 'Activo' : 'Inactivo'}
        </Badge>
      )
    },
    filterFn: (row, id, value) => {
      const activo = row.original.activo
      return value.includes(activo ? 'true' : 'false')
    },
  },
]
