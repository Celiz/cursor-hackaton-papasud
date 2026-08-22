'use client'

import { useEffect, useMemo, useState } from 'react'
import useSWR from 'swr'
import Link from 'next/link'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { PlanoPivote, type LotePivote } from '@/components/campo/PlanoPivote'
import { useGps } from '@/lib/hooks/use-gps'
import { ubicarEnCampo, ubicarEnPivote, type Pivote } from '@/lib/campo/pivote'
import {
  Satellite, MapPin, Crosshair, AlertTriangle, Loader2, ClipboardList, Ruler,
} from 'lucide-react'

const fetcher = async (url: string) => {
  const res = await fetch(url)
  const d = await res.json()
  if (!res.ok) throw new Error(d.error ?? 'Error al cargar')
  return d
}

interface PivoteApi extends Pivote {
  id: string
  cuadrante_base: number
  estimado: boolean
  notas: string | null
}

/**
 * En modo demo el pivote se re-centra donde está parado el usuario y se achica
 * a pocos metros de radio. Así se puede mostrar el seguimiento caminando por
 * cualquier lado, no solo en Santa Ana — y se ve cambiar de lote con dar unos
 * pasos, que es justamente lo que hay que demostrar.
 */
const RADIO_DEMO_M = 40

export default function PivotesPageClient() {
  const { data } = useSWR<{ pivotes: PivoteApi[]; lotes: LotePivote[] }>(
    '/api/campo/pivotes', fetcher
  )
  const gps = useGps()
  const [demo, setDemo] = useState(false)
  const [ancla, setAncla] = useState<{ lat: number; lng: number } | null>(null)
  const [seleccionado, setSeleccionado] = useState<string | null>(null)
  const [pivoteVisible, setPivoteVisible] = useState<string | null>(null)

  const pivotes = data?.pivotes ?? []
  const lotes = data?.lotes ?? []

  // En modo demo el ancla es la primera lectura: el centro del pivote pasa a
  // ser donde arrancó el usuario.
  useEffect(() => {
    if (demo && gps.lectura && !ancla) {
      setAncla({ lat: gps.lectura.latitud, lng: gps.lectura.longitud })
    }
    if (!demo) setAncla(null)
  }, [demo, gps.lectura, ancla])

  const pivotesEfectivos = useMemo<Array<PivoteApi>>(() => {
    if (!demo || !ancla) return pivotes
    // Un solo pivote, centrado en el usuario y chiquito.
    const base = pivotes[0]
    return [{
      ...(base ?? { id: 'demo', nombre: 'A', cuadrante_base: 1, estimado: true, notas: null }),
      nombre: base?.nombre ?? 'A',
      latitud: ancla.lat,
      longitud: ancla.lng,
      radio_m: RADIO_DEMO_M,
      cuadrante_base: base?.cuadrante_base ?? 1,
    } as PivoteApi]
  }, [demo, ancla, pivotes])

  const ubicacion = useMemo(() => {
    if (!gps.lectura || pivotesEfectivos.length === 0) return null
    return ubicarEnCampo(gps.lectura.latitud, gps.lectura.longitud, pivotesEfectivos)
  }, [gps.lectura, pivotesEfectivos])

  // El pivote que se muestra: el que ubicó el GPS, o el elegido a mano.
  const pivoteActual = pivoteVisible ?? ubicacion?.pivote ?? pivotes[0]?.nombre ?? null
  const lotesDelPivote = useMemo(
    () => lotes.filter((l) => l.pivote === pivoteActual),
    [lotes, pivoteActual]
  )

  // El lote en el que está parado: mismo cuadrante y el anillo que contiene su radio.
  const loteActual = useMemo(() => {
    if (!ubicacion) return null
    return (
      lotesDelPivote.find(
        (l) =>
          l.cuadrante === ubicacion.cuadrante &&
          ubicacion.radio * 100 >= Number(l.anillo_desde ?? 0) &&
          ubicacion.radio * 100 <= Number(l.anillo_hasta ?? 100)
      ) ?? null
    )
  }, [ubicacion, lotesDelPivote])

  useEffect(() => {
    if (loteActual) setSeleccionado(loteActual.id)
  }, [loteActual])

  const detalle = lotes.find((l) => l.id === seleccionado) ?? null
  const pivoteObj = pivotesEfectivos.find((p) => p.nombre === pivoteActual)
  const enEstePivote = ubicacion?.pivote === pivoteActual

  return (
    <div className="p-4 md:p-6 space-y-4 max-w-5xl mx-auto">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Pivotes</h1>
          <p className="text-sm text-muted-foreground">
            El campo como se ve en el plano. Prendé el GPS y el punto sos vos.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <Switch id="demo" checked={demo} onCheckedChange={(v) => { setDemo(v); setAncla(null) }} />
            <Label htmlFor="demo" className="text-xs cursor-pointer">Modo demo</Label>
          </div>
          <Button
            size="sm"
            variant={gps.estado === 'siguiendo' ? 'destructive' : 'default'}
            onClick={gps.estado === 'siguiendo' ? gps.detener : gps.arrancar}
          >
            {gps.estado === 'pidiendo-permiso' || gps.estado === 'buscando' ? (
              <><Loader2 className="h-4 w-4 mr-1.5 animate-spin" />Buscando señal…</>
            ) : gps.estado === 'siguiendo' ? (
              <><Satellite className="h-4 w-4 mr-1.5" />Detener GPS</>
            ) : (
              <><Crosshair className="h-4 w-4 mr-1.5" />Prender GPS</>
            )}
          </Button>
        </div>
      </div>

      {!gps.seguro && (
        <Card className="border-amber-300 dark:border-amber-800">
          <CardContent className="p-3.5 flex items-start gap-2.5 text-sm">
            <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
            <p>
              Estás entrando por <code className="text-xs">http://</code>. El navegador
              no entrega ubicación fuera de un contexto seguro: hace falta{' '}
              <strong>https</strong> o <code className="text-xs">localhost</code>. Desde el
              celular, abrilo por el túnel.
            </p>
          </CardContent>
        </Card>
      )}

      {gps.error && (
        <Card className="border-red-300 dark:border-red-900">
          <CardContent className="p-3.5 flex items-start gap-2.5 text-sm">
            <AlertTriangle className="h-4 w-4 text-red-600 shrink-0 mt-0.5" />
            <p>{gps.error}</p>
          </CardContent>
        </Card>
      )}

      {demo && (
        <Card className="border-sky-300 dark:border-sky-900">
          <CardContent className="p-3 text-xs text-muted-foreground">
            <strong className="text-foreground">Modo demo:</strong> el pivote se centra
            donde prendiste el GPS y mide {RADIO_DEMO_M} m de radio, así se puede mostrar
            caminando por cualquier lado. Con unos pasos cambiás de cuadrante y de anillo.
            En el campo real el pivote mide 800 m y está fijo en Santa Ana.
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 lg:grid-cols-[1fr_300px]">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2 gap-2 flex-wrap">
              <div className="flex gap-1.5">
                {(demo ? pivotesEfectivos : pivotes).map((p) => (
                  <Button
                    key={p.nombre}
                    size="sm"
                    variant={pivoteActual === p.nombre ? 'secondary' : 'ghost'}
                    onClick={() => setPivoteVisible(p.nombre)}
                  >
                    Pivote {p.nombre}
                  </Button>
                ))}
              </div>
              {pivoteObj?.estimado && !demo && (
                <Badge variant="outline" className="text-[10px]">coordenadas estimadas</Badge>
              )}
            </div>

            <PlanoPivote
              pivote={pivoteActual ?? ''}
              lotes={lotesDelPivote}
              seleccionado={seleccionado}
              onSeleccionar={(l) => setSeleccionado(l.id)}
              posicion={
                enEstePivote && ubicacion
                  ? {
                      radio: ubicacion.radio,
                      rumbo: ubicacion.rumbo,
                      precision_m: gps.lectura?.precision_m,
                      radio_pivote_m: pivoteObj?.radio_m,
                    }
                  : null
              }
              size={460}
            />
          </CardContent>
        </Card>

        <div className="space-y-4">
          {/* Lectura del GPS, cruda */}
          <Card>
            <CardContent className="p-4 space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium flex items-center gap-1.5">
                  <Satellite className="h-4 w-4" />GPS
                </p>
                {gps.estado === 'siguiendo' && (
                  <span className="flex items-center gap-1.5 text-[11px] text-emerald-600">
                    <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                    en vivo · {gps.lecturas}
                  </span>
                )}
              </div>

              {gps.lectura ? (
                <dl className="text-xs grid grid-cols-[auto_1fr] gap-x-3 gap-y-1">
                  <dt className="text-muted-foreground">Latitud</dt>
                  <dd className="tabular-nums text-right">{gps.lectura.latitud.toFixed(6)}</dd>
                  <dt className="text-muted-foreground">Longitud</dt>
                  <dd className="tabular-nums text-right">{gps.lectura.longitud.toFixed(6)}</dd>
                  <dt className="text-muted-foreground">Precisión</dt>
                  <dd className="tabular-nums text-right">
                    <span className={gps.lectura.precision_m > 20 ? 'text-amber-600' : ''}>
                      ±{gps.lectura.precision_m.toFixed(0)} m
                    </span>
                  </dd>
                  {gps.lectura.altitud !== null && (
                    <>
                      <dt className="text-muted-foreground">Altitud</dt>
                      <dd className="tabular-nums text-right">{gps.lectura.altitud.toFixed(0)} m</dd>
                    </>
                  )}
                  {gps.lectura.velocidad !== null && gps.lectura.velocidad > 0 && (
                    <>
                      <dt className="text-muted-foreground">Velocidad</dt>
                      <dd className="tabular-nums text-right">
                        {(gps.lectura.velocidad * 3.6).toFixed(1)} km/h
                      </dd>
                    </>
                  )}
                  <dt className="text-muted-foreground">Última</dt>
                  <dd className="tabular-nums text-right">
                    {new Date(gps.lectura.momento).toLocaleTimeString('es-AR')}
                  </dd>
                </dl>
              ) : (
                <p className="text-xs text-muted-foreground">
                  {gps.estado === 'inactivo'
                    ? 'Prendé el GPS para ver tu posición.'
                    : 'Esperando la primera lectura…'}
                </p>
              )}
            </CardContent>
          </Card>

          {/* Dónde estás parado */}
          <Card className={loteActual ? 'border-emerald-400 dark:border-emerald-800' : undefined}>
            <CardContent className="p-4 space-y-2">
              <p className="text-sm font-medium flex items-center gap-1.5">
                <MapPin className="h-4 w-4" />Estás parado en
              </p>
              {ubicacion ? (
                <>
                  <p className="text-2xl font-semibold">
                    {loteActual?.codigo ?? '—'}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Pivote {ubicacion.pivote} · cuadrante {ubicacion.cuadrante} · tercio{' '}
                    {ubicacion.tercio}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    a {ubicacion.distancia_m} m del centro, rumbo {ubicacion.rumbo}°
                  </p>
                  {loteActual && (
                    <Button size="sm" className="w-full mt-2" asChild>
                      <Link href={`/dashboard/campo/ordenes?lote=${loteActual.id}`}>
                        <ClipboardList className="h-4 w-4 mr-1.5" />
                        Cargar orden acá
                      </Link>
                    </Button>
                  )}
                </>
              ) : gps.lectura ? (
                <p className="text-sm text-muted-foreground">
                  Estás fuera de los círculos de riego. Prendé el modo demo para probarlo
                  desde donde estés.
                </p>
              ) : (
                <p className="text-sm text-muted-foreground">Sin lectura de GPS todavía.</p>
              )}
            </CardContent>
          </Card>

          {/* Ficha del lote elegido */}
          {detalle && (
            <Card>
              <CardContent className="p-4 space-y-1.5">
                <div className="flex items-center justify-between gap-2">
                  <p className="font-semibold">{detalle.codigo}</p>
                  <Badge variant="outline">{detalle.estado}</Badge>
                </div>
                <dl className="text-xs grid grid-cols-[auto_1fr] gap-x-3 gap-y-1">
                  <dt className="text-muted-foreground flex items-center gap-1">
                    <Ruler className="h-3 w-3" />Superficie
                  </dt>
                  <dd className="tabular-nums text-right">
                    {Number(detalle.superficie_ha).toFixed(1)} ha
                  </dd>
                  <dt className="text-muted-foreground">Cuadrante</dt>
                  <dd className="text-right">{detalle.cuadrante}</dd>
                  <dt className="text-muted-foreground">Tercio</dt>
                  <dd className="text-right">{detalle.tercio}</dd>
                </dl>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}
