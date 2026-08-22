'use client'

import { useMemo, useState } from 'react'
import useSWR from 'swr'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { TablaSimple, Encabezado, fetcher, type Columna } from '@/components/campo/TablaSimple'

interface Fila {
  id: string
  campana_anio: number
  campana: string
  lote: string
  establecimiento: string
  variedad: string
  categoria_semilla: string
  superficie_ha: string
  produccion_tn: string
  rendimiento_tn_ha: string
  lluvia_mm: string
  dias_heladas: number
  descarte_pct: string
  observaciones: string | null
}

const columnas: Columna<Fila>[] = [
  { clave: 'campana', titulo: 'Campaña' },
  { clave: 'lote', titulo: 'Lote' },
  { clave: 'establecimiento', titulo: 'Establecimiento' },
  { clave: 'variedad', titulo: 'Variedad', render: (f) => <span className="font-medium">{f.variedad}</span> },
  { clave: 'categoria_semilla', titulo: 'Categoría', render: (f) => <Badge variant="outline">{f.categoria_semilla}</Badge> },
  { clave: 'superficie_ha', titulo: 'Sup.', numerica: true, render: (f) => `${Number(f.superficie_ha).toFixed(1)} ha` },
  { clave: 'produccion_tn', titulo: 'Producción', numerica: true, render: (f) => `${Number(f.produccion_tn).toFixed(0)} t` },
  {
    clave: 'rendimiento_tn_ha', titulo: 'Rinde', numerica: true,
    render: (f) => {
      const r = Number(f.rendimiento_tn_ha)
      return <span className={r < 32 ? 'text-amber-600' : r > 42 ? 'text-emerald-600' : ''}>{r.toFixed(1)} t/ha</span>
    },
  },
  { clave: 'lluvia_mm', titulo: 'Lluvia', numerica: true, render: (f) => `${Number(f.lluvia_mm).toFixed(0)} mm` },
  { clave: 'descarte_pct', titulo: 'Descarte', numerica: true, render: (f) => `${Number(f.descarte_pct).toFixed(1)}%` },
]

export default function HistoricoPageClient() {
  const [variedad, setVariedad] = useState<string | null>(null)
  const url = variedad
    ? `/api/produccion/historico?variedad=${encodeURIComponent(variedad)}`
    : '/api/produccion/historico'
  const { data, isLoading } = useSWR<{ filas: Fila[] }>(url, fetcher)
  const { data: todas } = useSWR<{ filas: Fila[] }>('/api/produccion/historico', fetcher)

  const variedades = useMemo(
    () => Array.from(new Set((todas?.filas ?? []).map((f) => f.variedad))).sort(),
    [todas]
  )

  const filas = data?.filas ?? []
  const rindeMedio = filas.length
    ? filas.reduce((s, f) => s + Number(f.rendimiento_tn_ha), 0) / filas.length
    : 0

  return (
    <div className="p-4 md:p-6 space-y-4">
      <Encabezado
        titulo="Histórico"
        bajada="Veinte campañas de rendimiento por lote y variedad. Es la planilla, normalizada."
        extra={
          <Badge variant="outline">
            {filas.length} registros · rinde medio {rindeMedio.toFixed(1)} t/ha
          </Badge>
        }
      />

      <div className="flex flex-wrap gap-1.5">
        <Button variant={variedad === null ? 'secondary' : 'ghost'} size="sm" onClick={() => setVariedad(null)}>
          Todas
        </Button>
        {variedades.map((v) => (
          <Button
            key={v}
            variant={variedad === v ? 'secondary' : 'ghost'}
            size="sm"
            onClick={() => setVariedad(variedad === v ? null : v)}
          >
            {v}
          </Button>
        ))}
      </div>

      <TablaSimple columnas={columnas} filas={filas} cargando={isLoading} />
    </div>
  )
}
