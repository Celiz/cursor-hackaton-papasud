'use client'

import { useMemo, useState } from 'react'
import dynamic from 'next/dynamic'
import useSWR from 'swr'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { colorDeEstado, LEYENDA, type ParcelaMapa } from '@/components/campo/lotes-estado'
import { MapPin, AlertTriangle, Sprout, Ruler } from 'lucide-react'

// Leaflet toca `window` al importarse: solo del lado del cliente.
const MapaLotes = dynamic(() => import('@/components/campo/MapaLotes'), {
  ssr: false,
  loading: () => (
    <div className="h-full w-full grid place-items-center text-sm text-muted-foreground">
      Cargando mapa…
    </div>
  ),
})

const fetcher = async (url: string) => {
  const res = await fetch(url)
  const data = await res.json()
  if (!res.ok) throw new Error(data.error ?? 'Error al cargar')
  return data
}

const DIAS_ALERTA = 21

export default function MapaPageClient() {
  const { data } = useSWR<{ parcelas: ParcelaMapa[] }>('/api/campo/parcelas', fetcher)
  const [seleccionada, setSeleccionada] = useState<ParcelaMapa | null>(null)
  const [filtroEstado, setFiltroEstado] = useState<string | null>(null)

  const parcelas = data?.parcelas ?? []

  const visibles = useMemo(
    () => (filtroEstado ? parcelas.filter((p) => p.estado === filtroEstado) : parcelas),
    [parcelas, filtroEstado]
  )

  const sinActividad = useMemo(
    () => parcelas.filter((p) => p.dias_sin_actividad === null || p.dias_sin_actividad > DIAS_ALERTA),
    [parcelas]
  )

  const superficieTotal = useMemo(
    () => parcelas.reduce((s, p) => s + Number(p.superficie_ha || 0), 0),
    [parcelas]
  )

  return (
    <div className="p-4 md:p-6 space-y-4">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Mapa de lotes</h1>
          <p className="text-sm text-muted-foreground">
            Estado del campo por lote. El borde rojo punteado marca los que no tienen
            una orden de trabajo hace más de {DIAS_ALERTA} días.
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Badge variant="outline" className="gap-1.5">
            <MapPin className="h-3.5 w-3.5" />{parcelas.length} lotes
          </Badge>
          <Badge variant="outline" className="gap-1.5">
            <Ruler className="h-3.5 w-3.5" />{superficieTotal.toFixed(1)} ha
          </Badge>
          {sinActividad.length > 0 && (
            <Badge variant="destructive" className="gap-1.5">
              <AlertTriangle className="h-3.5 w-3.5" />{sinActividad.length} sin actividad
            </Badge>
          )}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Button
          variant={filtroEstado === null ? 'secondary' : 'ghost'}
          size="sm"
          onClick={() => setFiltroEstado(null)}
        >
          Todos
        </Button>
        {LEYENDA.map((l) => (
          <Button
            key={l.estado}
            variant={filtroEstado === l.estado ? 'secondary' : 'ghost'}
            size="sm"
            onClick={() => setFiltroEstado(filtroEstado === l.estado ? null : l.estado)}
            className="gap-1.5"
          >
            <span
              className="inline-block h-2.5 w-2.5 rounded-full"
              style={{ backgroundColor: colorDeEstado(l.estado) }}
            />
            {l.label}
            <span className="text-muted-foreground tabular-nums">
              {parcelas.filter((p) => p.estado === l.estado).length}
            </span>
          </Button>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
        <Card className="overflow-hidden">
          <CardContent className="p-0 h-[62vh] min-h-96">
            <MapaLotes parcelas={visibles} onSeleccionar={setSeleccionada} diasSinActividadAlerta={DIAS_ALERTA} />
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-0">
            {seleccionada ? (
              <div className="p-4 space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <h2 className="font-semibold">{seleccionada.codigo}</h2>
                  <Badge variant="outline">{seleccionada.estado}</Badge>
                </div>
                <p className="text-sm text-muted-foreground">
                  {seleccionada.nombre}
                </p>
                <dl className="text-sm grid grid-cols-2 gap-y-1.5">
                  <dt className="text-muted-foreground">Establecimiento</dt>
                  <dd>{seleccionada.establecimiento}</dd>
                  <dt className="text-muted-foreground">Superficie</dt>
                  <dd className="tabular-nums">{Number(seleccionada.superficie_ha)} ha</dd>
                  <dt className="text-muted-foreground">Suelo</dt>
                  <dd>{seleccionada.tipo_suelo ?? '—'}</dd>
                  <dt className="text-muted-foreground">Riego</dt>
                  <dd>{seleccionada.tiene_riego ? 'Sí' : 'No'}</dd>
                  <dt className="text-muted-foreground">Última variedad</dt>
                  <dd>{seleccionada.variedad ?? '—'}</dd>
                  <dt className="text-muted-foreground">Último rinde</dt>
                  <dd className="tabular-nums">
                    {seleccionada.ultimo_rinde ? `${Number(seleccionada.ultimo_rinde).toFixed(1)} t/ha` : '—'}
                  </dd>
                </dl>
                <div className="pt-2 border-t text-sm">
                  {seleccionada.ultima_tarea ? (
                    <>
                      <p className="text-muted-foreground text-xs">Última orden de trabajo</p>
                      <p>{seleccionada.ultima_tarea}</p>
                      <p className="text-xs text-muted-foreground">
                        hace {seleccionada.dias_sin_actividad} días
                      </p>
                    </>
                  ) : (
                    <p className="text-red-600 flex items-center gap-1.5">
                      <AlertTriangle className="h-4 w-4" />
                      Sin órdenes de trabajo registradas
                    </p>
                  )}
                </div>
              </div>
            ) : (
              <div className="p-6 text-center space-y-2">
                <Sprout className="h-8 w-8 mx-auto text-muted-foreground" />
                <p className="text-sm text-muted-foreground">
                  Tocá un lote en el mapa para ver su ficha.
                </p>
              </div>
            )}

            {sinActividad.length > 0 && (
              <div className="border-t p-4 space-y-2">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Sin actividad reciente
                </p>
                <div className="space-y-1">
                  {sinActividad.slice(0, 8).map((p) => (
                    <button
                      key={p.id}
                      onClick={() => setSeleccionada(p)}
                      className="w-full text-left text-sm flex items-center justify-between gap-2 py-1 hover:text-foreground text-muted-foreground"
                    >
                      <span>{p.codigo}</span>
                      <span className="text-xs tabular-nums">
                        {p.dias_sin_actividad === null ? 'nunca' : `${p.dias_sin_actividad} d`}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
