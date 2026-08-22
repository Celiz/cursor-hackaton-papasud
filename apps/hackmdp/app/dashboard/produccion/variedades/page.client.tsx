'use client'

import useSWR from 'swr'
import { Badge } from '@/components/ui/badge'
import { TablaSimple, Encabezado, fetcher, type Columna } from '@/components/campo/TablaSimple'

interface Variedad {
  id: string
  nombre: string
  ciclo: string | null
  destino: string | null
  color_piel: string | null
  siembras: string
  rinde_promedio: string | null
  rinde_max: string | null
  descarte_promedio: string | null
  produccion_total_tn: string | null
  notas: string | null
}

const columnas: Columna<Variedad>[] = [
  { clave: 'nombre', titulo: 'Variedad', render: (v) => <span className="font-medium">{v.nombre}</span> },
  { clave: 'ciclo', titulo: 'Ciclo' },
  { clave: 'destino', titulo: 'Destino', render: (v) => <Badge variant="outline">{v.destino}</Badge> },
  { clave: 'color_piel', titulo: 'Piel' },
  { clave: 'siembras', titulo: 'Siembras', numerica: true },
  {
    clave: 'rinde_promedio', titulo: 'Rinde medio', numerica: true,
    render: (v) => (v.rinde_promedio ? `${Number(v.rinde_promedio).toFixed(1)} t/ha` : '—'),
  },
  {
    clave: 'rinde_max', titulo: 'Mejor rinde', numerica: true,
    render: (v) => (v.rinde_max ? `${Number(v.rinde_max).toFixed(1)} t/ha` : '—'),
  },
  {
    clave: 'descarte_promedio', titulo: 'Descarte', numerica: true,
    render: (v) => (v.descarte_promedio ? `${Number(v.descarte_promedio).toFixed(1)}%` : '—'),
  },
  {
    clave: 'produccion_total_tn', titulo: 'Producción total', numerica: true,
    render: (v) => (v.produccion_total_tn ? `${Number(v.produccion_total_tn).toLocaleString('es-AR')} t` : '—'),
  },
]

export default function VariedadesPageClient() {
  const { data, isLoading } = useSWR<{ variedades: Variedad[] }>('/api/produccion/variedades', fetcher)
  return (
    <div className="p-4 md:p-6 space-y-4">
      <Encabezado titulo="Variedades" bajada="Qué se siembra y cómo viene rindiendo cada una." />
      <TablaSimple columnas={columnas} filas={data?.variedades} cargando={isLoading} />
    </div>
  )
}
