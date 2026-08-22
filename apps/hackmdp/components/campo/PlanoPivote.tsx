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
  size?: number
}

export function PlanoPivote({
  pivote, lotes, posicion, seleccionado, onSeleccionar, resaltarSeleccion, size = 420,
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
