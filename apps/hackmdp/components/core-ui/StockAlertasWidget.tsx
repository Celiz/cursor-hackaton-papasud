'use client'

import { useState } from 'react'
import useSWR from 'swr'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Skeleton } from '@/components/ui/skeleton'
import {
  AlertTriangle,
  Package,
  Warehouse,
  ChevronRight,
  RefreshCw,
  ExternalLink,
} from 'lucide-react'
import Link from 'next/link'

interface StockAlerta {
  id: string
  codigo: string
  nombre: string
  categoria: string | null
  deposito_id: string
  deposito: string
  deposito_codigo: string
  cantidad_disponible: number
  punto_reorden: number
  stock_minimo: number | null
  cantidad_reordenar: number
  nivel_alerta: 'critico' | 'bajo' | 'normal'
  porcentaje_stock: number | null
}

interface AlertasResponse {
  alertas: StockAlerta[]
  resumen: {
    criticos: number
    bajos: number
    total_alertas: number
  }
}

const fetcher = async (url: string) => {
  const res = await fetch(url)
  const data = await res.json()
  if (!res.ok || data.error) throw new Error(data.error || 'Error')
  return data
}

interface StockAlertasWidgetProps {
  limite?: number
  showHeader?: boolean
  compact?: boolean
}

export function StockAlertasWidget({
  limite = 10,
  showHeader = true,
  compact = false,
}: StockAlertasWidgetProps) {
  const { data, isLoading, mutate } = useSWR<AlertasResponse>(
    `/api/inventario/alertas-stock?limite=${limite}`,
    fetcher,
    { refreshInterval: 60000 } // Refresh every minute
  )

  const [refreshing, setRefreshing] = useState(false)

  const handleRefresh = async () => {
    setRefreshing(true)
    await mutate()
    setRefreshing(false)
  }

  if (isLoading) {
    return (
      <Card>
        {showHeader && (
          <CardHeader className="pb-3">
            <Skeleton className="h-5 w-40" />
            <Skeleton className="h-4 w-60 mt-1" />
          </CardHeader>
        )}
        <CardContent className={showHeader ? '' : 'pt-6'}>
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  const alertas = data?.alertas || []
  const resumen = data?.resumen || { criticos: 0, bajos: 0, total_alertas: 0 }

  return (
    <Card className={resumen.criticos > 0 ? 'border-red-200 dark:border-red-900' : ''}>
      {showHeader && (
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertTriangle
                className={`h-5 w-5 ${
                  resumen.criticos > 0 ? 'text-red-500' : 'text-amber-500'
                }`}
              />
              <CardTitle className="text-base">Alertas de Stock</CardTitle>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={handleRefresh}
                disabled={refreshing}
              >
                <RefreshCw
                  className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`}
                />
              </Button>
              <Link href="/dashboard/inventario/stock">
                <Button variant="ghost" size="sm" className="h-8 gap-1">
                  Ver todo
                  <ExternalLink className="h-3 w-3" />
                </Button>
              </Link>
            </div>
          </div>
          <CardDescription className="flex items-center gap-3 mt-1">
            {resumen.criticos > 0 && (
              <Badge variant="destructive" className="gap-1">
                {resumen.criticos} crítico{resumen.criticos !== 1 ? 's' : ''}
              </Badge>
            )}
            {resumen.bajos > 0 && (
              <Badge variant="secondary" className="gap-1 bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300">
                {resumen.bajos} bajo{resumen.bajos !== 1 ? 's' : ''}
              </Badge>
            )}
            {resumen.total_alertas === 0 && (
              <span className="text-green-600">Sin alertas</span>
            )}
          </CardDescription>
        </CardHeader>
      )}

      <CardContent className={showHeader ? '' : 'pt-6'}>
        {alertas.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Package className="h-10 w-10 mx-auto mb-2 opacity-50" />
            <p>No hay alertas de stock</p>
            <p className="text-sm">Todos los productos están en niveles normales</p>
          </div>
        ) : (
          <ScrollArea className={compact ? 'h-[250px]' : 'h-[400px]'}>
            <div className="space-y-2">
              {alertas.map((alerta) => (
                <div
                  key={`${alerta.id}-${alerta.deposito_id}`}
                  className={`
                    p-3 rounded-lg border transition-colors
                    ${
                      alerta.nivel_alerta === 'critico'
                        ? 'bg-red-50 border-red-200 dark:bg-red-950/30 dark:border-red-900'
                        : 'bg-amber-50 border-amber-200 dark:bg-amber-950/30 dark:border-amber-900'
                    }
                  `}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs text-muted-foreground">
                          {alerta.codigo}
                        </span>
                        {alerta.nivel_alerta === 'critico' && (
                          <Badge variant="destructive" className="text-[10px] px-1.5 py-0">
                            CRÍTICO
                          </Badge>
                        )}
                      </div>
                      <p className="font-medium text-sm truncate">{alerta.nombre}</p>
                      <div className="flex items-center gap-1 mt-1 text-xs text-muted-foreground">
                        <Warehouse className="h-3 w-3" />
                        <span>{alerta.deposito}</span>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <div className="flex items-baseline gap-1">
                        <span
                          className={`text-lg font-bold ${
                            alerta.nivel_alerta === 'critico'
                              ? 'text-red-600'
                              : 'text-amber-600'
                          }`}
                        >
                          {alerta.cantidad_disponible}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          / {alerta.punto_reorden}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Pedir: <span className="font-medium">{alerta.cantidad_reordenar}</span>
                      </p>
                    </div>
                  </div>

                  {/* Progress bar */}
                  <div className="mt-2">
                    <div className="h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                      <div
                        className={`h-full transition-all ${
                          alerta.nivel_alerta === 'critico'
                            ? 'bg-red-500'
                            : 'bg-amber-500'
                        }`}
                        style={{
                          width: `${Math.min(alerta.porcentaje_stock || 0, 100)}%`,
                        }}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        )}

        {alertas.length > 0 && resumen.total_alertas > limite && (
          <div className="mt-3 text-center">
            <Link href="/dashboard/inventario/stock">
              <Button variant="outline" size="sm" className="gap-1">
                Ver {resumen.total_alertas - limite} más
                <ChevronRight className="h-4 w-4" />
              </Button>
            </Link>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
