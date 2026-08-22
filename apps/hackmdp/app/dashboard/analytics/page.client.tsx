'use client'

import { useState, useMemo } from 'react'
import useSWR from 'swr'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { SimpleBarChart } from "@/components/core-ui/SimpleBarChart"
import { StaggeredContainer, StaggeredItem } from "@/components/animations/StaggeredContainer"
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Users,
  Wrench,
  Package,
  Clock,
  AlertTriangle,
  Calendar,
  Download,
  RefreshCw,
  PieChart,
  LineChart,
  Activity,
  ArrowUpRight,
  ArrowDownRight,
  Target,
  Loader2,
} from 'lucide-react'
import { format, subMonths, startOfMonth, endOfMonth, subYears } from 'date-fns'
import { es } from 'date-fns/locale'
import { useFormatCurrency } from "@/lib/hooks/use-format-currency"

const fetcher = async (url: string) => {
  const res = await fetch(url)
  if (!res.ok) throw new Error('Error al cargar datos')
  return res.json()
}

type PeriodoPreset = '1m' | '3m' | '6m' | '12m' | 'ytd' | 'custom'

export default function AnalyticsPageClient() {
  const [periodo, setPeriodo] = useState<PeriodoPreset>('6m')
  const [groupBy, setGroupBy] = useState<'day' | 'week' | 'month'>('month')
  const [activeTab, setActiveTab] = useState('overview')

  // Calcular fechas según el período seleccionado
  const { desde, hasta } = useMemo(() => {
    const hoy = new Date()
    let desde: Date
    const hasta = hoy

    switch (periodo) {
      case '1m':
        desde = subMonths(hoy, 1)
        break
      case '3m':
        desde = subMonths(hoy, 3)
        break
      case '6m':
        desde = subMonths(hoy, 6)
        break
      case '12m':
        desde = subMonths(hoy, 12)
        break
      case 'ytd':
        desde = startOfMonth(new Date(hoy.getFullYear(), 0, 1))
        break
      default:
        desde = subMonths(hoy, 6)
    }

    return { desde, hasta }
  }, [periodo])

  const apiUrl = `/api/dashboard-analytics?desde=${desde.toISOString()}&hasta=${hasta.toISOString()}&groupBy=${groupBy}`
  const { data, isLoading, error, mutate } = useSWR(apiUrl, fetcher, {
    refreshInterval: 60000, // Refrescar cada minuto
  })

  const formatCurrency = useFormatCurrency()

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat('es-AR').format(num)
  }

  const formatPercent = (num: number | string) => {
    const value = typeof num === 'string' ? parseFloat(num) : num
    return `${value >= 0 ? '+' : ''}${value.toFixed(1)}%`
  }

  // Preparar datos para gráficos
  const ventasChartData = useMemo(() => {
    if (!data?.ventas?.porPeriodo) return []
    return data.ventas.porPeriodo.map((item: any) => ({
      label: item.periodo,
      value: parseFloat(item.total || 0),
      color: 'hsl(var(--primary))',
    }))
  }, [data])

  const serviciosChartData = useMemo(() => {
    if (!data?.servicios?.porPeriodo) return []
    return data.servicios.porPeriodo.map((item: any) => ({
      label: item.periodo,
      value: parseInt(item.total || 0),
      color: 'hsl(217, 91%, 60%)',
    }))
  }, [data])

  const cobranzasChartData = useMemo(() => {
    if (!data?.cobranzas?.porPeriodo) return []
    return data.cobranzas.porPeriodo.map((item: any) => ({
      label: item.periodo,
      value: parseFloat(item.total || 0),
      color: 'hsl(142, 71%, 45%)',
    }))
  }, [data])

  // Calcular totales
  const totalVentas = data?.ventas?.totales?.actual || 0
  const variacionVentas = parseFloat(data?.ventas?.totales?.variacion || 0)
  const totalCobranzas = data?.cobranzas?.porPeriodo?.reduce((sum: number, r: any) => sum + parseFloat(r.total || 0), 0) || 0
  const totalServicios = data?.servicios?.porPeriodo?.reduce((sum: number, r: any) => sum + parseInt(r.total || 0), 0) || 0

  if (error) {
    return (
      <div className="flex-1 p-6 flex items-center justify-center">
        <Card className="max-w-md">
          <CardContent className="p-6 text-center">
            <AlertTriangle className="h-12 w-12 mx-auto mb-4 text-red-500" />
            <h3 className="font-semibold text-lg mb-2">Error al cargar datos</h3>
            <p className="text-muted-foreground mb-4">{error.message}</p>
            <Button onClick={() => mutate()}>Reintentar</Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="flex-1 flex flex-col min-w-0 p-6 bg-gradient-to-br from-gray-50 to-indigo-50/20 dark:from-gray-950 dark:to-indigo-950/5">
      <StaggeredContainer id="analytics-main" className="space-y-6">
        {/* Header */}
        <StaggeredItem>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-2xl font-bold tracking-tight bg-gradient-to-r from-indigo-900 to-indigo-700 dark:from-indigo-100 dark:to-indigo-300 bg-clip-text text-transparent flex items-center gap-2">
                <BarChart3 className="h-7 w-7 text-indigo-600" />
                Analytics Dashboard
              </h1>
              <p className="text-sm text-muted-foreground mt-0.5">
                {format(desde, "d MMM yyyy", { locale: es })} - {format(hasta, "d MMM yyyy", { locale: es })}
              </p>
            </div>

            <div className="flex items-center gap-3">
              {/* Selector de período */}
              <Select value={periodo} onValueChange={(v: PeriodoPreset) => setPeriodo(v)}>
                <SelectTrigger className="w-[140px]">
                  <Calendar className="h-4 w-4 mr-2" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1m">Último mes</SelectItem>
                  <SelectItem value="3m">3 meses</SelectItem>
                  <SelectItem value="6m">6 meses</SelectItem>
                  <SelectItem value="12m">12 meses</SelectItem>
                  <SelectItem value="ytd">Año actual</SelectItem>
                </SelectContent>
              </Select>

              {/* Selector de agrupación */}
              <Select value={groupBy} onValueChange={(v: 'day' | 'week' | 'month') => setGroupBy(v)}>
                <SelectTrigger className="w-[120px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="day">Por día</SelectItem>
                  <SelectItem value="week">Por semana</SelectItem>
                  <SelectItem value="month">Por mes</SelectItem>
                </SelectContent>
              </Select>

              <Button
                variant="outline"
                size="sm"
                onClick={() => mutate()}
                disabled={isLoading}
              >
                {isLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <RefreshCw className="h-4 w-4" />
                )}
              </Button>

              <Button variant="outline" size="sm">
                <Download className="h-4 w-4 mr-2" />
                Exportar
              </Button>
            </div>
          </div>
        </StaggeredItem>

        {/* KPIs principales */}
        <StaggeredItem>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <KPICard
              title="Facturación"
              value={formatCurrency(totalVentas)}
              change={variacionVentas}
              icon={<DollarSign className="h-5 w-5" />}
              color="emerald"
              loading={isLoading}
            />
            <KPICard
              title="Cobranzas"
              value={formatCurrency(totalCobranzas)}
              subtitle={`${data?.cobranzas?.porPeriodo?.length || 0} pagos`}
              icon={<TrendingUp className="h-5 w-5" />}
              color="blue"
              loading={isLoading}
            />
            <KPICard
              title="Servicios"
              value={formatNumber(totalServicios)}
              subtitle={`${data?.kpis?.serviciosActivos || 0} activos`}
              icon={<Wrench className="h-5 w-5" />}
              color="amber"
              loading={isLoading}
            />
            <KPICard
              title="Clientes Activos"
              value={formatNumber(data?.clientes?.activos || 0)}
              subtitle={`${data?.clientes?.tasaActividad || 0}% del total`}
              icon={<Users className="h-5 w-5" />}
              color="purple"
              loading={isLoading}
            />
          </div>
        </StaggeredItem>

        {/* Tabs de contenido */}
        <StaggeredItem>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="bg-white/80 dark:bg-zinc-900/80 border">
              <TabsTrigger value="overview" className="gap-2">
                <BarChart3 className="h-4 w-4" />
                Resumen
              </TabsTrigger>
              <TabsTrigger value="ventas" className="gap-2">
                <DollarSign className="h-4 w-4" />
                Ventas
              </TabsTrigger>
              <TabsTrigger value="servicios" className="gap-2">
                <Wrench className="h-4 w-4" />
                Servicios
              </TabsTrigger>
              <TabsTrigger value="cobranzas" className="gap-2">
                <TrendingUp className="h-4 w-4" />
                Cobranzas
              </TabsTrigger>
            </TabsList>

            {/* Tab Overview */}
            <TabsContent value="overview" className="space-y-6 mt-6">
              {/* Gráficos principales */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card className="bg-white dark:bg-gray-900 shadow-sm">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-base">
                      <LineChart className="h-4 w-4 text-emerald-600" />
                      Tendencia de Ventas
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {isLoading ? (
                      <div className="h-[200px] flex items-center justify-center">
                        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                      </div>
                    ) : (
                      <SimpleBarChart
                        data={ventasChartData}
                        valueFormatter={formatCurrency}
                        height={200}
                      />
                    )}
                  </CardContent>
                </Card>

                <Card className="bg-white dark:bg-gray-900 shadow-sm">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-base">
                      <Activity className="h-4 w-4 text-blue-600" />
                      Servicios por Período
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {isLoading ? (
                      <div className="h-[200px] flex items-center justify-center">
                        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                      </div>
                    ) : (
                      <SimpleBarChart
                        data={serviciosChartData}
                        valueFormatter={(v) => `${v} servicios`}
                        height={200}
                      />
                    )}
                  </CardContent>
                </Card>
              </div>

              {/* KPIs en tiempo real */}
              <Card className="bg-white dark:bg-gray-900 shadow-sm">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Activity className="h-4 w-4 text-red-500" />
                    Métricas en Tiempo Real
                  </CardTitle>
                  <CardDescription>Actualización cada minuto</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="text-center p-4 rounded-lg bg-emerald-50 dark:bg-emerald-950/20">
                      <p className="text-2xl font-bold text-emerald-600">
                        {data?.kpis?.facturasHoy?.cantidad || 0}
                      </p>
                      <p className="text-xs text-muted-foreground">Facturas hoy</p>
                      <p className="text-sm font-medium text-emerald-700">
                        {formatCurrency(data?.kpis?.facturasHoy?.total || 0)}
                      </p>
                    </div>
                    <div className="text-center p-4 rounded-lg bg-blue-50 dark:bg-blue-950/20">
                      <p className="text-2xl font-bold text-blue-600">
                        {data?.kpis?.serviciosActivos || 0}
                      </p>
                      <p className="text-xs text-muted-foreground">Servicios activos</p>
                    </div>
                    <div className="text-center p-4 rounded-lg bg-amber-50 dark:bg-amber-950/20">
                      <p className="text-2xl font-bold text-amber-600">
                        {data?.kpis?.alertasPendientes || 0}
                      </p>
                      <p className="text-xs text-muted-foreground">Alertas pendientes</p>
                    </div>
                    <div className="text-center p-4 rounded-lg bg-purple-50 dark:bg-purple-950/20">
                      <p className="text-2xl font-bold text-purple-600">
                        {data?.kpis?.clientesNuevosMes || 0}
                      </p>
                      <p className="text-xs text-muted-foreground">Clientes nuevos (mes)</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Tablas de top */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Top Clientes */}
                <Card className="bg-white dark:bg-gray-900 shadow-sm">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-base">
                      <Target className="h-4 w-4 text-purple-600" />
                      Top 10 Clientes
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {isLoading ? (
                      <div className="space-y-2">
                        {[1, 2, 3].map(i => (
                          <div key={i} className="h-10 bg-muted animate-pulse rounded" />
                        ))}
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {data?.ventas?.topClientes?.slice(0, 5).map((cliente: any, idx: number) => (
                          <div
                            key={cliente.nombre_fantasia || idx}
                            className="flex items-center justify-between p-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800"
                          >
                            <div className="flex items-center gap-3">
                              <span className="w-6 h-6 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center text-xs font-bold text-purple-600">
                                {idx + 1}
                              </span>
                              <span className="text-sm font-medium truncate max-w-[200px]">
                                {cliente.nombre_fantasia || cliente.nombre}
                              </span>
                            </div>
                            <span className="text-sm font-semibold text-purple-600">
                              {formatCurrency(parseFloat(cliente.total || 0))}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Productos más vendidos */}
                <Card className="bg-white dark:bg-gray-900 shadow-sm">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-base">
                      <Package className="h-4 w-4 text-blue-600" />
                      Productos Más Vendidos
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {isLoading ? (
                      <div className="space-y-2">
                        {[1, 2, 3].map(i => (
                          <div key={i} className="h-10 bg-muted animate-pulse rounded" />
                        ))}
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {data?.productos?.masVendidos?.slice(0, 5).map((producto: any, idx: number) => (
                          <div
                            key={producto.id || idx}
                            className="flex items-center justify-between p-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800"
                          >
                            <div className="flex items-center gap-3">
                              <span className="w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-xs font-bold text-blue-600">
                                {idx + 1}
                              </span>
                              <div>
                                <span className="text-sm font-medium truncate max-w-[180px] block">
                                  {producto.nombre}
                                </span>
                                <span className="text-xs text-muted-foreground">{producto.codigo}</span>
                              </div>
                            </div>
                            <div className="text-right">
                              <span className="text-sm font-semibold text-blue-600 block">
                                {formatNumber(parseInt(producto.unidades || 0))} u
                              </span>
                              <span className="text-xs text-muted-foreground">
                                {formatCurrency(parseFloat(producto.total || 0))}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            {/* Tab Ventas */}
            <TabsContent value="ventas" className="space-y-6 mt-6">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <Card className="lg:col-span-2 bg-white dark:bg-gray-900 shadow-sm">
                  <CardHeader>
                    <CardTitle>Facturación por Período</CardTitle>
                    <CardDescription>
                      Total: {formatCurrency(totalVentas)}
                      {variacionVentas !== 0 && (
                        <Badge variant={variacionVentas >= 0 ? "default" : "destructive"} className="ml-2">
                          {formatPercent(variacionVentas)} vs período anterior
                        </Badge>
                      )}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <SimpleBarChart
                      data={ventasChartData}
                      valueFormatter={formatCurrency}
                      height={280}
                    />
                  </CardContent>
                </Card>

                <Card className="bg-white dark:bg-gray-900 shadow-sm">
                  <CardHeader>
                    <CardTitle className="text-base">Por Tipo de Factura</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {data?.ventas?.porTipo?.map((tipo: any) => (
                        <div key={tipo.tipo_factura} className="space-y-1">
                          <div className="flex justify-between text-sm">
                            <span>{tipo.tipo_factura || 'Sin tipo'}</span>
                            <span className="font-medium">{formatCurrency(parseFloat(tipo.total || 0))}</span>
                          </div>
                          <div className="h-2 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-emerald-500 rounded-full"
                              style={{
                                width: `${totalVentas > 0 ? (parseFloat(tipo.total || 0) / totalVentas) * 100 : 0}%`
                              }}
                            />
                          </div>
                          <p className="text-xs text-muted-foreground">{tipo.cantidad} facturas</p>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            {/* Tab Servicios */}
            <TabsContent value="servicios" className="space-y-6 mt-6">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card className="bg-white dark:bg-gray-900 shadow-sm">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/30">
                        <Clock className="h-5 w-5 text-blue-600" />
                      </div>
                      <div>
                        <p className="text-2xl font-bold">
                          {parseFloat(data?.servicios?.tiempoResolucion?.dias_promedio || 0).toFixed(1)}
                        </p>
                        <p className="text-xs text-muted-foreground">Días promedio</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <Card className="bg-white dark:bg-gray-900 shadow-sm">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-green-100 dark:bg-green-900/30">
                        <TrendingDown className="h-5 w-5 text-green-600" />
                      </div>
                      <div>
                        <p className="text-2xl font-bold">
                          {parseFloat(data?.servicios?.tiempoResolucion?.dias_minimo || 0).toFixed(0)}
                        </p>
                        <p className="text-xs text-muted-foreground">Días mínimo</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <Card className="bg-white dark:bg-gray-900 shadow-sm">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-red-100 dark:bg-red-900/30">
                        <TrendingUp className="h-5 w-5 text-red-600" />
                      </div>
                      <div>
                        <p className="text-2xl font-bold">
                          {parseFloat(data?.servicios?.tiempoResolucion?.dias_maximo || 0).toFixed(0)}
                        </p>
                        <p className="text-xs text-muted-foreground">Días máximo</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <Card className="bg-white dark:bg-gray-900 shadow-sm">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-purple-100 dark:bg-purple-900/30">
                        <Wrench className="h-5 w-5 text-purple-600" />
                      </div>
                      <div>
                        <p className="text-2xl font-bold">{totalServicios}</p>
                        <p className="text-xs text-muted-foreground">Total servicios</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card className="bg-white dark:bg-gray-900 shadow-sm">
                  <CardHeader>
                    <CardTitle className="text-base">Servicios por Período</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <SimpleBarChart
                      data={serviciosChartData}
                      valueFormatter={(v) => `${v}`}
                      height={220}
                    />
                  </CardContent>
                </Card>

                <Card className="bg-white dark:bg-gray-900 shadow-sm">
                  <CardHeader>
                    <CardTitle className="text-base">Por Estado</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {data?.servicios?.porEstado?.map((estado: any) => (
                        <div key={estado.estado} className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div className={`w-3 h-3 rounded-full ${
                              estado.estado === 'Entregado' ? 'bg-green-500' :
                              estado.estado === 'En reparación' ? 'bg-amber-500' :
                              estado.estado === 'Pendiente' ? 'bg-blue-500' :
                              'bg-gray-500'
                            }`} />
                            <span className="text-sm">{estado.estado}</span>
                          </div>
                          <Badge variant="secondary">{estado.cantidad}</Badge>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Equipos más serviciados */}
              <Card className="bg-white dark:bg-gray-900 shadow-sm">
                <CardHeader>
                  <CardTitle className="text-base">Equipos Más Serviciados</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                    {data?.servicios?.porEquipo?.slice(0, 5).map((equipo: any, idx: number) => (
                      <div key={idx} className="text-center p-3 rounded-lg bg-gray-50 dark:bg-gray-800">
                        <p className="font-medium text-sm truncate">
                          {equipo.marca} {equipo.modelo}
                        </p>
                        <p className="text-2xl font-bold text-blue-600 mt-1">{equipo.cantidad}</p>
                        <p className="text-xs text-muted-foreground">servicios</p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Tab Cobranzas */}
            <TabsContent value="cobranzas" className="space-y-6 mt-6">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card className="bg-white dark:bg-gray-900 shadow-sm">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-green-100 dark:bg-green-900/30">
                        <DollarSign className="h-5 w-5 text-green-600" />
                      </div>
                      <div>
                        <p className="text-lg font-bold">{formatCurrency(totalCobranzas)}</p>
                        <p className="text-xs text-muted-foreground">Cobrado</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <Card className="bg-white dark:bg-gray-900 shadow-sm">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-red-100 dark:bg-red-900/30">
                        <AlertTriangle className="h-5 w-5 text-red-600" />
                      </div>
                      <div>
                        <p className="text-lg font-bold">
                          {formatCurrency(parseFloat(data?.cobranzas?.deuda?.total || 0))}
                        </p>
                        <p className="text-xs text-muted-foreground">Deuda total</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <Card className="bg-white dark:bg-gray-900 shadow-sm">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-amber-100 dark:bg-amber-900/30">
                        <Clock className="h-5 w-5 text-amber-600" />
                      </div>
                      <div>
                        <p className="text-lg font-bold">
                          {formatCurrency(parseFloat(data?.cobranzas?.deuda?.deuda_vencida || 0))}
                        </p>
                        <p className="text-xs text-muted-foreground">Deuda vencida</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <Card className="bg-white dark:bg-gray-900 shadow-sm">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-purple-100 dark:bg-purple-900/30">
                        <Users className="h-5 w-5 text-purple-600" />
                      </div>
                      <div>
                        <p className="text-lg font-bold">
                          {data?.cobranzas?.deuda?.facturas_vencidas || 0}
                        </p>
                        <p className="text-xs text-muted-foreground">Facturas vencidas</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card className="bg-white dark:bg-gray-900 shadow-sm">
                  <CardHeader>
                    <CardTitle className="text-base">Cobranzas por Período</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <SimpleBarChart
                      data={cobranzasChartData}
                      valueFormatter={formatCurrency}
                      height={220}
                    />
                  </CardContent>
                </Card>

                <Card className="bg-white dark:bg-gray-900 shadow-sm">
                  <CardHeader>
                    <CardTitle className="text-base">Antigüedad de Deuda</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {data?.cobranzas?.antiguedad?.map((item: any) => (
                        <div key={item.rango} className="space-y-1">
                          <div className="flex justify-between text-sm">
                            <span className="capitalize">{item.rango}</span>
                            <span className="font-medium">{formatCurrency(parseFloat(item.monto || 0))}</span>
                          </div>
                          <div className="h-2 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full ${
                                item.rango === 'vigente' ? 'bg-green-500' :
                                item.rango === '1-30 días' ? 'bg-amber-500' :
                                item.rango === '31-60 días' ? 'bg-orange-500' :
                                'bg-red-500'
                              }`}
                              style={{
                                width: `${parseFloat(data?.cobranzas?.deuda?.total || 1) > 0
                                  ? (parseFloat(item.monto || 0) / parseFloat(data?.cobranzas?.deuda?.total || 1)) * 100
                                  : 0}%`
                              }}
                            />
                          </div>
                          <p className="text-xs text-muted-foreground">{item.facturas} facturas</p>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Métodos de pago */}
              <Card className="bg-white dark:bg-gray-900 shadow-sm">
                <CardHeader>
                  <CardTitle className="text-base">Métodos de Pago</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {data?.cobranzas?.porMetodo?.map((metodo: any) => (
                      <div key={metodo.metodo} className="text-center p-4 rounded-lg bg-gray-50 dark:bg-gray-800">
                        <p className="font-medium text-sm capitalize">{metodo.metodo}</p>
                        <p className="text-xl font-bold text-green-600 mt-1">
                          {formatCurrency(parseFloat(metodo.total || 0))}
                        </p>
                        <p className="text-xs text-muted-foreground">{metodo.cantidad} pagos</p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </StaggeredItem>
      </StaggeredContainer>
    </div>
  )
}

// Componente KPI Card
function KPICard({
  title,
  value,
  change,
  subtitle,
  icon,
  color,
  loading
}: {
  title: string
  value: string
  change?: number
  subtitle?: string
  icon: React.ReactNode
  color: 'emerald' | 'blue' | 'amber' | 'purple' | 'red'
  loading?: boolean
}) {
  const colorClasses = {
    emerald: 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600',
    blue: 'bg-blue-100 dark:bg-blue-900/30 text-blue-600',
    amber: 'bg-amber-100 dark:bg-amber-900/30 text-amber-600',
    purple: 'bg-purple-100 dark:bg-purple-900/30 text-purple-600',
    red: 'bg-red-100 dark:bg-red-900/30 text-red-600',
  }

  return (
    <Card className="bg-white dark:bg-gray-900 shadow-sm hover:shadow-md transition-shadow">
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className={`p-2 rounded-lg ${colorClasses[color]}`}>
            {icon}
          </div>
          {change !== undefined && (
            <Badge
              variant={change >= 0 ? 'default' : 'destructive'}
              className="text-xs"
            >
              {change >= 0 ? (
                <ArrowUpRight className="h-3 w-3 mr-0.5" />
              ) : (
                <ArrowDownRight className="h-3 w-3 mr-0.5" />
              )}
              {Math.abs(change).toFixed(1)}%
            </Badge>
          )}
        </div>
        <div className="mt-3">
          {loading ? (
            <div className="h-7 w-24 bg-muted animate-pulse rounded" />
          ) : (
            <p className="text-2xl font-bold">{value}</p>
          )}
          <p className="text-xs text-muted-foreground mt-0.5">{title}</p>
          {subtitle && (
            <p className="text-xs text-muted-foreground">{subtitle}</p>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
