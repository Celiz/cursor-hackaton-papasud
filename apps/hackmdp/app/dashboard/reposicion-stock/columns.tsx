"use client";

import { ColumnDef } from "@tanstack/react-table";
import { DataTableColumnHeader } from "@/components/data-table-column-header";
import { Badge } from "@/components/ui/badge";

export interface ReposicionItem {
  id: string;
  codigo: string;
  nombre: string;
  stock_actual: number | null;
  stock_minimo: number | null;
  proveedor_habitual_id: string | null;
  proveedor_nombre: string | null;
  cantidad_consumida_pendiente: number;
  movimientos_pendientes: number;
  ultimo_consumo: string | null;
  detalle_consumos: Array<{
    id: string;
    cantidad: number;
    origen_tipo: string;
    referencia: string;
    created_at: string;
  }> | null;
}

export const columnsReposicion: ColumnDef<ReposicionItem>[] = [
  {
    accessorKey: "codigo",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Código" />
    ),
    cell: ({ row }) => (
      <div className="font-mono text-sm">{row.original.codigo || "-"}</div>
    ),
  },
  {
    accessorKey: "nombre",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Producto" />
    ),
    cell: ({ row }) => (
      <div className="max-w-[250px] truncate font-medium">
        {row.original.nombre}
      </div>
    ),
  },
  {
    accessorKey: "stock_actual",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Stock" />
    ),
    cell: ({ row }) => {
      const stock = row.original.stock_actual;
      const minimo = row.original.stock_minimo;
      const isBajo =
        stock != null && minimo != null && stock <= minimo;
      return (
        <div className={isBajo ? "text-red-600 font-semibold" : ""}>
          {stock != null ? Number(stock) : "-"}
        </div>
      );
    },
  },
  {
    accessorKey: "stock_minimo",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Mínimo" />
    ),
    cell: ({ row }) => (
      <div className="text-muted-foreground">
        {row.original.stock_minimo != null
          ? Number(row.original.stock_minimo)
          : "-"}
      </div>
    ),
  },
  {
    accessorKey: "cantidad_consumida_pendiente",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Consumido pend." />
    ),
    cell: ({ row }) => {
      const val = Number(row.original.cantidad_consumida_pendiente);
      return (
        <Badge variant={val > 0 ? "destructive" : "secondary"}>
          {val}
        </Badge>
      );
    },
  },
  {
    accessorKey: "movimientos_pendientes",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Movimientos" />
    ),
    cell: ({ row }) => (
      <div className="text-center">
        {Number(row.original.movimientos_pendientes)}
      </div>
    ),
  },
  {
    accessorKey: "ultimo_consumo",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Último uso" />
    ),
    cell: ({ row }) => {
      const fecha = row.original.ultimo_consumo;
      if (!fecha) return <span className="text-muted-foreground">-</span>;
      return (
        <div className="text-sm text-muted-foreground">
          {new Date(fecha).toLocaleDateString("es-AR")}
        </div>
      );
    },
  },
  {
    accessorKey: "proveedor_nombre",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Proveedor" />
    ),
    cell: ({ row }) => (
      <div className="max-w-[150px] truncate text-muted-foreground">
        {row.original.proveedor_nombre || "-"}
      </div>
    ),
  },
];
