"use client";

import useSWR from "swr";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Wallet,
  AlertTriangle,
  Clock,
  Calendar,
  ChevronRight,
  Building2,
} from "lucide-react";
import Link from "next/link";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { formatCurrency } from "@/lib/branding";

/**
 * Widget de alertas de cheques en cartera.
 *
 * Mostrado en el dashboard principal, recuerda los cheques pendientes de
 * cobro. Destaca especialmente los "vencidos hoy" — aquellos cuya fecha de
 * pago ya pasó pero que siguen marcados `en_cartera` (plata que el usuario
 * se está olvidando de cobrar).
 */

interface ChequesAlertas {
  total_cartera: number;
  monto_cartera: number;
  vencidos_hoy: number;
  monto_vencidos_hoy: number;
  proximos_7d: number;
  monto_proximos_7d: number;
  proximos_30d: number;
  monto_proximos_30d: number;
  en_cobro_bancario: number;
  sample_proximos: Array<{
    id: string;
    numero: string;
    monto: number | string;
    banco: string | null;
    nombre_librador: string | null;
    fecha_pago: string;
    dias: number;
    cliente_id: string | null;
    cliente_nombre: string | null;
  }>;
}

const fetcher = async (url: string) => {
  const res = await fetch(url);
  const data = await res.json();
  if (!res.ok || data.error) throw new Error(data.error || "Error");
  return data as ChequesAlertas;
};

interface ChequesAlertasWidgetProps {
  limite?: number;
  compact?: boolean;
}

export function ChequesAlertasWidget({ limite = 8, compact }: ChequesAlertasWidgetProps) {
  const { data, error, isLoading } = useSWR<ChequesAlertas>(
    "/api/cheques/alertas",
    fetcher,
    { refreshInterval: 5 * 60 * 1000 }
  );

  if (isLoading) {
    return (
      <Card>
        <CardHeader className={compact ? "pb-3" : undefined}>
          <Skeleton className="h-5 w-40" />
          <Skeleton className="h-3 w-56 mt-1" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-full mt-2" />
        </CardContent>
      </Card>
    );
  }

  if (error || !data) {
    return (
      <Card>
        <CardHeader className={compact ? "pb-3" : undefined}>
          <CardTitle className="text-sm flex items-center gap-2">
            <Wallet className="h-4 w-4 text-muted-foreground" />
            Cheques en cartera
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-xs text-red-600">Error al cargar alertas</p>
        </CardContent>
      </Card>
    );
  }

  const hayVencidos = data.vencidos_hoy > 0;
  const items = data.sample_proximos.slice(0, limite);

  return (
    <Card className={hayVencidos ? "border-red-200 dark:border-red-900" : ""}>
      <CardHeader className={compact ? "pb-3" : undefined}>
        <div className="flex items-start justify-between gap-2">
          <div>
            <CardTitle className="text-sm flex items-center gap-2">
              <Wallet className={`h-4 w-4 ${hayVencidos ? "text-red-600" : "text-amber-600"}`} />
              Cheques en cartera
            </CardTitle>
            <CardDescription className="text-xs mt-1">
              {data.total_cartera === 0
                ? "Sin cheques pendientes"
                : `${data.total_cartera} cheques por ${formatCurrency(data.monto_cartera)}`}
            </CardDescription>
          </div>
          <Link href="/dashboard/cheques?estado=en_cartera">
            <Button type="outline" size="tiny" className="gap-1">
              Ver todos <ChevronRight className="h-3 w-3" />
            </Button>
          </Link>
        </div>

        {/* Resumen en chips. El de "vencidos hoy" es el más crítico:
            cheques cuya fecha_pago ya pasó pero nadie los marcó como cobrados.
            En teoría son plata en el banco que no se registró. */}
        <div className="flex flex-wrap gap-1.5 mt-2">
          {data.vencidos_hoy > 0 && (
            <Badge
              variant="outline"
              className="bg-red-100 text-red-800 border-red-200 gap-1 text-[10px]"
              title={`${formatCurrency(data.monto_vencidos_hoy)} pendiente de cobrar`}
            >
              <AlertTriangle className="h-2.5 w-2.5" />
              {data.vencidos_hoy} venció{data.vencidos_hoy !== 1 ? "eron" : ""} sin cobrar
            </Badge>
          )}
          {data.proximos_7d > 0 && (
            <Badge
              variant="outline"
              className="bg-orange-100 text-orange-800 border-orange-200 text-[10px]"
              title={formatCurrency(data.monto_proximos_7d)}
            >
              {data.proximos_7d} esta semana
            </Badge>
          )}
          {data.proximos_30d > data.proximos_7d && (
            <Badge
              variant="outline"
              className="bg-amber-100 text-amber-800 border-amber-200 text-[10px]"
            >
              {data.proximos_30d - data.proximos_7d} en 30 días
            </Badge>
          )}
          {data.en_cobro_bancario > 0 && (
            <Badge variant="outline" className="bg-blue-100 text-blue-800 border-blue-200 text-[10px]">
              {data.en_cobro_bancario} depositados
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
                const hoy = item.dias === 0;
                const urgente = !vencido && item.dias <= 7;
                return (
                  <Link
                    key={item.id}
                    href={`/dashboard/cheques?id=${item.id}`}
                    className={`flex items-center justify-between gap-2 p-2 rounded-md border transition hover:bg-muted/40 ${
                      vencido
                        ? "border-red-200 bg-red-50/60"
                        : hoy
                        ? "border-orange-300 bg-orange-50/80"
                        : urgente
                        ? "border-orange-200 bg-orange-50/60"
                        : "border-gray-200 bg-white dark:bg-gray-900"
                    }`}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-mono font-semibold">
                          #{item.numero}
                        </span>
                        <span className="text-xs font-semibold tabular-nums text-muted-foreground">
                          {formatCurrency(Number(item.monto))}
                        </span>
                      </div>
                      <div className="flex items-center gap-1 mt-0.5 text-[11px] text-muted-foreground">
                        {item.banco && <span className="truncate">{item.banco}</span>}
                        {item.nombre_librador && item.banco && <span>·</span>}
                        {item.nombre_librador && (
                          <span className="truncate">{item.nombre_librador}</span>
                        )}
                      </div>
                      {item.cliente_nombre && (
                        <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                          <Building2 className="h-2.5 w-2.5" />
                          <span className="truncate">{item.cliente_nombre}</span>
                        </div>
                      )}
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
                            vencido
                              ? "text-red-700"
                              : hoy
                              ? "text-orange-700"
                              : urgente
                              ? "text-orange-700"
                              : "text-amber-700"
                          }`}
                        >
                          {vencido
                            ? `${Math.abs(item.dias)}d atrás`
                            : hoy
                            ? "Hoy"
                            : `${item.dias}d`}
                        </span>
                      </div>
                      <p className="text-[10px] text-muted-foreground flex items-center gap-0.5 justify-end mt-0.5">
                        <Calendar className="h-2.5 w-2.5" />
                        {format(new Date(item.fecha_pago), "dd/MM/yy", { locale: es })}
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
