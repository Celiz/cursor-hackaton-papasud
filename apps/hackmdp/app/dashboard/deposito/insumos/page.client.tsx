"use client";

import { useState, useMemo } from "react";
import useSWR from "swr";
import { GenericDataTable } from "@/components/core-ui/GenericDataTable";
import { columnsInsumos } from "./columns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Beaker, AlertCircle, Package2, DollarSign } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const fetcher = async (url: string) => {
  const res = await fetch(url);
  const data = await res.json();
  if (!res.ok || data.error) throw new Error(data.error || "Error al cargar insumos");
  return Array.isArray(data) ? data : (data?.data ?? []);
};

export default function InsumosPageClient() {
  const { data: productos = [], error } = useSWR("/api/productos?pageSize=1000", fetcher);
  const [selectedInsumo, setSelectedInsumo] = useState<any>(null);

  // Filtrar solo insumos in vitro y reactivos
  const insumos = useMemo(() => {
    return productos.filter((p: any) =>
      p.categoria === "Insumos In Vitro" ||
      p.categoria === "Reactivos" ||
      p.categoria === "Kits de Diagnóstico"
    );
  }, [productos]);

  // Agrupar por categoría
  const insumosPorCategoria = useMemo(() => {
    const grupos: Record<string, any[]> = {};
    insumos.forEach((insumo: any) => {
      const cat = insumo.categoria || "Sin categoría";
      if (!grupos[cat]) grupos[cat] = [];
      grupos[cat].push(insumo);
    });
    return grupos;
  }, [insumos]);

  // Calcular estadísticas
  const totalInsumos = insumos.length;
  const criticos = insumos.filter((i: any) => {
    const stock = i.stock_actual || 0;
    const minimo = i.stock_minimo || 0;
    return stock > 0 && stock <= minimo;
  }).length;
  const agotados = insumos.filter((i: any) => (i.stock_actual || 0) === 0).length;
  const proximosVencer = insumos.filter((i: any) => {
    if (!i.fecha_vencimiento) return false;
    const vencimiento = new Date(i.fecha_vencimiento);
    const hoy = new Date();
    const dias = Math.floor((vencimiento.getTime() - hoy.getTime()) / (1000 * 60 * 60 * 24));
    return dias >= 0 && dias <= 30;
  }).length;

  const stats = [
    {
      title: "Total Insumos",
      value: totalInsumos,
      icon: Beaker,
      color: "text-purple-600",
      bgColor: "bg-purple-100",
    },
    {
      title: "Stock Crítico",
      value: criticos,
      icon: AlertCircle,
      color: "text-orange-600",
      bgColor: "bg-orange-100",
    },
    {
      title: "Agotados",
      value: agotados,
      icon: Package2,
      color: "text-red-600",
      bgColor: "bg-red-100",
    },
    {
      title: "Próximos a Vencer",
      value: proximosVencer,
      icon: DollarSign,
      color: "text-yellow-600",
      bgColor: "bg-yellow-100",
    },
  ];

  if (error) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800">Error al cargar insumos: {error.message}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Insumos In Vitro</h1>
          <p className="text-muted-foreground">
            Gestión de reactivos, kits de diagnóstico e insumos de laboratorio
          </p>
        </div>
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

      {/* Tabs por categoría */}
      <Tabs defaultValue="todos" className="w-full">
        <TabsList>
          <TabsTrigger value="todos">
            Todos ({totalInsumos})
          </TabsTrigger>
          {Object.keys(insumosPorCategoria).map((categoria) => (
            <TabsTrigger key={categoria} value={categoria}>
              {categoria} ({insumosPorCategoria[categoria].length})
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="todos" className="mt-6">
          <Card>
            <CardContent className="p-6">
              <GenericDataTable
                columns={columnsInsumos}
                data={insumos}
                searchColumnId="nombre"
                enableGlobalSearch={true}
                enableAutoFilters={true}
                onRowClick={(insumo) => setSelectedInsumo(insumo)}
              />
            </CardContent>
          </Card>
        </TabsContent>

        {Object.entries(insumosPorCategoria).map(([categoria, items]) => (
          <TabsContent key={categoria} value={categoria} className="mt-6">
            <Card>
              <CardContent className="p-6">
                <GenericDataTable
                  columns={columnsInsumos}
                  data={items}
                  searchColumnId="nombre"
                  enableGlobalSearch={true}
                  onRowClick={(insumo) => setSelectedInsumo(insumo)}
                />
              </CardContent>
            </Card>
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}
