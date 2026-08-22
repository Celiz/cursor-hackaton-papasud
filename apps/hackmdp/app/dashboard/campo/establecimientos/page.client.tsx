'use client'

import useSWR from 'swr'
import { Badge } from '@/components/ui/badge'
import { TablaSimple, Encabezado, fetcher, type Columna } from '@/components/campo/TablaSimple'

interface Establecimiento {
  id: string
  nombre: string
  localidad: string | null
  provincia: string | null
  superficie_ha: string | null
  lotes: string
  superficie_lotes_ha: string
  lotes_sembrados: string
}

const columnas: Columna<Establecimiento>[] = [
  { clave: 'nombre', titulo: 'Establecimiento', render: (e) => <span className="font-medium">{e.nombre}</span> },
  { clave: 'localidad', titulo: 'Localidad' },
  { clave: 'provincia', titulo: 'Provincia' },
  { clave: 'lotes', titulo: 'Lotes', numerica: true },
  {
    clave: 'superficie_lotes_ha', titulo: 'Superficie', numerica: true,
    render: (e) => `${Number(e.superficie_lotes_ha).toFixed(1)} ha`,
  },
  {
    clave: 'lotes_sembrados', titulo: 'Sembrados', numerica: true,
    render: (e) => <Badge variant="secondary">{e.lotes_sembrados}</Badge>,
  },
]

export default function EstablecimientosPageClient() {
  const { data, isLoading } = useSWR<{ establecimientos: Establecimiento[] }>('/api/campo/establecimientos', fetcher)
  return (
    <div className="p-4 md:p-6 space-y-4">
      <Encabezado titulo="Establecimientos" bajada="Los campos donde se produce." />
      <TablaSimple columnas={columnas} filas={data?.establecimientos} cargando={isLoading} />
    </div>
  )
}
