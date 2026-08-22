"use client";

import { useState } from "react";
import useSWR from "swr";
import { GenericDataTable } from "@/components/core-ui/GenericDataTable";
import { columnsStock } from "./columns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Package, AlertTriangle, TrendingDown, Boxes, Warehouse } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface DepositoOption {
  id: string;
  nombre: string;
}

const fetcher = async (url: string) => {
  const res = await fetch(url);
  const data = await res.json();
  if (!res.ok || data.error) throw new Error(data.error || "Error al cargar stock");
  // La API de productos devuelve { data: [], pagination: {} }
  if (data.data && Array.isArray(data.data)) return data.data;
  return Array.isArray(data) ? data : [];
};

const depositosFetcher = async (url: string): Promise<DepositoOption[]> => {
  const res = await fetch(url);
  const data = await res.json();
  return Array.isArray(data) ? data : data?.rows || [];
};

export default function StockPageClient() {
  const [depositoFilter, setDepositoFilter] = useState<string>("todos");
  const { data: depositos = [] } = useSWR<DepositoOption[]>(
    "/api/inventario/depositos",
    depositosFetcher
  );
  const productosUrl =
    depositoFilter === "todos"
      ? "/api/productos?pageSize=1000"
      : `/api/productos?pageSize=1000&deposito_id=${depositoFilter}`;
  const { data: productos = [], error, mutate } = useSWR(productosUrl, fetcher);
  const [selectedProducto, setSelectedProducto] = useState<any>(null);

  // Calcular estadísticas de stock
  const totalProductos = productos.length;
  const stockBajo = productos.filter((p: any) => {
    const stock = p.stock_actual || 0;
    const minimo = p.stock_minimo || 0;
    return stock > 0 && stock <= minimo;
  }).length;
  const sinStock = productos.filter((p: any) => (p.stock_actual || 0) === 0).length;
  const valorTotal = productos.reduce((sum: number, p: any) => {
    return sum + ((p.stock_actual || 0) * (p.precio_unitario || 0));
  }, 0);

  const stats = [
    {
      title: "Total Productos",
      value: totalProductos,
      icon: Package,
      color: "text-blue-600",
      bgColor: "bg-blue-100",
    },
    {
      title: "Stock Bajo",
      value: stockBajo,
      icon: TrendingDown,
      color: "text-orange-600",
      bgColor: "bg-orange-100",
    },
    {
      title: "Sin Stock",
      value: sinStock,
      icon: AlertTriangle,
      color: "text-red-600",
      bgColor: "bg-red-100",
    },
    {
      title: "Valor Total",
      value: `$${valorTotal.toLocaleString('es-AR', { minimumFractionDigits: 2 })}`,
      icon: Boxes,
      color: "text-green-600",
      bgColor: "bg-green-100",
    },
  ];

  if (error) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800">Error al cargar el stock: {error.message}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Stock de productos</h1>
          <p className="text-muted-foreground">
            Insumos, materiales y repuestos por depósito
          </p>
        </div>
        {depositos.length > 0 && (
          <Select value={depositoFilter} onValueChange={setDepositoFilter}>
            <SelectTrigger className="w-[220px]">
              <Warehouse className="h-4 w-4 mr-2 text-muted-foreground" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos los depósitos</SelectItem>
              {depositos.map((d) => (
                <SelectItem key={d.id} value={d.id}>
                  {d.nombre}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      {/* Estadísticas */}
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.title}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
                <div className={`p-2 rounded-full ${stat.bgColor}`}>
                  <Icon className={`h-4 w-4 ${stat.color}`} />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stat.value}</div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Tabla de stock */}
      <Card>
        <CardContent className="p-6">
          <GenericDataTable
            columns={columnsStock}
            data={productos}
            searchColumnId="nombre"
            enableGlobalSearch={true}
            enableAutoFilters={true}
            onRowClick={(producto) => setSelectedProducto(producto)}
          />
        </CardContent>
      </Card>
    </div>
  );
}
