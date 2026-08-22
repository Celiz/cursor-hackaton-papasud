"use client";

import useSWR from "swr";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AlertTriangle,
  Clock,
  Calendar,
  ChevronRight,
  ExternalLink,
  FlaskConical,
} from "lucide-react";
import Link from "next/link";
import { format } from "date-fns";
import { es } from "date-fns/locale";

/**
 * Widget de alertas de vencimiento de lotes.
 *
 * Para negocios de electromedicina/productos médicos, los lotes vencidos con
 * stock son un riesgo regulatorio (ANMAT) y de seguridad — no pueden venderse.
 * Este widget los expone de forma prominente en el dashboard.
 *
 * Jerarquía visual:
 *   1. Vencidos CON stock (los críticos — hay que sacarlos del circuito)
 *   2. Próximos a vencer en 30 días (con stock)
 *   3. Próximos a vencer en 90 días (con stock)
 *
 * Los vencidos SIN stock no se muestran en el count principal (son históricos
 * que ya no existen físicamente), pero el endpoint los devuelve aparte.
 */

interface LotesAlertas {
  vencidos: { total: number; con_stock: number; suma_stock: number };
  proximos_7d: { total: number; con_stock: number; suma_stock: number };
  proximos_30d: { total: number; con_stock: number; suma_stock: number };
  proximos_90d: { total: number; con_stock: number; suma_stock: number };
  sample_urgentes: Array<{
    id: string;
    lote: string;
    vencimiento: string;
    dias: number;
    stock: number;
    producto_codigo: string;
    producto_nombre: string;
    producto_id: string;
    marca_nombre: string | null;
  }>;
}

const fetcher = async (url: string) => {
  const res = await fetch(url);
  const data = await res.json();
  if (!res.ok || data.error) throw new Error(data.error || "Error");
  return data as LotesAlertas;
};

interface LotesVencimientosWidgetProps {
  limite?: number;
  compact?: boolean;
}

export function LotesVencimientosWidget({ limite = 8, compact }: LotesVencimientosWidgetProps) {
  const { data, error, isLoading } = useSWR<LotesAlertas>(
    "/api/inventario/lotes/alertas",
    fetcher,
    { refreshInterval: 5 * 60 * 1000 } // cada 5 min
  );

  if (isLoading) {
    return (
      <Card>
        <CardHeader className={compact ? "pb-3" : undefined}>
          <Skeleton className="h-5 w-44" />
          <Skeleton className="h-3 w-56 mt-1" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-full mt-2" />
          <Skeleton className="h-4 w-5/6 mt-2" />
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader className={compact ? "pb-3" : undefined}>
          <CardTitle className="text-sm flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-red-500" />
            Vencimientos de lotes
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-xs text-red-600">Error al cargar alertas</p>
        </CardContent>
      </Card>
    );
  }

  if (!data) return null;

  const vencidosCriticos = data.vencidos.con_stock;
  const prox7 = data.proximos_7d.con_stock;
  const prox30 = data.proximos_30d.con_stock;
  const prox90 = data.proximos_90d.con_stock;
  const hayAlertas = vencidosCriticos + prox30 > 0;

  // Items a mostrar: los urgentes del sample, limitados.
  const items = data.sample_urgentes.slice(0, limite);

  return (
    <Card className={hayAlertas ? "border-red-200 dark:border-red-900" : ""}>
      <CardHeader className={compact ? "pb-3" : undefined}>
        <div className="flex items-start justify-between gap-2">
          <div>
            <CardTitle className="text-sm flex items-center gap-2">
              <FlaskConical
                className={`h-4 w-4 ${
                  vencidosCriticos > 0 ? "text-red-600" : "text-amber-600"
                }`}
              />
              Vencimientos de lotes
            </CardTitle>
            <CardDescription className="text-xs mt-1">
              {hayAlertas
                ? "Lotes con stock que requieren atención"
                : "Sin lotes vencidos con stock — todo en orden"}
            </CardDescription>
          </div>
          <Link href="/dashboard/inventario/lotes?por_vencer=90">
            <Button type="outline" size="tiny" className="gap-1">
              Ver todos <ChevronRight className="h-3 w-3" />
            </Button>
          </Link>
        </div>

        {/* Resumen en chips — siempre visible incluso sin items. Colores
            dependen del bucket: rojo para vencidos, amber 7d, yellow 30d, etc */}
        <div className="flex flex-wrap gap-1.5 mt-2">
          {vencidosCriticos > 0 && (
            <Badge variant="outline" className="bg-red-100 text-red-800 border-red-200 gap-1 text-[10px]">
              <AlertTriangle className="h-2.5 w-2.5" />
              {vencidosCriticos} vencido{vencidosCriticos !== 1 ? "s" : ""} con stock
            </Badge>
          )}
          {prox7 > 0 && (
            <Badge variant="outline" className="bg-orange-100 text-orange-800 border-orange-200 text-[10px]">
              {prox7} vence{prox7 !== 1 ? "n" : ""} en 7 días
            </Badge>
          )}
          {prox30 > prox7 && (
            <Badge variant="outline" className="bg-amber-100 text-amber-800 border-amber-200 text-[10px]">
              {prox30 - prox7} en 8–30 días
            </Badge>
          )}
          {prox90 > prox30 && (
            <Badge variant="outline" className="bg-yellow-100 text-yellow-800 border-yellow-200 text-[10px]">
              {prox90 - prox30} en 31–90 días
            </Badge>
          )}
          {data.vencidos.total > data.vencidos.con_stock && (
            <Badge variant="outline" className="bg-gray-100 text-gray-600 border-gray-200 text-[10px]" title="Históricos sin stock">
              {data.vencidos.total - data.vencidos.con_stock} histórico{data.vencidos.total - data.vencidos.con_stock !== 1 ? "s" : ""}
            </Badge>
          )}
        </div>
      </CardHeader>

      {items.length > 0 && (
        <CardContent className="pt-0">
          <ScrollArea className={compact ? "max-h-[240px]" : "max-h-[320px]"}>
            <div className="space-y-1.5">
              {items.map((item) => {
                const vencido = item.dias < 0;
                const urgente = !vencido && item.dias <= 7;
                return (
                  <Link
                    key={item.id}
                    href={`/dashboard/productos?id=${item.producto_id}`}
                    className={`flex items-center justify-between gap-2 p-2 rounded-md border transition hover:bg-muted/40 ${
                      vencido
                        ? "border-red-200 bg-red-50/60"
                        : urgente
                        ? "border-orange-200 bg-orange-50/60"
                        : "border-gray-200 bg-white dark:bg-gray-900"
                    }`}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-medium truncate">
                          {item.producto_nombre}
                        </span>
                        {item.producto_codigo && (
                          <span className="text-[10px] text-muted-foreground font-mono">
                            {item.producto_codigo}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 mt-0.5 text-[11px]">
                        <span className="font-mono text-muted-foreground">
                          Lote: {item.lote}
                        </span>
                        <span className="text-muted-foreground">
                          Stock: {item.stock}
                        </span>
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <div className="flex items-center gap-1 justify-end">
                        {vencido ? (
                          <AlertTriangle className="h-3 w-3 text-red-600" />
                        ) : (
                          <Clock className="h-3 w-3 text-amber-600" />
                        )}
                        <span
                          className={`text-[11px] font-medium ${
                            vencido ? "text-red-700" : urgente ? "text-orange-700" : "text-amber-700"
                          }`}
                        >
                          {vencido
                            ? `${Math.abs(item.dias)}d vencido`
                            : item.dias === 0
                            ? "Hoy"
                            : `${item.dias}d`}
                        </span>
                      </div>
                      <p className="text-[10px] text-muted-foreground flex items-center gap-0.5 justify-end mt-0.5">
                        <Calendar className="h-2.5 w-2.5" />
                        {format(new Date(item.vencimiento), "dd/MM/yy", { locale: es })}
                      </p>
                    </div>
                  </Link>
                );
              })}
            </div>
          </ScrollArea>
        </CardContent>
      )}
    </Card>
  );
}
