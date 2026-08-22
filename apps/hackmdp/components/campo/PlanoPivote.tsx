'use client'

import { useMemo } from 'react'
import {
  anguloDeCuadrante,
  caminoDeSector,
  centroDeSector,
  puntoEnCirculo,
} from '@/lib/campo/pivote'

export interface LotePivote {
  id: string
  codigo: string
  pivote: string | null
  cuadrante: number | null
  tercio: number | null
  anillo_desde: string | number | null
  anillo_hasta: string | number | null
  superficie_ha: string | number
  estado: string
  variedad?: string | null
}

/** Un teléfono en el campo, ubicado dentro del pivote. */
export interface DispositivoEnPlano {
  dispositivo: string
  nombre: string | null
  /** Radio normalizado 0..1 y rumbo en grados de brújula. */
  radio: number
  rumbo: number
  precision_m?: number | null
  hace_seg?: number
  lote?: string | null
  /** Se está moviendo: se dibuja con estela. */
  moviendose?: boolean
}

/** Una foto sacada en el campo, para que aparezca donde se tomó. */
export interface FotoEnPlano {
  id: string
  radio: number
  rumbo: number
  miniatura?: string | null
  hallazgo?: string | null
  urgente?: boolean
  hace_seg?: number
  lote?: string | null
}

export interface PosicionEnPlano {
  /** Radio normalizado 0..1 desde el centro del pivote. */
  radio: number
  /** Rumbo en grados de brújula. */
  rumbo: number
  /** Precisión del GPS en metros, para dibujar el círculo de incertidumbre. */
  precision_m?: number
  /** Radio del pivote en metros, para escalar esa precisión. */
  radio_pivote_m?: number
}

/**
 * Colores estables por lote. El plano de Papasud le da un color propio a cada
 * lote; se reproduce derivando el tono del código, así el mismo lote se ve
 * siempre igual sin tener que guardar la paleta.
 */
function colorDeLote(codigo: string, atenuado = false): string {
  let h = 0
  for (let i = 0; i < codigo.length; i++) h = (h * 31 + codigo.charCodeAt(i)) % 360
  return `hsl(${h} ${atenuado ? 25 : 62}% ${atenuado ? 78 : 52}%)`
}

const num = (v: string | number | null | undefined, def = 0) =>
  v === null || v === undefined ? def : Number(v)

interface Props {
  pivote: string
  lotes: LotePivote[]
  /** Dónde está parado el ingeniero, si el GPS lo ubicó en este pivote. */
  posicion?: PosicionEnPlano | null
  seleccionado?: string | null
  onSeleccionar?: (l: LotePivote) => void
  /** Atenúa los lotes que no están seleccionados. */
  resaltarSeleccion?: boolean
  /** Todos los teléfonos que están en este pivote ahora. */
  dispositivos?: DispositivoEnPlano[]
  /** Fotos sacadas en este pivote. */
  fotos?: FotoEnPlano[]
  onFoto?: (f: FotoEnPlano) => void
  size?: number
}

/** Color estable por dispositivo, para distinguir a cada persona. */
function colorDeDispositivo(id: string): string {
  let h = 0
  for (let i = 0; i < id.length; i++) h = (h * 37 + id.charCodeAt(i)) % 360
  return `hsl(${h} 78% 45%)`
}

export function PlanoPivote({
  pivote, lotes, posicion, seleccionado, onSeleccionar, resaltarSeleccion,
  dispositivos = [], fotos = [], onFoto, size = 420,
}: Props) {
  const cx = size / 2
  const cy = size / 2
  const radio = size * 0.42

  const sectores = useMemo(
    () =>
      lotes
        .filter((l) => l.cuadrante !== null)
        .map((l) => {
          const ang = anguloDeCuadrante(l.cuadrante!)
          const sector = {
            rDesde: num(l.anillo_desde) / 100,
            rHasta: num(l.anillo_hasta, 100) / 100,
            desde: ang.desde,
            hasta: ang.hasta,
          }
          return {
            lote: l,
            d: caminoDeSector(cx, cy, radio, sector),
            centro: centroDeSector(cx, cy, radio, sector),
          }
        }),
    [lotes, cx, cy, radio]
  )

  // El punto del ingeniero, en coordenadas del dibujo.
  const yo = posicion
    ? puntoEnCirculo(cx, cy, Math.min(1, posicion.radio) * radio, posicion.rumbo)
    : null
  const radioPrecision =
    posicion?.precision_m && posicion.radio_pivote_m
      ? (posicion.precision_m / posicion.radio_pivote_m) * radio
      : null

  return (
    <svg
      viewBox={`0 0 ${size} ${size}`}
      className="w-full h-auto max-w-full select-none"
      role="img"
      aria-label={`Plano del pivote ${pivote}`}
    >
      {/* Círculo del pivote */}
      <circle cx={cx} cy={cy} r={radio} className="fill-muted/30 stroke-border" strokeWidth={1} />

      {sectores.map(({ lote, d, centro }) => {
        const activo = seleccionado === lote.id
        const atenuar = Boolean(resaltarSeleccion && seleccionado && !activo)
        return (
          <g key={lote.id} className={onSeleccionar ? 'cursor-pointer' : undefined}>
            <path
              d={d}
              fill={colorDeLote(lote.codigo, atenuar)}
              stroke="white"
              strokeWidth={activo ? 2.5 : 0.8}
              strokeOpacity={0.9}
              onClick={() => onSeleccionar?.(lote)}
            >
              <title>
                {lote.codigo} · {Number(lote.superficie_ha).toFixed(1)} ha · tercio {lote.tercio}
                {lote.variedad ? ` · ${lote.variedad}` : ''}
              </title>
            </path>
            <text
              x={centro.x}
              y={centro.y}
              textAnchor="middle"
              dominantBaseline="central"
              className="pointer-events-none"
              style={{
                fontSize: Math.max(7, size * 0.024),
                fill: atenuar ? 'rgba(0,0,0,.35)' : 'rgba(0,0,0,.75)',
                fontWeight: activo ? 700 : 500,
              }}
            >
              {lote.codigo}
            </text>
          </g>
        )
      })}

      {/* Ejes que separan los cuadrantes, como en el plano en papel */}
      <line x1={cx} y1={cy - radio} x2={cx} y2={cy + radio} stroke="currentColor" strokeWidth={2} opacity={0.75} />
      <line x1={cx - radio} y1={cy} x2={cx + radio} y2={cy} stroke="currentColor" strokeWidth={2} opacity={0.75} />

      {/* Números de cuadrante, afuera del círculo */}
      {Array.from(new Set(lotes.map((l) => l.cuadrante).filter((c): c is number => c !== null))).map((c) => {
        const ang = anguloDeCuadrante(c)
        const p = puntoEnCirculo(cx, cy, radio * 1.12, (ang.desde + ang.hasta) / 2)
        return (
          <text
            key={c}
            x={p.x}
            y={p.y}
            textAnchor="middle"
            dominantBaseline="central"
            className="fill-muted-foreground"
            style={{ fontSize: size * 0.05, fontWeight: 300 }}
          >
            {c}
          </text>
        )
      })}

      {/* Fotos sacadas en el campo */}
      {fotos.map((f) => {
        const p = puntoEnCirculo(cx, cy, Math.min(1, f.radio) * radio, f.rumbo)
        const reciente = (f.hace_seg ?? 999) < 60
        return (
          <g
            key={f.id}
            className={onFoto ? 'cursor-pointer' : undefined}
            onClick={() => onFoto?.(f)}
          >
            {reciente && (
              <circle cx={p.x} cy={p.y} r={14} fill="none"
                      stroke={f.urgente ? 'rgb(220 38 38)' : 'rgb(37 99 235)'} strokeWidth={2}>
                {/* El pulso solo mientras es reciente: así se ve "saltar" la foto nueva */}
                <animate attributeName="r" values="8;22;8" dur="1.6s" repeatCount="indefinite" />
                <animate attributeName="opacity" values="0.9;0;0.9" dur="1.6s" repeatCount="indefinite" />
              </circle>
            )}
            <rect
              x={p.x - 9} y={p.y - 9} width={18} height={18} rx={3}
              fill="white"
              stroke={f.urgente ? 'rgb(220 38 38)' : 'rgb(82 82 91)'}
              strokeWidth={f.urgente ? 2.5 : 1.2}
            />
            {f.miniatura && (
              <image
                href={f.miniatura}
                x={p.x - 7.5} y={p.y - 7.5} width={15} height={15}
                preserveAspectRatio="xMidYMid slice"
              />
            )}
            <title>
              {f.hallazgo ?? 'Foto'}{f.lote ? ` · ${f.lote}` : ''}
              {f.hace_seg !== undefined ? ` · hace ${f.hace_seg}s` : ''}
            </title>
          </g>
        )
      })}

      {/* Los teléfonos que están caminando en el campo */}
      {dispositivos.map((d) => {
        const p = puntoEnCirculo(cx, cy, Math.min(1, d.radio) * radio, d.rumbo)
        const color = colorDeDispositivo(d.dispositivo)
        const rPrecision =
          d.precision_m && posicion?.radio_pivote_m
            ? (d.precision_m / posicion.radio_pivote_m) * radio
            : null
        return (
          <g key={d.dispositivo}>
            {rPrecision !== null && rPrecision > 2 && (
              <circle cx={p.x} cy={p.y} r={rPrecision} fill={color} fillOpacity={0.12}
                      stroke={color} strokeOpacity={0.35} strokeWidth={1} />
            )}
            {d.moviendose && (
              <circle cx={p.x} cy={p.y} r={9} fill="none" stroke={color} strokeWidth={2}>
                <animate attributeName="r" values="7;16;7" dur="2s" repeatCount="indefinite" />
                <animate attributeName="opacity" values="0.7;0;0.7" dur="2s" repeatCount="indefinite" />
              </circle>
            )}
            <circle cx={p.x} cy={p.y} r={7} fill="white" />
            <circle cx={p.x} cy={p.y} r={5} fill={color} />
            {d.nombre && (
              <text
                x={p.x} y={p.y - 12}
                textAnchor="middle"
                style={{ fontSize: Math.max(8, size * 0.026), fontWeight: 600, fill: color,
                         paintOrder: 'stroke', stroke: 'white', strokeWidth: 3 }}
              >
                {d.nombre}
              </text>
            )}
            <title>
              {d.nombre ?? d.dispositivo}
              {d.lote ? ` · ${d.lote}` : ''}
              {d.hace_seg !== undefined ? ` · hace ${d.hace_seg}s` : ''}
            </title>
          </g>
        )
      })}

      {/* Dónde está parado el ingeniero */}
      {yo && (
        <g>
          {radioPrecision !== null && radioPrecision > 1 && (
            <circle
              cx={yo.x}
              cy={yo.y}
              r={radioPrecision}
              fill="rgb(59 130 246 / 0.18)"
              stroke="rgb(59 130 246 / 0.5)"
              strokeWidth={1}
            />
          )}
          <circle cx={yo.x} cy={yo.y} r={7} fill="white" />
          <circle cx={yo.x} cy={yo.y} r={5} fill="rgb(37 99 235)">
            <animate attributeName="r" values="5;7;5" dur="2s" repeatCount="indefinite" />
          </circle>
        </g>
      )}

      {/* Norte */}
      <text
        x={cx}
        y={cy - radio * 1.16}
        textAnchor="middle"
        className="fill-muted-foreground"
        style={{ fontSize: size * 0.035 }}
      >
        N
      </text>
    </svg>
  )
}

export { colorDeLote }
