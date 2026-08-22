'use client'

import useSWR from 'swr'
import { Badge } from '@/components/ui/badge'
import { TablaSimple, Encabezado, fetcher, type Columna } from '@/components/campo/TablaSimple'

interface Insumo {
  id: string
  nombre: string
  tipo: string | null
  principio_activo: string | null
  unidad: string | null
  dosis_min: string | null
  dosis_max: string | null
  alias: string[] | null
  usos: string
  usos_fuera_rango: string
}

const columnas: Columna<Insumo>[] = [
  { clave: 'nombre', titulo: 'Insumo', render: (i) => <span className="font-medium">{i.nombre}</span> },
  { clave: 'tipo', titulo: 'Tipo', render: (i) => <Badge variant="outline">{i.tipo}</Badge> },
  { clave: 'principio_activo', titulo: 'Principio activo' },
  {
    clave: 'dosis', titulo: 'Dosis recomendada', numerica: true,
    render: (i) => `${i.dosis_min ?? '?'} – ${i.dosis_max ?? '?'} ${i.unidad ?? ''}`,
  },
  {
    clave: 'alias', titulo: 'Cómo se dice en el campo',
    render: (i) => (
      <span className="text-muted-foreground text-xs">{(i.alias ?? []).join(', ') || '—'}</span>
    ),
  },
  { clave: 'usos', titulo: 'Usos', numerica: true },
  {
    clave: 'usos_fuera_rango', titulo: 'Fuera de rango', numerica: true,
    render: (i) =>
      Number(i.usos_fuera_rango) > 0
        ? <Badge variant="destructive">{i.usos_fuera_rango}</Badge>
        : <span className="text-muted-foreground">—</span>,
  },
]

export default function InsumosPageClient() {
  const { data, isLoading } = useSWR<{ insumos: Insumo[] }>('/api/campo/insumos', fetcher)
  return (
    <div className="p-4 md:p-6 space-y-4">
      <Encabezado
        titulo="Insumos y dosis"
        bajada="El diccionario que el copiloto usa para interpretar los dictados. Los alias son los que reconoce."
      />
      <TablaSimple columnas={columnas} filas={data?.insumos} cargando={isLoading} />
    </div>
  )
}
