"use client"

import { ColumnDef } from "@tanstack/react-table"
import { DataTableColumnHeader } from "@/components/data-table-column-header"
import { Producto } from "@/lib/types"
import { formatCurrency } from "@/lib/format-currency"

// Función helper para formatear porcentaje
const formatPercent = (value: number | null | undefined) => {
    if (value === null || value === undefined) return "-"
    return `${Number(value).toFixed(1)}%`
}

export const columnsProductos: ColumnDef<Producto>[] = [
    {
        accessorKey: "codigo",
        header: ({ column }) => (
            <DataTableColumnHeader column={column} title="Código" />
        ),
        cell: ({ row }) => (
            <div className="font-mono text-sm">{row.original.codigo}</div>
        ),
    },
    {
        accessorKey: "nombre",
        header: ({ column }) => (
            <DataTableColumnHeader column={column} title="Nombre" />
        ),
        cell: ({ row }) => (
            <span className="block max-w-[300px] truncate font-medium">
                {row.original.nombre}
            </span>
        ),
    },
    {
        accessorKey: "categoria",
        header: ({ column }) => (
            <DataTableColumnHeader column={column} title="Categoría" />
        ),
        cell: ({ row }) => (
            <div className="text-muted-foreground">{row.original.categoria}</div>
        ),
    },
    {
        accessorKey: "proveedor_nombre",
        header: ({ column }) => (
            <DataTableColumnHeader column={column} title="Proveedor" />
        ),
        cell: ({ row }) => (
            <div className="max-w-[150px] truncate">
                {(row.original as any).proveedor_nombre || "-"}
            </div>
        ),
        filterFn: (row, id, value) => {
            return value.includes((row.original as any).proveedor_nombre)
        },
    },
    {
        accessorKey: "precio_costo",
        header: ({ column }) => (
            <DataTableColumnHeader column={column} title="P. Costo" />
        ),
        cell: ({ row }) => (
            <div className="text-right font-medium">
                {formatCurrency(row.original.precio_costo, row.original.moneda || 'ARS')}
            </div>
        ),
    },
    {
        accessorKey: "precio_venta",
        header: ({ column }) => (
            <DataTableColumnHeader column={column} title="P. Venta" />
        ),
        cell: ({ row }) => (
            <div className="text-right font-medium">
                {formatCurrency(row.original.precio_venta, row.original.moneda || 'ARS')}
            </div>
        ),
    },
    {
        accessorKey: "margen_porcentaje",
        header: ({ column }) => (
            <DataTableColumnHeader column={column} title="Margen" />
        ),
        cell: ({ row }) => {
            const margen = row.original.margen_porcentaje
            if (margen === null || margen === undefined) return <div className="text-right">-</div>
            return (
                <div className={`text-right font-medium ${margen >= 30 ? 'text-green-600' : margen >= 15 ? 'text-yellow-600' : 'text-red-600'}`}>
                    {formatPercent(margen)}
                </div>
            )
        },
    },
    {
        accessorKey: "unidad_medida",
        header: ({ column }) => (
            <DataTableColumnHeader column={column} title="Unidad" />
        ),
        cell: ({ row }) => (
            <div className="text-muted-foreground">{row.original.unidad_medida}</div>
        ),
    },
    {
        accessorKey: "deposito_nombre",
        header: ({ column }) => (
            <DataTableColumnHeader column={column} title="Depósito" />
        ),
        cell: ({ row }) => (
            <div className="text-sm">{(row.original as any).deposito_nombre || "-"}</div>
        ),
    },
    {
        accessorKey: "stock_actual",
        header: ({ column }) => (
            <DataTableColumnHeader column={column} title="Stock" />
        ),
        cell: ({ row }) => {
            const n = Number((row.original as any).stock_actual) || 0
            const min = (row.original as any).stock_minimo
            const low = min !== null && min !== undefined && n < Number(min)
            const color = n <= 0 ? "text-red-600" : low ? "text-yellow-600" : "text-foreground"
            return <div className={`text-right text-sm font-medium ${color}`}>{n}</div>
        },
    },
    {
        // Columna derivada equipo/insumo (no es columna real; el filtro lo
        // resuelve la API con el param `tipo`). Solo hostea el embudo + muestra el valor.
        id: "tipo_derivado",
        header: ({ column }) => (
            <DataTableColumnHeader column={column} title="Tipo" />
        ),
        enableSorting: false,
        cell: ({ row }) => {
            const cat = (row.original.categoria || "") as string
            const esEquipo = /equipo|módulo|modulo/i.test(cat)
            return <span className="text-sm text-muted-foreground">{esEquipo ? "Equipo" : "Insumo"}</span>
        },
    },
    {
        accessorKey: "linea_analisis",
        header: ({ column }) => (
            <DataTableColumnHeader column={column} title="Área" />
        ),
        enableSorting: false,
        cell: ({ row }) => {
            const a = (row.original as any).linea_analisis
            return a ? <span className="text-sm">{a}</span> : <span className="text-sm text-muted-foreground">-</span>
        },
    },
]
