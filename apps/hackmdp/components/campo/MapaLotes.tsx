'use client'

import { useMemo } from 'react'
import { MapContainer, TileLayer, CircleMarker, Tooltip, Popup, LayersControl } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import { Badge } from '@/components/ui/badge'
import { colorDeEstado, type ParcelaMapa } from './lotes-estado'

export type { ParcelaMapa }

interface Props {
  parcelas: ParcelaMapa[]
  onSeleccionar?: (p: ParcelaMapa) => void
  /** Lotes sin actividad en más de N días se dibujan con borde punteado. */
  diasSinActividadAlerta?: number
}

export default function MapaLotes({ parcelas, onSeleccionar, diasSinActividadAlerta = 21 }: Props) {
  const conCoordenadas = useMemo(
    () => parcelas.filter((p) => p.latitud !== null && p.longitud !== null),
    [parcelas]
  )

  const centro = useMemo<[number, number]>(() => {
    if (conCoordenadas.length === 0) return [-37.9, -58.1]
    const lat = conCoordenadas.reduce((s, p) => s + Number(p.latitud), 0) / conCoordenadas.length
    const lng = conCoordenadas.reduce((s, p) => s + Number(p.longitud), 0) / conCoordenadas.length
    return [lat, lng]
  }, [conCoordenadas])

  if (conCoordenadas.length === 0) {
    return (
      <div className="h-full w-full grid place-items-center text-sm text-muted-foreground">
        Todavía no hay lotes con coordenadas cargadas.
      </div>
    )
  }

  return (
    <MapContainer
      center={centro}
      zoom={10}
      scrollWheelZoom
      className="h-full w-full rounded-md"
      style={{ background: '#0b1220' }}
    >
      <LayersControl position="topright">
        <LayersControl.BaseLayer checked name="Satelital">
          <TileLayer
            attribution="Tiles &copy; Esri"
            url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
            maxZoom={19}
          />
        </LayersControl.BaseLayer>
        <LayersControl.BaseLayer name="Mapa">
          <TileLayer
            attribution="&copy; OpenStreetMap"
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            maxZoom={19}
          />
        </LayersControl.BaseLayer>
      </LayersControl>

      {conCoordenadas.map((p) => {
        const sup = Number(p.superficie_ha) || 1
        const sinActividad =
          p.dias_sin_actividad === null || p.dias_sin_actividad > diasSinActividadAlerta
        return (
          <CircleMarker
            key={p.id}
            center={[Number(p.latitud), Number(p.longitud)]}
            radius={Math.max(8, Math.min(26, sup * 1.5))}
            pathOptions={{
              color: sinActividad ? '#ef4444' : colorDeEstado(p.estado),
              weight: sinActividad ? 3 : 2,
              dashArray: sinActividad ? '4 4' : undefined,
              fillColor: colorDeEstado(p.estado),
              fillOpacity: 0.55,
            }}
            eventHandlers={{ click: () => onSeleccionar?.(p) }}
          >
            <Tooltip direction="top" offset={[0, -6]}>
              <span className="font-medium">{p.codigo}</span> · {sup} ha
            </Tooltip>
            <Popup>
              <div className="space-y-1.5 min-w-52">
                <div className="flex items-center justify-between gap-2">
                  <strong className="text-sm">{p.codigo}</strong>
                  <Badge variant="outline" className="text-[10px]">{p.estado}</Badge>
                </div>
                <p className="text-xs text-muted-foreground m-0">
                  {p.establecimiento} · {p.localidad}
                </p>
                <dl className="text-xs grid grid-cols-2 gap-x-2 gap-y-0.5 m-0">
                  <dt className="text-muted-foreground">Superficie</dt>
                  <dd className="m-0 tabular-nums">{sup} ha</dd>
                  {p.tipo_suelo && (<><dt className="text-muted-foreground">Suelo</dt><dd className="m-0">{p.tipo_suelo}</dd></>)}
                  <dt className="text-muted-foreground">Riego</dt>
                  <dd className="m-0">{p.tiene_riego ? 'Sí' : 'No'}</dd>
                  {p.variedad && (<><dt className="text-muted-foreground">Última variedad</dt><dd className="m-0">{p.variedad}</dd></>)}
                  {p.ultimo_rinde && (<><dt className="text-muted-foreground">Último rinde</dt><dd className="m-0 tabular-nums">{Number(p.ultimo_rinde).toFixed(1)} t/ha</dd></>)}
                </dl>
                <div className="pt-1 border-t text-xs">
                  {p.ultima_tarea ? (
                    <>
                      <span className="text-muted-foreground">Última tarea: </span>
                      {p.ultima_tarea}
                      <span className="text-muted-foreground">
                        {' '}({p.dias_sin_actividad} días)
                      </span>
                    </>
                  ) : (
                    <span className="text-red-600 font-medium">Sin órdenes de trabajo registradas</span>
                  )}
                </div>
              </div>
            </Popup>
          </CircleMarker>
        )
      })}
    </MapContainer>
  )
}
