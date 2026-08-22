'use client'

import useSWR from 'swr'
import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { TablaSimple, Encabezado, fetcher, type Columna } from '@/components/campo/TablaSimple'
import { colorDeEstado, type ParcelaMapa } from '@/components/campo/lotes-estado'
import { MapPin } from 'lucide-react'

const columnas: Columna<ParcelaMapa>[] = [
  {
    clave: 'codigo', titulo: 'Lote',
    render: (p) => <span className="font-medium">{p.codigo}</span>,
  },
  { clave: 'establecimiento', titulo: 'Establecimiento' },
  { clave: 'localidad', titulo: 'Localidad' },
  {
    clave: 'superficie_ha', titulo: 'Superficie', numerica: true,
    render: (p) => `${Number(p.superficie_ha).toFixed(1)} ha`,
  },
  { clave: 'tipo_suelo', titulo: 'Suelo' },
  {
    clave: 'tiene_riego', titulo: 'Riego',
    render: (p) => (p.tiene_riego ? 'Sí' : '—'),
  },
  {
    clave: 'estado', titulo: 'Estado',
    render: (p) => (
      <Badge variant="outline" className="gap-1.5">
        <span className="inline-block h-2 w-2 rounded-full" style={{ backgroundColor: colorDeEstado(p.estado) }} />
        {p.estado}
      </Badge>
    ),
  },
  { clave: 'variedad', titulo: 'Última variedad' },
  {
    clave: 'ultimo_rinde', titulo: 'Último rinde', numerica: true,
    render: (p) => (p.ultimo_rinde ? `${Number(p.ultimo_rinde).toFixed(1)} t/ha` : '—'),
  },
  {
    clave: 'dias_sin_actividad', titulo: 'Sin actividad', numerica: true,
    render: (p) =>
      p.dias_sin_actividad === null
        ? <span className="text-red-600">nunca</span>
        : <span className={p.dias_sin_actividad > 21 ? 'text-red-600' : ''}>{p.dias_sin_actividad} d</span>,
  },
]

export default function LotesPageClient() {
  const { data, isLoading } = useSWR<{ parcelas: ParcelaMapa[] }>('/api/campo/parcelas', fetcher)
  const parcelas = data?.parcelas ?? []
  const superficie = parcelas.reduce((s, p) => s + Number(p.superficie_ha || 0), 0)

  return (
    <div className="p-4 md:p-6 space-y-4">
      <Encabezado
        titulo="Lotes"
        bajada="Las parcelas de campo. Para la vista geográfica, el mapa."
        extra={
          <div className="flex gap-2 items-center">
            <Badge variant="outline">{parcelas.length} lotes · {superficie.toFixed(1)} ha</Badge>
            <Button variant="outline" size="sm" asChild>
              <Link href="/dashboard/campo/mapa"><MapPin className="h-4 w-4 mr-1.5" />Ver en el mapa</Link>
            </Button>
          </div>
        }
      />
      <TablaSimple columnas={columnas} filas={parcelas} cargando={isLoading} />
    </div>
  )
}
