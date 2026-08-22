"use client";

import { ColumnDef } from "@tanstack/react-table";
import { DataTableColumnHeader } from "@/components/data-table-column-header";
import { Badge } from "@/components/ui/badge";
import { Beaker, AlertTriangle, CheckCircle, Clock } from "lucide-react";

export interface Insumo {
  id: number;
  nombre: string;
  codigo: string;
  categoria: string;
  unidad_medida: string;
  stock_actual?: number;
  stock_minimo?: number;
  lote?: string;
  fecha_vencimiento?: string;
  fabricante?: string;
  temperatura_almacenamiento?: string;
  created_at: string;
}

export const columnsInsumos: ColumnDef<Insumo>[] = [
  {
    accessorKey: "codigo",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Código" />
    ),
    cell: ({ row }) => (
      <div className="font-mono text-sm font-medium">{row.original.codigo}</div>
    ),
  },
  {
    accessorKey: "nombre",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Insumo" />
    ),
    cell: ({ row }) => (
      <div>
        <div className="font-medium">{row.original.nombre}</div>
        {row.original.fabricante && (
          <div className="text-xs text-muted-foreground">
            {row.original.fabricante}
          </div>
        )}
      </div>
    ),
  },
  {
    accessorKey: "lote",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Lote" />
    ),
    cell: ({ row }) => (
      <div className="font-mono text-sm">{row.original.lote || "-"}</div>
    ),
  },
  {
    accessorKey: "stock_actual",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Stock" />
    ),
    cell: ({ row }) => {
      const stock = row.original.stock_actual || 0;
      const minimo = row.original.stock_minimo || 0;
      const unidad = row.original.unidad_medida || "UN";

      let icon = <CheckCircle className="h-4 w-4 text-green-600" />;
      let badgeVariant: "default" | "destructive" | "outline" | "secondary" = "outline";
      let colorClass = "text-green-600";

      if (stock === 0) {
        icon = <AlertTriangle className="h-4 w-4 text-red-600" />;
        badgeVariant = "destructive";
        colorClass = "text-red-600";
      } else if (stock <= minimo) {
        icon = <AlertTriangle className="h-4 w-4 text-orange-600" />;
        badgeVariant = "outline";
        colorClass = "text-orange-600";
      }

      return (
        <div className="flex items-center gap-2">
          {icon}
          <Badge variant={badgeVariant} className={colorClass}>
            {stock.toLocaleString()} {unidad}
          </Badge>
        </div>
      );
    },
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

      let variant: "default" | "destructive" | "outline" | "secondary" = "outline";
      let icon = <CheckCircle className="h-4 w-4 text-green-600" />;

      if (diasRestantes < 0) {
        variant = "destructive";
        icon = <AlertTriangle className="h-4 w-4 text-red-600" />;
      } else if (diasRestantes <= 30) {
        icon = <Clock className="h-4 w-4 text-orange-600" />;
      }

      return (
        <div className="flex items-center gap-2">
          {icon}
          <div>
            <div className="text-sm font-medium">
              {vencimiento.toLocaleDateString("es-AR")}
            </div>
            {diasRestantes >= 0 && (
              <div className="text-xs text-muted-foreground">
                {diasRestantes === 0
                  ? "Vence hoy"
                  : diasRestantes === 1
                  ? "Vence mañana"
                  : `${diasRestantes} días`}
              </div>
            )}
            {diasRestantes < 0 && (
              <div className="text-xs text-red-600 font-medium">Vencido</div>
            )}
          </div>
        </div>
      );
    },
  },
  {
    accessorKey: "temperatura_almacenamiento",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Temp. Almac." />
    ),
    cell: ({ row }) => {
      const temp = row.original.temperatura_almacenamiento;
      if (!temp) return <span className="text-muted-foreground">-</span>;

      const colorMap: Record<string, string> = {
        "2-8°C": "bg-blue-100 text-blue-800",
        "-20°C": "bg-cyan-100 text-cyan-800",
        "-80°C": "bg-indigo-100 text-indigo-800",
        "Ambiente": "bg-gray-100 text-gray-800",
      };

      return (
        <Badge variant="outline" className={colorMap[temp] || "bg-gray-100 text-gray-800"}>
          {temp}
        </Badge>
      );
    },
  },
  {
    accessorKey: "categoria",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Tipo" />
    ),
    cell: ({ row }) => {
      const categoria = row.original.categoria;
      return (
        <div className="text-sm text-muted-foreground">{categoria}</div>
      );
    },
  },
];
