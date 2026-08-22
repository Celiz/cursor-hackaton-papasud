'use client'

import useSWR from 'swr'
import { FlaskConical, ChevronRight } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

const fetcher = (url: string) => fetch(url).then(r => r.json())

const ESTADO_BADGE: Record<string, { label: string; class: string }> = {
  ingresada: { label: 'Ingresada', class: 'bg-blue-100 text-blue-800' },
  en_proceso: { label: 'En proceso', class: 'bg-amber-100 text-amber-800' },
  parcial: { label: 'Parcial', class: 'bg-amber-100 text-amber-800' },
  completada: { label: 'Completada', class: 'bg-green-100 text-green-800' },
  entregada: { label: 'Entregada', class: 'bg-gray-100 text-gray-800' },
}

export default function ResultadosClient() {
  const { data } = useSWR('/cliente/api/resultados?limit=50', fetcher)
  const ordenes = data?.ordenes || []

  return (
    <div className="space-y-4 pb-20 md:pb-0">
      <h1 className="text-2xl font-bold">Resultados</h1>

      {ordenes.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            <FlaskConical className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p>No hay resultados disponibles</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {ordenes.map((o: any) => {
            const badge = ESTADO_BADGE[o.estado] || { label: o.estado, class: '' }
            return (
              <a key={o.id} href={`/cliente/resultados/${o.id}`}>
                <Card className="hover:shadow-md transition-shadow cursor-pointer">
                  <CardContent className="flex items-center justify-between p-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">Orden #{o.numero}</span>
                        <Badge className={badge.class}>{badge.label}</Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {o.paciente_nombre && `${o.paciente_nombre} (${o.paciente_especie}) - `}
                        {new Date(o.fecha + 'T12:00:00').toLocaleDateString('es-AR', { day: 'numeric', month: 'long', year: 'numeric' })}
                      </p>
                      <p className="text-xs text-muted-foreground">{o.estudios_count} estudio{o.estudios_count !== 1 ? 's' : ''}</p>
                    </div>
                    <ChevronRight className="w-5 h-5 text-muted-foreground" />
                  </CardContent>
                </Card>
              </a>
            )
          })}
        </div>
      )}
    </div>
  )
}
