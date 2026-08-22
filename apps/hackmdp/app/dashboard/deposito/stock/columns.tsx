"use client";

import { ColumnDef } from "@tanstack/react-table";
import { DataTableColumnHeader } from "@/components/data-table-column-header";
import { Badge } from "@/components/ui/badge";
import { Package, AlertTriangle, CheckCircle } from "lucide-react";

export interface ProductoStock {
  id: number;
  nombre: string;
  codigo: string;
  categoria: string;
  unidad_medida: string;
  stock_actual?: number;
  stock_minimo?: number;
  stock_maximo?: number;
  precio_unitario?: number;
  ubicacion?: string;
  lote?: string;
  fecha_vencimiento?: string;
  deposito_id?: string | null;
  deposito_nombre?: string | null;
  created_at: string;
}

export const columnsStock: ColumnDef<ProductoStock>[] = [
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
      <DataTableColumnHeader column={column} title="Producto" />
    ),
    cell: ({ row }) => (
      <div className="font-medium">{row.original.nombre}</div>
    ),
  },
  {
    accessorKey: "categoria",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Categoría" />
    ),
    cell: ({ row }) => {
      const categoria = row.original.categoria;
      const colorMap: Record<string, string> = {
        "Insumos In Vitro": "bg-purple-100 text-purple-800",
        "Materiales de Laboratorio": "bg-blue-100 text-blue-800",
        "Repuestos y Piezas": "bg-orange-100 text-orange-800",
        "Reactivos": "bg-pink-100 text-pink-800",
        "Consumibles": "bg-green-100 text-green-800",
      };
      return (
        <Badge variant="outline" className={colorMap[categoria] || "bg-gray-100 text-gray-800"}>
          {categoria}
        </Badge>
      );
    },
  },
  {
    accessorKey: "stock_actual",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Stock Actual" />
    ),
    cell: ({ row }) => {
      const stock = row.original.stock_actual || 0;
      const minimo = row.original.stock_minimo || 0;
      const unidad = row.original.unidad_medida || "UN";

      let icon = <CheckCircle className="h-4 w-4 text-green-600" />;
      let colorClass = "text-green-600";

      if (stock === 0) {
        icon = <AlertTriangle className="h-4 w-4 text-red-600" />;
        colorClass = "text-red-600 font-semibold";
      } else if (stock <= minimo) {
        icon = <Package className="h-4 w-4 text-orange-600" />;
        colorClass = "text-orange-600 font-medium";
      }

      return (
        <div className="flex items-center gap-2">
          {icon}
          <span className={colorClass}>
            {stock.toLocaleString()} {unidad}
          </span>
        </div>
      );
    },
  },
  {
    accessorKey: "stock_minimo",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Stock Mínimo" />
    ),
    cell: ({ row }) => {
      const minimo = row.original.stock_minimo || 0;
      const unidad = row.original.unidad_medida || "UN";
      return (
        <div className="text-sm text-muted-foreground">
          {minimo.toLocaleString()} {unidad}
        </div>
      );
    },
  },
  {
    accessorKey: "deposito_nombre",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Depósito" />
    ),
    cell: ({ row }) => {
      const dep = row.original.deposito_nombre;
      const ubic = row.original.ubicacion;
      if (!dep && !ubic) return <div className="text-sm text-muted-foreground">-</div>;
      return (
        <div className="flex flex-col">
          {dep && <p className="text-sm font-medium">{dep}</p>}
          {ubic && <p className="text-xs text-muted-foreground">{ubic}</p>}
        </div>
      );
    },
  },
  {
    accessorKey: "lote",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Lote" />
    ),
    cell: ({ row }) => (
      <div className="font-mono text-xs">{row.original.lote || "-"}</div>
    ),
  },
  {
    accessorKey: "fecha_vencimiento",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Vencimiento" />
    ),
    cell: ({ row }) => {
      const fecha = row.original.fecha_vencimiento;
      if (!fecha) return <span className="text-muted-foreground">-</span>;

      const vencimiento = new Date(fecha);
      const hoy = new Date();
      const diasRestantes = Math.floor(
        (vencimiento.getTime() - hoy.getTime()) / (1000 * 60 * 60 * 24)
      );

      let colorClass = "text-gray-600";
      if (diasRestantes < 0) {
        colorClass = "text-red-600 font-semibold";
      } else if (diasRestantes <= 30) {
        colorClass = "text-orange-600 font-medium";
      }

      return (
        <div className={`text-sm ${colorClass}`}>
          {vencimiento.toLocaleDateString("es-AR")}
          {diasRestantes >= 0 && diasRestantes <= 30 && (
            <div className="text-xs text-muted-foreground">
              ({diasRestantes} días)
            </div>
          )}
        </div>
      );
    },
  },
  {
    accessorKey: "precio_unitario",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Precio Unit." />
    ),
    cell: ({ row }) => {
      const precio = row.original.precio_unitario || 0;
      return (
        <div className="text-sm font-medium">
          ${precio.toLocaleString("es-AR", { minimumFractionDigits: 2 })}
        </div>
      );
    },
  },
];
