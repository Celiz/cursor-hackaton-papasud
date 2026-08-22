'use client'

import { useState } from 'react'
import useSWR from 'swr'
import { Calendar, CalendarPlus, Plus, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

const fetcher = (url: string) => fetch(url).then(r => { if (!r.ok) throw new Error(); return r.json() })

const ESTADO_BADGE: Record<string, { label: string; class: string }> = {
  solicitada: { label: 'Pendiente', class: 'bg-amber-100 text-amber-800' },
  confirmada: { label: 'Confirmado', class: 'bg-green-100 text-green-800' },
  en_curso: { label: 'En curso', class: 'bg-blue-100 text-blue-800' },
  completada: { label: 'Completado', class: 'bg-gray-100 text-gray-800' },
  cancelada: { label: 'Cancelado', class: 'bg-red-100 text-red-800' },
  no_asistio: { label: 'No asistió', class: 'bg-red-100 text-red-800' },
  rechazada: { label: 'Rechazado', class: 'bg-red-100 text-red-800' },
}

function buildGoogleCalendarUrl(turno: { tipo: string; fecha: string; hora_inicio: string; duracion_minutos?: number; motivo?: string; profesional_nombre?: string }) {
  const [y, m, d] = turno.fecha.split('-')
  const [hh, mm] = turno.hora_inicio.split(':')
  const start = `${y}${m}${d}T${hh}${mm}00`

  const dur = turno.duracion_minutos || 30
  const startDate = new Date(`${turno.fecha}T${turno.hora_inicio}`)
  const endDate = new Date(startDate.getTime() + dur * 60000)
  const end = `${endDate.getFullYear()}${String(endDate.getMonth() + 1).padStart(2, '0')}${String(endDate.getDate()).padStart(2, '0')}T${String(endDate.getHours()).padStart(2, '0')}${String(endDate.getMinutes()).padStart(2, '0')}00`

  const details = [turno.motivo, turno.profesional_nombre ? `Prof: ${turno.profesional_nombre}` : ''].filter(Boolean).join('\n')

  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: `Turno: ${turno.tipo}`,
    dates: `${start}/${end}`,
  })
  if (details) params.set('details', details)

  return `https://calendar.google.com/calendar/render?${params.toString()}`
}

export default function TurnosClient({ orgTheme }: { orgTheme: string }) {
  const [tab, setTab] = useState<'proximos' | 'historial'>('proximos')
  const today = new Date().toISOString().split('T')[0]

  const { data, mutate } = useSWR(
    tab === 'proximos'
      ? `/cliente/api/turnos?fecha_desde=${today}&limit=50`
      : `/cliente/api/turnos?fecha_hasta=${today}&limit=50`,
    fetcher
  )

  async function handleCancel(turno_id: string) {
    if (!confirm('¿Cancelar este turno?')) return
    await fetch('/cliente/api/turnos', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ turno_id, accion: 'cancelar' }),
    })
    mutate()
  }

  const turnos = data?.turnos || []

  return (
    <div className="space-y-4 pb-20 md:pb-0">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Mis turnos</h1>
        <Button asChild>
          <a href="/cliente/turnos/nuevo">
            <Plus className="w-4 h-4 mr-2" /> Pedir turno
          </a>
        </Button>
      </div>

      <div className="flex gap-2">
        <Button
          variant={tab === 'proximos' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setTab('proximos')}
        >
          Próximos
        </Button>
        <Button
          variant={tab === 'historial' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setTab('historial')}
        >
          Historial
        </Button>
      </div>

      {turnos.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            <Calendar className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p>{tab === 'proximos' ? 'No tenés turnos próximos' : 'No hay turnos anteriores'}</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {turnos.map((t: any) => {
            const badge = ESTADO_BADGE[t.estado] || { label: t.estado, class: '' }
            const canCancel = ['solicitada', 'confirmada'].includes(t.estado)
            const canAddToCalendar = ['solicitada', 'confirmada', 'en_curso'].includes(t.estado)
            return (
              <Card key={t.id}>
                <CardContent className="flex items-center justify-between p-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium capitalize">{t.tipo}</span>
                      <Badge className={badge.class}>{badge.label}</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {new Date(t.fecha + 'T12:00:00').toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' })} - {t.hora_inicio.slice(0, 5)}
                    </p>
                    {t.motivo && <p className="text-sm text-muted-foreground">{t.motivo}</p>}
                    {t.profesional_nombre && (
                      <p className="text-xs text-muted-foreground">Prof: {t.profesional_nombre}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-1">
                    {canAddToCalendar && (
                      <Button variant="ghost" size="sm" asChild>
                        <a href={buildGoogleCalendarUrl(t)} target="_blank" rel="noopener noreferrer" title="Agregar a Google Calendar">
                          <CalendarPlus className="w-4 h-4" />
                        </a>
                      </Button>
                    )}
                    {canCancel && (
                      <Button variant="ghost" size="sm" className="text-red-600" onClick={() => handleCancel(t.id)}>
                        <X className="w-4 h-4 mr-1" /> Cancelar
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
