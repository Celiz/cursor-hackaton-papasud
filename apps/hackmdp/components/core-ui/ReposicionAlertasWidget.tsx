'use client'

import { useState } from 'react'
import useSWR from 'swr'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Bell,
  RefreshCw,
  ExternalLink,
  ChevronRight,
  AlertTriangle,
  AlertOctagon,
  User,
  Package,
} from 'lucide-react'
import Link from 'next/link'

interface AlertaReposicion {
  id: string
  cliente_nombre: string
  cliente_fantasia: string | null
  producto_nombre: string
  producto_codigo: string
  dias_desde_compra: number
  frecuencia_dias: number
  ratio: number
  urgencia: 'critica' | 'alta' | 'media'
  cantidad_habitual: number | null
}

interface ReposicionStats {
  total: number
  criticas: number
  altas: number
  medias: number
  contactadosHoy: number
  clientesAfectados: number
}

const fetcher = async (url: string) => {
  const res = await fetch(url)
  const data = await res.json()
  if (!res.ok || data.error) throw new Error(data.error || 'Error')
  return data
}

interface ReposicionAlertasWidgetProps {
  limite?: number
  compact?: boolean
}

export function ReposicionAlertasWidget({
  limite = 5,
  compact = false,
}: ReposicionAlertasWidgetProps) {
  const { data: alertas, isLoading: alertasLoading, mutate } = useSWR<AlertaReposicion[]>(
    `/api/alertas-reposicion?limite=${limite}`,
    async (url: string) => {
      const res = await fetch(url)
      const data = await res.json()
      if (!res.ok || data.error) throw new Error(data.error || 'Error')
      return Array.isArray(data) ? data : []
    },
    { refreshInterval: 60000 }
  )

  const { data: stats, isLoading: statsLoading } = useSWR<ReposicionStats>(
    '/api/alertas-reposicion/stats',
    fetcher,
    { refreshInterval: 60000 }
  )

  const [refreshing, setRefreshing] = useState(false)

  const handleRefresh = async () => {
    setRefreshing(true)
    await mutate()
    setRefreshing(false)
  }

  const isLoading = alertasLoading || statsLoading

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <Skeleton className="h-5 w-48" />
          <Skeleton className="h-4 w-64 mt-1" />
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-14 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  const items = alertas || []
  const resumen = stats || { total: 0, criticas: 0, altas: 0, medias: 0, contactadosHoy: 0, clientesAfectados: 0 }
  const hasCriticas = resumen.criticas > 0

  return (
    <Card className={hasCriticas ? 'border-red-200 dark:border-red-900' : ''}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Bell className={`h-5 w-5 ${hasCriticas ? 'text-red-500' : 'text-amber-500'}`} />
            <CardTitle className="text-base">Alertas de Reposición</CardTitle>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={handleRefresh}
              disabled={refreshing}
            >
              <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
            </Button>
            <Link href="/dashboard/alertas-reposicion">
              <Button variant="ghost" size="sm" className="h-8 gap-1">
                Ver todo
                <ExternalLink className="h-3 w-3" />
              </Button>
            </Link>
          </div>
        </div>
        <CardDescription className="flex items-center gap-3 mt-1">
          {resumen.criticas > 0 && (
            <Badge variant="destructive" className="gap-1">
              {resumen.criticas} crítica{resumen.criticas !== 1 ? 's' : ''}
            </Badge>
          )}
          {resumen.altas > 0 && (
            <Badge variant="secondary" className="gap-1 bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300">
              {resumen.altas} alta{resumen.altas !== 1 ? 's' : ''}
            </Badge>
          )}
          {resumen.total === 0 && (
            <span className="text-green-600">Sin alertas</span>
          )}
          {resumen.total > 0 && (
            <span className="text-xs text-muted-foreground">
              {resumen.clientesAfectados} clientes
            </span>
          )}
        </CardDescription>
      </CardHeader>

      <CardContent>
        {items.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Package className="h-10 w-10 mx-auto mb-2 opacity-50" />
            <p>Sin alertas de reposición</p>
            <p className="text-sm">Todos los clientes están al día</p>
          </div>
        ) : (
          <ScrollArea className={compact ? 'h-[250px]' : 'h-[350px]'}>
            <div className="space-y-2">
              {items.map((alerta) => {
                const atraso = alerta.dias_desde_compra - alerta.frecuencia_dias
                return (
                  <div
                    key={alerta.id}
                    className={`
                      p-3 rounded-lg border transition-colors
                      ${alerta.urgencia === 'critica'
                        ? 'bg-red-50 border-red-200 dark:bg-red-950/30 dark:border-red-900'
                        : alerta.urgencia === 'alta'
                        ? 'bg-orange-50 border-orange-200 dark:bg-orange-950/30 dark:border-orange-900'
                        : 'bg-yellow-50 border-yellow-200 dark:bg-yellow-950/30 dark:border-yellow-900'
                      }
                    `}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <User className="h-3 w-3 text-muted-foreground shrink-0" />
                          <span className="font-medium text-sm truncate">
                            {alerta.cliente_fantasia || alerta.cliente_nombre}
                          </span>
                          {alerta.urgencia === 'critica' && (
                            <Badge variant="destructive" className="text-[10px] px-1.5 py-0">
                              CRÍTICA
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground truncate mt-0.5">
                          {alerta.producto_nombre}
                        </p>
                      </div>

                      <div className="text-right shrink-0">
                        <div className={`text-sm font-bold ${
                          alerta.urgencia === 'critica' ? 'text-red-600' :
                          alerta.urgencia === 'alta' ? 'text-orange-600' : 'text-yellow-600'
                        }`}>
                          +{atraso}d
                        </div>
                        <p className="text-[10px] text-muted-foreground">
                          ciclo {alerta.frecuencia_dias}d
                        </p>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </ScrollArea>
        )}

        {items.length > 0 && resumen.total > limite && (
          <div className="mt-3 text-center">
            <Link href="/dashboard/alertas-reposicion">
              <Button variant="outline" size="sm" className="gap-1">
                Ver {resumen.total - limite} más
                <ChevronRight className="h-4 w-4" />
              </Button>
            </Link>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
