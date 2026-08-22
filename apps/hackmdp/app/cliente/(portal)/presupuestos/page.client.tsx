'use client'

import useSWR from 'swr'
import { FileText, ChevronRight } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

const fetcher = (url: string) => fetch(url).then(r => r.json())

const ESTADO_BADGE: Record<string, { label: string; class: string }> = {
  enviado: { label: 'Nuevo', class: 'bg-blue-100 text-blue-800' },
  visto: { label: 'Pendiente', class: 'bg-amber-100 text-amber-800' },
  aceptado: { label: 'Aceptado', class: 'bg-green-100 text-green-800' },
  rechazado: { label: 'Rechazado', class: 'bg-red-100 text-red-800' },
  vencido: { label: 'Vencido', class: 'bg-gray-100 text-gray-800' },
}

export default function PresupuestosClient() {
  const { data } = useSWR('/cliente/api/presupuestos?limit=50', fetcher)
  const presupuestos = data?.presupuestos || []

  return (
    <div className="space-y-4 pb-20 md:pb-0">
      <h1 className="text-2xl font-bold">Presupuestos</h1>

      {presupuestos.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            <FileText className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p>No hay presupuestos</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {presupuestos.map((p: any) => {
            const badge = ESTADO_BADGE[p.estado] || { label: p.estado, class: '' }
            return (
              <a key={p.id} href={`/cliente/presupuestos/${p.id}`}>
                <Card className="hover:shadow-md transition-shadow cursor-pointer">
                  <CardContent className="flex items-center justify-between p-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{p.titulo || p.numero}</span>
                        <Badge className={badge.class}>{badge.label}</Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {p.paciente_nombre && `${p.paciente_nombre} - `}
                        {new Date(p.fecha).toLocaleDateString('es-AR', { day: 'numeric', month: 'long', year: 'numeric' })}
                      </p>
                      <p className="text-xs text-muted-foreground">{p.items_count} item{p.items_count !== 1 ? 's' : ''}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="font-bold text-lg">${Number(p.total || 0).toLocaleString('es-AR')}</span>
                      <ChevronRight className="w-5 h-5 text-muted-foreground" />
                    </div>
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
