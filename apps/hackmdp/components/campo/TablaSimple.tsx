'use client'

import { type ReactNode } from 'react'
import { Card, CardContent } from '@/components/ui/card'

export interface Columna<T> {
  clave: string
  titulo: string
  /** Alinea a la derecha y usa cifras tabulares. */
  numerica?: boolean
  render?: (fila: T) => ReactNode
  className?: string
}

interface Props<T> {
  columnas: Columna<T>[]
  filas: T[] | undefined
  cargando?: boolean
  vacio?: string
  onFilaClick?: (fila: T) => void
}

/**
 * Tabla de catálogo, sin filtros ni paginado: los listados de Papasud son de
 * decenas de filas, no de miles. Para lo grande está GenericDataTable.
 */
export function TablaSimple<T extends { id?: string }>({
  columnas, filas, cargando, vacio = 'Sin datos.', onFilaClick,
}: Props<T>) {
  return (
    <Card>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b bg-muted/50">
              <tr>
                {columnas.map((c) => (
                  <th
                    key={c.clave}
                    className={`px-3 py-2 font-medium text-muted-foreground whitespace-nowrap ${
                      c.numerica ? 'text-right' : 'text-left'
                    }`}
                  >
                    {c.titulo}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y">
              {cargando && (
                <tr><td colSpan={columnas.length} className="px-3 py-6 text-center text-muted-foreground">Cargando…</td></tr>
              )}
              {!cargando && (filas ?? []).length === 0 && (
                <tr><td colSpan={columnas.length} className="px-3 py-6 text-center text-muted-foreground">{vacio}</td></tr>
              )}
              {(filas ?? []).map((f, i) => (
                <tr
                  key={f.id ?? i}
                  onClick={onFilaClick ? () => onFilaClick(f) : undefined}
                  className={onFilaClick ? 'cursor-pointer hover:bg-muted/50' : undefined}
                >
                  {columnas.map((c) => (
                    <td
                      key={c.clave}
                      className={`px-3 py-2 whitespace-nowrap ${
                        c.numerica ? 'text-right tabular-nums' : ''
                      } ${c.className ?? ''}`}
                    >
                      {c.render
                        ? c.render(f)
                        : ((f as Record<string, unknown>)[c.clave] as ReactNode) ?? '—'}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  )
}

export function Encabezado({ titulo, bajada, extra }: { titulo: string; bajada?: string; extra?: ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-3 flex-wrap">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">{titulo}</h1>
        {bajada && <p className="text-sm text-muted-foreground">{bajada}</p>}
      </div>
      {extra}
    </div>
  )
}

export const fetcher = async (url: string) => {
  const res = await fetch(url)
  const data = await res.json()
  if (!res.ok) throw new Error(data.error ?? 'Error al cargar')
  return data
}
