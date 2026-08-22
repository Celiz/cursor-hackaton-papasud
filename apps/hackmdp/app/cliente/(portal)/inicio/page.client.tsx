'use client'

import useSWR from 'swr'
import { Calendar, FlaskConical, FileText, ArrowRight, Clock } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import type { ClienteSession } from '@/lib/client-session'

const fetcher = (url: string) => fetch(url).then(r => r.json())

const ESTADO_COLORS: Record<string, string> = {
  solicitada: 'bg-amber-100 text-amber-800',
  confirmada: 'bg-green-100 text-green-800',
  en_curso: 'bg-blue-100 text-blue-800',
  completada: 'bg-gray-100 text-gray-800',
  pendiente: 'bg-amber-100 text-amber-800',
}

export default function InicioClient({ session }: { session: ClienteSession }) {
  const today = new Date().toISOString().split('T')[0]

  const { data: turnosData } = useSWR(
    session.scope === 'full' ? `/cliente/api/turnos?limit=3&fecha_desde=${today}&estado=confirmada` : null,
    fetcher
  )
  const { data: resultadosData } = useSWR('/cliente/api/resultados?limit=3', fetcher)
  const { data: presupuestosData } = useSWR(
    session.scope === 'full' ? '/cliente/api/presupuestos?estado=pendiente&limit=3' : null,
    fetcher
  )

  return (
    <div className="space-y-6 pb-20 md:pb-0">
      <div>
        <h1 className="text-2xl font-bold">Hola, {session.nombre.split(' ')[0]}</h1>
        <p className="text-muted-foreground">{session.org_nombre}</p>
      </div>

      {session.scope === 'full' && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-base font-medium flex items-center gap-2">
              <Calendar className="w-4 h-4" /> Próximos turnos
            </CardTitle>
            <a href="/cliente/turnos" className="text-sm text-muted-foreground hover:underline flex items-center gap-1">
              Ver todos <ArrowRight className="w-3 h-3" />
            </a>
          </CardHeader>
          <CardContent>
            {!turnosData?.turnos?.length ? (
              <p className="text-sm text-muted-foreground">No tenés turnos próximos</p>
            ) : (
              <div className="space-y-2">
                {turnosData.turnos.map((t: any) => (
                  <div key={t.id} className="flex items-center justify-between py-2 border-b last:border-0">
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-muted-foreground" />
                      <div>
                        <p className="text-sm font-medium">{t.tipo}</p>
                        <p className="text-xs text-muted-foreground">{t.fecha} - {t.hora_inicio}</p>
                      </div>
                    </div>
                    <Badge className={ESTADO_COLORS[t.estado] || ''}>{t.estado}</Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-base font-medium flex items-center gap-2">
            <FlaskConical className="w-4 h-4" /> Últimos resultados
          </CardTitle>
          <a href="/cliente/resultados" className="text-sm text-muted-foreground hover:underline flex items-center gap-1">
            Ver todos <ArrowRight className="w-3 h-3" />
          </a>
        </CardHeader>
        <CardContent>
          {!resultadosData?.ordenes?.length ? (
            <p className="text-sm text-muted-foreground">No hay resultados disponibles</p>
          ) : (
            <div className="space-y-2">
              {resultadosData.ordenes.map((o: any) => (
                <a key={o.id} href={`/cliente/resultados/${o.id}`} className="flex items-center justify-between py-2 border-b last:border-0 hover:bg-gray-50 -mx-2 px-2 rounded">
                  <div>
                    <p className="text-sm font-medium">Orden #{o.numero}</p>
                    <p className="text-xs text-muted-foreground">{o.paciente_nombre} - {o.fecha}</p>
                  </div>
                  <Badge className={ESTADO_COLORS[o.estado] || ''}>{o.estado}</Badge>
                </a>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {session.scope === 'full' && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-base font-medium flex items-center gap-2">
              <FileText className="w-4 h-4" /> Presupuestos pendientes
            </CardTitle>
            <a href="/cliente/presupuestos" className="text-sm text-muted-foreground hover:underline flex items-center gap-1">
              Ver todos <ArrowRight className="w-3 h-3" />
            </a>
          </CardHeader>
          <CardContent>
            {!presupuestosData?.presupuestos?.length ? (
              <p className="text-sm text-muted-foreground">No hay presupuestos pendientes</p>
            ) : (
              <div className="space-y-2">
                {presupuestosData.presupuestos.map((p: any) => (
                  <a key={p.id} href={`/cliente/presupuestos/${p.id}`} className="flex items-center justify-between py-2 border-b last:border-0 hover:bg-gray-50 -mx-2 px-2 rounded">
                    <div>
                      <p className="text-sm font-medium">{p.titulo || `Presupuesto #${p.numero}`}</p>
                      <p className="text-xs text-muted-foreground">{p.fecha}</p>
                    </div>
                    <span className="text-sm font-medium">${Number(p.total).toLocaleString()}</span>
                  </a>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
