'use client';

import { useState } from 'react';
import useSWR from 'swr';
import { PageTabs, PageTab } from "@/components/core-ui/PageTabs";
import { Package, AlertTriangle, Archive, TrendingDown, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { GenericDataTable } from "@/components/core-ui/GenericDataTable";
import { Producto } from '@/lib/types';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ColumnDef } from "@tanstack/react-table";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export default function InventarioPageClient() {
  const { data: productos, isLoading } = useSWR<{ data: Producto[] } | Producto[]>('/api/productos?pageSize=1000', fetcher);
  const [sortBy, setSortBy] = useState("name");

  // Filtrar productos por categoría
  const allProducts = Array.isArray(productos) ? productos : (productos?.data ?? []);
  const lowStockProducts = allProducts.filter(
    (p) => p.stock_minimo && (p.stock_actual ?? 0) > 0 && (p.stock_actual ?? 0) <= p.stock_minimo
  );
  const outOfStockProducts = allProducts.filter((p) => (p.stock_actual ?? 0) <= 0);
  const expiringSoonProducts = allProducts.filter((p) => {
    // Simulación - aquí verificarías la fecha de vencimiento
    return false;
  });

  // Columnas base para productos
  const baseColumns: ColumnDef<Producto>[] = [
    {
      accessorKey: "codigo",
      header: "Código",
    },
    {
      accessorKey: "nombre",
      header: "Nombre",
    },
    {
      accessorKey: "categoria",
      header: "Categoría",
    },
    {
      accessorKey: "stock_actual",
      header: "Stock",
      cell: ({ row }) => {
        const stock = row.original.stock_actual ?? 0;
        const minStock = row.original.stock_minimo || 0;

        return (
          <div className="flex items-center gap-2">
            <span className={stock <= 0 ? 'text-red-600 font-semibold' : stock <= minStock ? 'text-orange-600 font-semibold' : ''}>
              {stock}
            </span>
            {minStock > 0 && (
              <span className="text-xs text-muted-foreground">
                / {minStock}
              </span>
            )}
          </div>
        );
      },
    },
    {
      accessorKey: "precio_venta",
      header: "Precio",
      cell: ({ row }) => {
        return new Intl.NumberFormat('es-AR', {
          style: 'currency',
          currency: 'ARS',
        }).format(row.original.precio_venta || 0);
      },
    },
  ];

  const tabs: PageTab[] = [
    {
      id: "todos",
      label: "Todos los Productos",
      icon: Package,
      badge: allProducts.length,
      content: (
        <div className="p-6 h-full overflow-auto bg-gradient-to-br from-white to-purple-50/10 dark:from-gray-950 dark:to-purple-950/5">
          <GenericDataTable
            columns={baseColumns}
            data={allProducts}
            isLoading={isLoading}
            searchPlaceholder="Buscar productos..."
            enableGlobalSearch={true}
            onRowClick={(producto) => console.log("Ver producto:", producto)}
          />
        </div>
      ),
    },
    {
      id: "stock-bajo",
      label: "Stock Bajo",
      icon: TrendingDown,
      badge: lowStockProducts.length,
      content: (
        <div className="p-6 h-full overflow-auto bg-gradient-to-br from-white to-orange-50/10 dark:from-gray-950 dark:to-orange-950/5">
          <div className="mb-6 p-4 border border-orange-200/40 dark:border-orange-800/30 rounded-xl bg-gradient-to-r from-orange-50/50 to-transparent dark:from-orange-950/20 dark:to-transparent">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-orange-500 to-orange-600 shadow-md shadow-orange-500/30">
                <TrendingDown className="h-5 w-5 text-white" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-orange-900 dark:text-orange-100">
                  Productos con Stock Bajo
                </h3>
                <p className="text-xs text-orange-600/70 dark:text-orange-400/70">
                  {lowStockProducts.length} productos por debajo del stock mínimo
                </p>
              </div>
            </div>
          </div>
          <GenericDataTable
            columns={baseColumns}
            data={lowStockProducts}
            isLoading={isLoading}
            searchPlaceholder="Buscar en stock bajo..."
            enableGlobalSearch={true}
          />
        </div>
      ),
    },
    {
      id: "sin-stock",
      label: "Sin Stock",
      icon: AlertTriangle,
      badge: outOfStockProducts.length,
      content: (
        <div className="p-6 h-full overflow-auto bg-gradient-to-br from-white to-red-50/10 dark:from-gray-950 dark:to-red-950/5">
          <div className="mb-6 p-4 border border-red-200/40 dark:border-red-800/30 rounded-xl bg-gradient-to-r from-red-50/50 to-transparent dark:from-red-950/20 dark:to-transparent">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-red-500 to-red-600 shadow-md shadow-red-500/30">
                <AlertTriangle className="h-5 w-5 text-white" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-red-900 dark:text-red-100">
                  Productos Sin Stock
                </h3>
                <p className="text-xs text-red-600/70 dark:text-red-400/70">
                  {outOfStockProducts.length} productos agotados que requieren reposición
                </p>
              </div>
            </div>
          </div>
          <GenericDataTable
            columns={baseColumns}
            data={outOfStockProducts}
            isLoading={isLoading}
            searchPlaceholder="Buscar sin stock..."
            enableGlobalSearch={true}
          />
        </div>
      ),
    },
    {
      id: "por-vencer",
      label: "Por Vencer",
      icon: Clock,
      badge: expiringSoonProducts.length || undefined,
      content: (
        <div className="p-6 h-full overflow-auto bg-gradient-to-br from-white to-amber-50/10 dark:from-gray-950 dark:to-amber-950/5">
          <div className="mb-6 p-4 border border-amber-200/40 dark:border-amber-800/30 rounded-xl bg-gradient-to-r from-amber-50/50 to-transparent dark:from-amber-950/20 dark:to-transparent">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-amber-500 to-amber-600 shadow-md shadow-amber-500/30">
                <Clock className="h-5 w-5 text-white" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-amber-900 dark:text-amber-100">
                  Productos Próximos a Vencer
                </h3>
                <p className="text-xs text-amber-600/70 dark:text-amber-400/70">
                  Productos con fecha de vencimiento en los próximos 30 días
                </p>
              </div>
            </div>
          </div>
          <div className="text-center py-12">
            <Clock className="h-16 w-16 mx-auto text-muted-foreground/30 mb-4" />
            <p className="text-muted-foreground text-sm">
              No hay productos próximos a vencer
            </p>
          </div>
        </div>
      ),
    },
  ];

  return (
    <PageTabs
      tabs={tabs}
      defaultTab="todos"
      onTabChange={(tabId) => {
        console.log("Tab activo:", tabId);
        // Aquí podrías hacer tracking, analytics, etc.
      }}
      headerActions={
        <>
          <span className="text-sm text-muted-foreground mr-2">Ordenar por</span>
          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger className="w-36 border-purple-200/40 dark:border-purple-800/30">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="name">Nombre</SelectItem>
              <SelectItem value="stock">Stock</SelectItem>
              <SelectItem value="price">Precio</SelectItem>
              <SelectItem value="category">Categoría</SelectItem>
            </SelectContent>
          </Select>

          <Button
            variant="outline"
            className="border-purple-200/40 dark:border-purple-800/30 hover:bg-purple-50 dark:hover:bg-purple-950/20"
          >
            Exportar
          </Button>

          <Button className="bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 shadow-md shadow-purple-500/30">
            + Nuevo Producto
          </Button>
        </>
      }
    />
  );
}
