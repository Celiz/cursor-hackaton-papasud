'use client'

import { ColumnDef } from '@tanstack/react-table'
import { DataTableColumnHeader } from '@/components/data-table-column-header'
import { Badge } from '@/components/ui/badge'
import { MapPin, Lock, Thermometer, Package } from 'lucide-react'

export interface Bin {
  id: string
  deposito_id: string
  codigo: string
  nombre: string | null
  descripcion: string | null
  pasillo: string | null
  estanteria: string | null
  nivel: number | null
  posicion: string | null
  tipo: 'picking' | 'reserve' | 'receiving' | 'shipping' | 'quarantine' | 'returns'
  prioridad: number
  capacidad_m3: number | null
  capacidad_kg: number | null
  capacidad_unidades: number | null
  ocupacion_m3: number
  ocupacion_kg: number
  ocupacion_unidades: number
  porcentaje_ocupacion: number
  solo_producto_id: string | null
  temperatura_min: number | null
  temperatura_max: number | null
  bloqueado: boolean
  razon_bloqueo: string | null
  activo: boolean
  created_at: string
  updated_at: string
  deposito?: {
    id: string
    codigo: string
    nombre: string
  }
  producto_dedicado?: {
    id: string
    codigo: string | null
    nombre: string
  }
}

const TIPO_STYLES: Record<string, { variant: 'default' | 'secondary' | 'outline' | 'destructive'; label: string }> = {
  picking: { variant: 'default', label: 'Picking' },
  reserve: { variant: 'secondary', label: 'Reserva' },
  receiving: { variant: 'outline', label: 'Recepción' },
  shipping: { variant: 'outline', label: 'Envío' },
  quarantine: { variant: 'destructive', label: 'Cuarentena' },
  returns: { variant: 'outline', label: 'Devoluciones' },
}

export const columnsBins: ColumnDef<Bin>[] = [
  {
    accessorKey: 'codigo',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Código" />
    ),
    cell: ({ row }) => (
      <div className="flex items-center gap-2">
        <MapPin className="h-4 w-4 text-muted-foreground" />
        <span className="font-mono font-medium">{row.original.codigo}</span>
        {row.original.bloqueado && (
          <Lock className="h-4 w-4 text-destructive" />
        )}
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
      if (!deposito) return <span className="text-muted-foreground">-</span>
      return <span className="text-sm">{deposito.nombre}</span>
    },
  },
  {
    accessorKey: 'ubicacion',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Ubicación" />
    ),
    cell: ({ row }) => {
      const bin = row.original
      const parts = [
        bin.pasillo && `P:${bin.pasillo}`,
        bin.estanteria && `E:${bin.estanteria}`,
        bin.nivel && `N:${bin.nivel}`,
        bin.posicion && `Pos:${bin.posicion}`,
      ].filter(Boolean)

      if (parts.length === 0) {
        return <span className="text-muted-foreground">-</span>
      }
      return <span className="text-sm font-mono">{parts.join(' / ')}</span>
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
    accessorKey: 'ocupacion',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Ocupación" />
    ),
    cell: ({ row }) => {
      const bin = row.original
      const porcentaje = bin.porcentaje_ocupacion || 0

      let color = 'bg-green-500'
      if (porcentaje >= 80) color = 'bg-red-500'
      else if (porcentaje >= 60) color = 'bg-amber-500'

      return (
        <div className="flex items-center gap-2 min-w-[100px]">
          <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
            <div
              className={`h-full ${color} transition-all`}
              style={{ width: `${Math.min(porcentaje, 100)}%` }}
            />
          </div>
          <span className="text-sm font-medium w-12 text-right">
            {porcentaje.toFixed(0)}%
          </span>
        </div>
      )
    },
  },
  {
    accessorKey: 'capacidad_unidades',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Capacidad" />
    ),
    cell: ({ row }) => {
      const bin = row.original
      if (!bin.capacidad_unidades) {
        return <span className="text-muted-foreground">-</span>
      }
      return (
        <div className="flex items-center gap-1">
          <Package className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm">
            {bin.ocupacion_unidades}/{bin.capacidad_unidades}
          </span>
        </div>
      )
    },
  },
  {
    accessorKey: 'temperatura',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Temp." />
    ),
    cell: ({ row }) => {
      const bin = row.original
      if (bin.temperatura_min == null && bin.temperatura_max == null) {
        return <span className="text-muted-foreground">-</span>
      }
      return (
        <div className="flex items-center gap-1 text-blue-600">
          <Thermometer className="h-4 w-4" />
          <span className="text-sm">
            {bin.temperatura_min}° - {bin.temperatura_max}°
          </span>
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
      const bin = row.original
      if (bin.bloqueado) {
        return <Badge variant="destructive">Bloqueado</Badge>
      }
      return (
        <Badge variant={bin.activo ? 'default' : 'secondary'}>
          {bin.activo ? 'Activo' : 'Inactivo'}
        </Badge>
      )
    },
    filterFn: (row, id, value) => {
      const bin = row.original
      if (value.includes('bloqueado') && bin.bloqueado) return true
      if (value.includes('activo') && bin.activo && !bin.bloqueado) return true
      if (value.includes('inactivo') && !bin.activo) return true
      return false
    },
  },
]
