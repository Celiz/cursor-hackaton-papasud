'use client'

import { ColumnDef } from '@tanstack/react-table'
import { DataTableColumnHeader } from '@/components/data-table-column-header'
import { Badge } from '@/components/ui/badge'
import { Shield, AlertTriangle, CheckCircle } from 'lucide-react'

export interface Serial {
  id: string
  producto_id: string
  numero_serie: string
  lote_id: string | null
  deposito_id: string | null
  bin_id: string | null
  cliente_id: string | null
  estado: 'stock' | 'vendido' | 'comodato' | 'servicio_tecnico' | 'baja' | 'reparacion'
  garantia_meses: number | null
  garantia_hasta: string | null
  costo_adquisicion: number | null
  fecha_venta: string | null
  factura_venta: string | null
  created_at: string
  updated_at: string
  producto?: {
    id: string
    codigo: string | null
    nombre: string
  }
  lote?: {
    numero_lote: string | null
    fecha_vencimiento: string | null
  }
  deposito?: {
    nombre: string | null
  }
  bin?: {
    codigo: string | null
    nombre: string | null
  }
  cliente?: {
    nombre: string | null
    razon_social: string | null
  }
}

const ESTADO_STYLES: Record<string, { variant: 'default' | 'secondary' | 'destructive' | 'outline'; label: string }> = {
  stock: { variant: 'default', label: 'En Stock' },
  vendido: { variant: 'secondary', label: 'Vendido' },
  comodato: { variant: 'outline', label: 'Comodato' },
  servicio_tecnico: { variant: 'outline', label: 'Servicio Técnico' },
  baja: { variant: 'destructive', label: 'Baja' },
  reparacion: { variant: 'outline', label: 'En Reparación' },
}

export const columnsSeriales: ColumnDef<Serial>[] = [
  {
    accessorKey: 'numero_serie',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Número de Serie" />
    ),
    cell: ({ row }) => (
      <span className="font-mono font-medium">{row.original.numero_serie}</span>
    ),
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
        <div className="flex flex-col">
          <span className="font-medium">{producto.nombre}</span>
          {producto.codigo && (
            <span className="text-xs text-muted-foreground">{producto.codigo}</span>
          )}
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
  {
    accessorKey: 'ubicacion',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Ubicación" />
    ),
    cell: ({ row }) => {
      const deposito = row.original.deposito?.nombre
      const bin = row.original.bin?.codigo || row.original.bin?.nombre

      if (!deposito && !bin) {
        return <span className="text-muted-foreground">Sin ubicación</span>
      }

      return (
        <div className="flex flex-col text-sm">
          {deposito && <span>{deposito}</span>}
          {bin && <span className="text-muted-foreground text-xs">{bin}</span>}
        </div>
      )
    },
  },
  {
    accessorKey: 'lote',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Lote" />
    ),
    cell: ({ row }) => {
      const lote = row.original.lote
      if (!lote?.numero_lote) return <span className="text-muted-foreground">-</span>
      return <span className="font-mono text-sm">{lote.numero_lote}</span>
    },
  },
  {
    accessorKey: 'garantia',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Garantía" />
    ),
    cell: ({ row }) => {
      const garantia_hasta = row.original.garantia_hasta

      if (!garantia_hasta) {
        return <span className="text-muted-foreground">-</span>
      }

      const hoy = new Date()
      const fechaGarantia = new Date(garantia_hasta)
      const diasRestantes = Math.ceil((fechaGarantia.getTime() - hoy.getTime()) / (1000 * 60 * 60 * 24))

      if (diasRestantes < 0) {
        return (
          <div className="flex items-center gap-1 text-destructive">
            <AlertTriangle className="h-4 w-4" />
            <span className="text-sm">Vencida</span>
          </div>
        )
      }

      if (diasRestantes <= 30) {
        return (
          <div className="flex items-center gap-1 text-amber-600">
            <Shield className="h-4 w-4" />
            <span className="text-sm">{diasRestantes}d restantes</span>
          </div>
        )
      }

      return (
        <div className="flex items-center gap-1 text-green-600">
          <CheckCircle className="h-4 w-4" />
          <span className="text-sm">
            {new Date(garantia_hasta).toLocaleDateString('es-AR')}
          </span>
        </div>
      )
    },
  },
  {
    accessorKey: 'cliente',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Cliente" />
    ),
    cell: ({ row }) => {
      const cliente = row.original.cliente
      if (!cliente?.nombre && !cliente?.razon_social) {
        return <span className="text-muted-foreground">-</span>
      }
      return <span className="text-sm">{cliente.nombre || cliente.razon_social}</span>
    },
  },
]
