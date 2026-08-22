'use client'

import { useState } from 'react'
import Link from 'next/link'
import useSWR from 'swr'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { DashboardShell } from '../shared/dashboard-shell'
import { colorDeEstado } from '@/components/campo/lotes-estado'
import { AvisosCampo } from '@/components/campo/AvisosCampo'
import {
  LayoutDashboard, Sprout, Warehouse, Mic, AlertTriangle, ArrowRight,
  Droplet, Snowflake, Ruler, Scale,
} from 'lucide-react'
import type { DashboardTabConfig } from '../types'

const fetcher = async (url: string) => {
  const res = await fetch(url)
  const data = await res.json()
  if (!res.ok) throw new Error(data.error ?? 'Error al cargar')
  return data
}

const tabs: DashboardTabConfig[] = [
  {
    id: 'campana',
    label: 'Campaña',
    icon: LayoutDashboard,
    activeColorClass:
      'data-[state=active]:bg-emerald-100 dark:data-[state=active]:bg-emerald-900/30 data-[state=active]:text-emerald-700 dark:data-[state=active]:text-emerald-300',
  },
  {
    id: 'campo',
    label: 'Campo',
    icon: Sprout,
    activeColorClass:
      'data-[state=active]:bg-lime-100 dark:data-[state=active]:bg-lime-900/30 data-[state=active]:text-lime-700 dark:data-[state=active]:text-lime-300',
  },
  {
    id: 'stock',
    label: 'Stock',
    icon: Warehouse,
    activeColorClass:
      'data-[state=active]:bg-sky-100 dark:data-[state=active]:bg-sky-900/30 data-[state=active]:text-sky-700 dark:data-[state=active]:text-sky-300',
  },
]

function Cifra({
  titulo, valor, unidad, detalle, icono: Icono,
}: {
  titulo: string
  valor: string | number
  unidad?: string
  detalle?: string
  icono?: React.ComponentType<{ className?: string }>
}) {
  return (
    <Card>
      <CardContent className="p-3.5">
        <div className="flex items-start justify-between gap-2">
          <p className="text-[11px] uppercase tracking-wide text-muted-foreground">{titulo}</p>
          {Icono && <Icono className="h-4 w-4 text-muted-foreground shrink-0" />}
        </div>
        <p className="text-2xl font-semibold tabular-nums mt-1">
          {valor}
          {unidad && <span className="text-sm font-normal text-muted-foreground ml-1">{unidad}</span>}
        </p>
        {detalle && <p className="text-[11px] text-muted-foreground mt-0.5">{detalle}</p>}
      </CardContent>
    </Card>
  )
}

/** Barras en CSS: el histórico son 12 valores, no hace falta traer una librería. */
function BarrasRinde({ datos }: { datos: Array<{ anio: number; rinde: string | null }> }) {
  const valores = datos.map((d) => Number(d.rinde ?? 0))
  const max = Math.max(...valores, 1)
  return (
    <div className="flex items-end gap-1.5 h-28">
      {datos.map((d) => {
        const v = Number(d.rinde ?? 0)
        const alto = Math.max(4, (v / max) * 100)
        return (
          <div key={d.anio} className="flex-1 flex flex-col items-center gap-1 min-w-0">
            <span className="text-[10px] tabular-nums text-muted-foreground">{v.toFixed(0)}</span>
            <div
              className="w-full rounded-t bg-emerald-500/80 dark:bg-emerald-500/60"
              style={{ height: `${alto}%` }}
              title={`${d.anio}: ${v} t/ha`}
            />
            <span className="text-[10px] tabular-nums text-muted-foreground">
              {String(d.anio).slice(2)}
            </span>
          </div>
        )
      })}
    </div>
  )
}

export default function AgroDashboard() {
  const [tab, setTab] = useState('campana')
  const { data } = useSWR('/api/dashboard/agro', fetcher)

  const c = data?.campana
  const lotes = data?.lotes ?? []
  const totalLotes = lotes.reduce((s: number, l: { n: number }) => s + l.n, 0)
  const sinActividad = lotes.reduce((s: number, l: { sin_actividad: number }) => s + l.sin_actividad, 0)
  const stockTotal = (data?.stock ?? []).reduce(
    (s: number, u: { toneladas: string }) => s + Number(u.toneladas || 0), 0
  )

  return (
    <DashboardShell
      title="Papasud"
      tabs={tabs}
      activeTab={tab}
      onTabChange={setTab}
      themeGradient="from-gray-50 to-emerald-50/20 dark:from-gray-950 dark:to-emerald-950/5"
      titleGradient="from-emerald-900 to-emerald-700 dark:from-emerald-100 dark:to-emerald-300"
    >
      {tab === 'campana' && (
        <div className="space-y-3">
          <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
            <Cifra titulo="Campaña" valor={c?.nombre ?? '—'} detalle={c ? `${c.anio}` : undefined} />
            <Cifra titulo="Superficie" valor={c ? Math.round(c.superficie_ha) : '—'} unidad="ha" icono={Ruler} />
            <Cifra
              titulo={c?.produccion_real_tn ? 'Ingresado' : 'Producción'}
              valor={
                c?.produccion_real_tn
                  ? Math.round(c.produccion_real_tn).toLocaleString('es-AR')
                  : c ? Math.round(c.produccion_tn).toLocaleString('es-AR') : '—'
              }
              unidad="t"
              detalle={
                c?.produccion_real_tn
                  ? `de ${Math.round(c.produccion_tn).toLocaleString('es-AR')} t estimadas`
                  : undefined
              }
              icono={Scale}
            />
            <Cifra
              titulo="Rinde estimado"
              valor={c?.rinde ?? '—'}
              unidad="t/ha"
              detalle={c?.estimado === false ? 'campaña en curso' : undefined}
              icono={Sprout}
            />
          </div>

          <div className="grid gap-3 lg:grid-cols-[2fr_1fr]">
            <Card>
              <CardContent className="p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium">Rinde por campaña</p>
                  <span className="text-[11px] text-muted-foreground">t/ha</span>
                </div>
                {data?.historia && <BarrasRinde datos={data.historia} />}
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4 space-y-2.5">
                <p className="text-sm font-medium">Clima del ciclo</p>
                <div className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-1.5 text-muted-foreground">
                    <Droplet className="h-3.5 w-3.5" />Lluvia
                  </span>
                  <span className="tabular-nums">{c ? `${Math.round(c.lluvia_mm)} mm` : '—'}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-1.5 text-muted-foreground">
                    <Snowflake className="h-3.5 w-3.5" />Días con helada
                  </span>
                  <span className="tabular-nums">{c?.dias_heladas ?? '—'}</span>
                </div>
                <div className="pt-2 border-t space-y-1.5">
                  <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
                    Variedades más sembradas
                  </p>
                  {(data?.variedades ?? []).map((v: { nombre: string; siembras: number; rinde: string }) => (
                    <div key={v.nombre} className="flex items-center justify-between text-sm">
                      <span>{v.nombre}</span>
                      <span className="text-muted-foreground tabular-nums text-xs">
                        {v.siembras} · {v.rinde} t/ha
                      </span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {tab === 'campo' && (
        <div className="space-y-3">
          <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
            <Cifra titulo="Lotes" valor={totalLotes} detalle={`${lotes.reduce((s: number, l: { ha: string }) => s + Number(l.ha || 0), 0)} ha`} />
            {lotes.slice(0, 3).map((l: { estado: string; n: number; ha: string }) => (
              <Cifra key={l.estado} titulo={l.estado.replace('_', ' ')} valor={l.n} detalle={`${l.ha} ha`} />
            ))}
          </div>

          {/* Lo que detectaron las fotos y nadie fue a mirar todavía */}
          <AvisosCampo compacto />

          {sinActividad > 0 && (
            <Card className="border-amber-300 dark:border-amber-800">
              <CardContent className="p-3.5 flex items-center gap-3">
                <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0" />
                <p className="text-sm flex-1">
                  <strong>{sinActividad}</strong>{' '}
                  {sinActividad === 1 ? 'lote no tiene' : 'lotes no tienen'} una orden de trabajo
                  hace más de 21 días.
                </p>
                <Link
                  href="/dashboard/campo/mapa"
                  className="text-sm text-amber-700 dark:text-amber-400 flex items-center gap-1 shrink-0"
                >
                  Ver en el mapa <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardContent className="p-0">
              <div className="flex items-center justify-between p-3.5 pb-2">
                <p className="text-sm font-medium">Últimas órdenes de trabajo</p>
                <Link href="/dashboard/campo/ordenes" className="text-xs text-muted-foreground flex items-center gap-1">
                  Todas <ArrowRight className="h-3 w-3" />
                </Link>
              </div>
              <div className="divide-y">
                {(data?.ordenes ?? []).map((o: {
                  numero: number; tarea: string; fecha: string; estado: string
                  origen: string; lote: string | null; responsable_nombre: string | null
                }) => (
                  <div key={o.numero} className="px-3.5 py-2 flex items-center gap-3 text-sm">
                    <span className="text-xs text-muted-foreground tabular-nums w-10">#{o.numero}</span>
                    <span className="text-xs text-muted-foreground tabular-nums w-20">
                      {new Date(o.fecha).toLocaleDateString('es-AR')}
                    </span>
                    <Badge variant="outline" className="shrink-0">{o.lote ?? '—'}</Badge>
                    <span className="flex-1 min-w-0 truncate">{o.tarea}</span>
                    {o.origen === 'voz' && (
                      <Badge className="gap-1 shrink-0"><Mic className="h-3 w-3" />voz</Badge>
                    )}
                    <Badge variant="secondary" className="shrink-0">{o.estado}</Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {tab === 'stock' && (
        <div className="space-y-3">
          <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
            <Cifra titulo="Stock total" valor={stockTotal.toFixed(1)} unidad="t" icono={Warehouse} />
            {(data?.stock ?? []).slice(0, 3).map((u: { codigo: string; nombre: string; toneladas: string; productos: number }) => (
              <Cifra key={u.codigo} titulo={u.nombre} valor={u.toneladas} unidad="t" detalle={`${u.productos} productos`} />
            ))}
          </div>

          {data?.conteo && (
            <Card className={data.conteo.items_con_diferencia > 0 ? 'border-amber-300 dark:border-amber-800' : undefined}>
              <CardContent className="p-3.5 space-y-1">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-medium">
                    {data.conteo.nombre}{' '}
                    <span className="text-muted-foreground font-normal">· {data.conteo.deposito}</span>
                  </p>
                  <Badge variant="outline">{data.conteo.estado}</Badge>
                </div>
                <p className="text-sm text-muted-foreground">
                  {data.conteo.items_contados ?? data.conteo.total_items} ítems contados
                  {data.conteo.items_con_diferencia > 0 && (
                    <>
                      {' · '}
                      <span className="text-amber-700 dark:text-amber-400 font-medium">
                        {data.conteo.items_con_diferencia} con diferencia entre lo declarado y lo contado
                      </span>
                    </>
                  )}
                </p>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardContent className="p-0">
              <div className="p-3.5 pb-2 flex items-center justify-between">
                <p className="text-sm font-medium">Las cuatro ubicaciones</p>
                <Link href="/dashboard/inventario" className="text-xs text-muted-foreground flex items-center gap-1">
                  Inventario <ArrowRight className="h-3 w-3" />
                </Link>
              </div>
              <div className="divide-y">
                {(data?.stock ?? []).map((u: { codigo: string; nombre: string; tipo: string; toneladas: string; productos: number }) => (
                  <div key={u.codigo} className="px-3.5 py-2 flex items-center gap-3 text-sm">
                    <Badge variant="outline" className="shrink-0 w-24 justify-center">{u.codigo}</Badge>
                    <span className="flex-1 min-w-0 truncate">{u.nombre}</span>
                    <span className="text-xs text-muted-foreground">{u.tipo}</span>
                    <span className="tabular-nums w-20 text-right">{u.toneladas} t</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </DashboardShell>
  )
}
