'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import useSWR from 'swr'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Calendar } from '@/components/ui/calendar'
import { ArrowLeft, CalendarPlus, CheckCircle2, Clock } from 'lucide-react'

const fetcher = (url: string) => fetch(url).then(r => r.json())

export default function NuevoTurnoClient({ orgTheme }: { orgTheme: string }) {
  const router = useRouter()
  const [selectedDate, setSelectedDate] = useState<Date | undefined>()
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null)
  const [tipo, setTipo] = useState('')
  const [motivo, setMotivo] = useState('')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)

  const fecha = selectedDate ? selectedDate.toISOString().split('T')[0] : null

  const { data: dispData } = useSWR(
    fecha ? `/cliente/api/turnos/disponibilidad?fecha=${fecha}` : null,
    fetcher
  )

  const slots = dispData?.slots || []
  const config = dispData?.config
  const tipos = config?.tipos_habilitados || []

  async function handleSubmit() {
    if (!fecha || !selectedSlot || !tipo) return
    setLoading(true)

    try {
      const res = await fetch('/cliente/api/turnos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tipo, fecha, hora_inicio: selectedSlot, motivo: motivo || undefined }),
      })

      if (res.ok) {
        setSuccess(true)
        setTimeout(() => router.push('/cliente/turnos'), 2000)
      }
    } finally {
      setLoading(false)
    }
  }

  if (success && fecha && selectedSlot && tipo) {
    const dur = config?.duracion_default || 30
    const [y, m, d] = fecha.split('-')
    const [hh, mm] = selectedSlot.split(':')
    const calStart = `${y}${m}${d}T${hh}${mm}00`
    const endDate = new Date(`${fecha}T${selectedSlot}:00`)
    endDate.setMinutes(endDate.getMinutes() + dur)
    const calEnd = `${endDate.getFullYear()}${String(endDate.getMonth() + 1).padStart(2, '0')}${String(endDate.getDate()).padStart(2, '0')}T${String(endDate.getHours()).padStart(2, '0')}${String(endDate.getMinutes()).padStart(2, '0')}00`
    const calParams = new URLSearchParams({
      action: 'TEMPLATE',
      text: `Turno: ${tipo}`,
      dates: `${calStart}/${calEnd}`,
    })
    if (motivo) calParams.set('details', motivo)
    const calUrl = `https://calendar.google.com/calendar/render?${calParams.toString()}`

    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Card className="w-full max-w-sm text-center">
          <CardContent className="pt-6 space-y-4">
            <CheckCircle2 className="w-12 h-12 text-green-500 mx-auto" />
            <h2 className="text-xl font-bold">Turno solicitado</h2>
            <p className="text-muted-foreground">
              {config?.modo === 'self_service'
                ? 'Tu turno fue confirmado.'
                : 'Te avisaremos cuando sea confirmado.'}
            </p>
            <Button variant="outline" asChild className="w-full">
              <a href={calUrl} target="_blank" rel="noopener noreferrer">
                <CalendarPlus className="w-4 h-4 mr-2" /> Agregar a Google Calendar
              </a>
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6 pb-20 md:pb-0 max-w-lg">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={() => router.push('/cliente/turnos')}>
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <h1 className="text-2xl font-bold">Pedir turno</h1>
      </div>

      {/* Step 1: Date */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">1. Elegí una fecha</CardTitle>
        </CardHeader>
        <CardContent className="flex justify-center">
          <Calendar
            mode="single"
            selected={selectedDate}
            onSelect={(d) => { setSelectedDate(d); setSelectedSlot(null) }}
            disabled={(d) => d < new Date(new Date().setHours(0, 0, 0, 0))}
          />
        </CardContent>
      </Card>

      {/* Step 2: Slot */}
      {fecha && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">2. Elegí un horario</CardTitle>
          </CardHeader>
          <CardContent>
            {slots.length === 0 ? (
              <p className="text-sm text-muted-foreground">No hay turnos disponibles para esta fecha</p>
            ) : (
              <div className="grid grid-cols-4 gap-2">
                {slots.map((s: any) => (
                  <Button
                    key={s.hora}
                    variant={selectedSlot === s.hora ? 'default' : 'outline'}
                    size="sm"
                    disabled={!s.disponible}
                    onClick={() => setSelectedSlot(s.hora)}
                    className="text-xs"
                  >
                    <Clock className="w-3 h-3 mr-1" />
                    {s.hora}
                  </Button>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Step 3: Type + Motivo */}
      {selectedSlot && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">3. Detalles</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Tipo de turno</Label>
              {tipos.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {tipos.map((t: string) => (
                    <Button
                      key={t}
                      variant={tipo === t ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setTipo(t)}
                      className="capitalize"
                    >
                      {t}
                    </Button>
                  ))}
                </div>
              ) : (
                <Input
                  value={tipo}
                  onChange={(e) => setTipo(e.target.value)}
                  placeholder="Ej: consulta, peluquería..."
                />
              )}
            </div>
            <div className="space-y-2">
              <Label>Motivo (opcional)</Label>
              <Input
                value={motivo}
                onChange={(e) => setMotivo(e.target.value)}
                placeholder="¿Por qué necesitás el turno?"
              />
            </div>
            <Button className="w-full" onClick={handleSubmit} disabled={loading || !tipo}>
              {loading ? 'Solicitando...' : 'Solicitar turno'}
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
