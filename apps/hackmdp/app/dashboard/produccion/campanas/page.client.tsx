'use client'

import useSWR from 'swr'
import { TablaSimple, Encabezado, fetcher, type Columna } from '@/components/campo/TablaSimple'

interface Campana {
  id: string
  anio: number
  nombre: string
  superficie_ha: string | null
  produccion_tn: string | null
  rinde_promedio: string | null
  lotes_sembrados: string
  lluvia_mm: string
  temp_media_c: string
  dias_heladas: number
  descarte_promedio: string | null
  notas: string | null
}

const columnas: Columna<Campana>[] = [
  { clave: 'nombre', titulo: 'Campaña', render: (c) => <span className="font-medium">{c.nombre}</span> },
  { clave: 'lotes_sembrados', titulo: 'Lotes', numerica: true },
  { clave: 'superficie_ha', titulo: 'Superficie', numerica: true, render: (c) => `${Number(c.superficie_ha).toFixed(0)} ha` },
  { clave: 'produccion_tn', titulo: 'Producción', numerica: true, render: (c) => `${Number(c.produccion_tn).toFixed(0)} t` },
  {
    clave: 'rinde_promedio', titulo: 'Rinde medio', numerica: true,
    render: (c) => {
      const r = Number(c.rinde_promedio)
      return <span className={r < 32 ? 'text-amber-600 font-medium' : r > 42 ? 'text-emerald-600 font-medium' : ''}>{r.toFixed(1)} t/ha</span>
    },
  },
  { clave: 'lluvia_mm', titulo: 'Lluvia', numerica: true, render: (c) => `${Number(c.lluvia_mm).toFixed(0)} mm` },
  { clave: 'dias_heladas', titulo: 'Heladas', numerica: true },
  { clave: 'descarte_promedio', titulo: 'Descarte', numerica: true, render: (c) => `${Number(c.descarte_promedio).toFixed(1)}%` },
  {
    clave: 'notas', titulo: 'Nota',
    render: (c) => <span className="text-xs text-muted-foreground max-w-80 truncate inline-block">{c.notas ?? '—'}</span>,
  },
]

export default function CampanasPageClient() {
  const { data, isLoading } = useSWR<{ campanas: Campana[] }>('/api/produccion/campanas', fetcher)
  return (
    <div className="p-4 md:p-6 space-y-4">
      <Encabezado titulo="Campañas" bajada="Una fila por ciclo productivo, con el clima que le tocó." />
      <TablaSimple columnas={columnas} filas={data?.campanas} cargando={isLoading} />
    </div>
  )
}
