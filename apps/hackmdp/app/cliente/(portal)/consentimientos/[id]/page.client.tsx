'use client'

import { useState, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import useSWR from 'swr'
import { ArrowLeft, Check, X, Pen, FileCheck } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

const fetcher = (url: string) => fetch(url).then(r => r.json())

const ESTADO_BADGE: Record<string, { label: string; class: string }> = {
  pendiente: { label: 'Pendiente', class: 'bg-gray-100 text-gray-800' },
  enviado: { label: 'Nuevo', class: 'bg-blue-100 text-blue-800' },
  visto: { label: 'Por firmar', class: 'bg-amber-100 text-amber-800' },
  firmado: { label: 'Firmado', class: 'bg-green-100 text-green-800' },
  rechazado: { label: 'Rechazado', class: 'bg-red-100 text-red-800' },
}

const TIPO_LABELS: Record<string, string> = {
  cirugia: 'Cirugia',
  anestesia: 'Anestesia',
  tratamiento: 'Tratamiento',
  eutanasia: 'Eutanasia',
  otro: 'Otro',
}

function SignaturePad({ onSave, onCancel }: { onSave: (data: string) => void; onCancel: () => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const isDrawing = useRef(false)

  const startDraw = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current
    if (!canvas) return
    isDrawing.current = true
    const ctx = canvas.getContext('2d')!
    const rect = canvas.getBoundingClientRect()
    const x = ('touches' in e ? e.touches[0].clientX : e.clientX) - rect.left
    const y = ('touches' in e ? e.touches[0].clientY : e.clientY) - rect.top
    ctx.beginPath()
    ctx.moveTo(x, y)
  }, [])

  const draw = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing.current) return
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')!
    const rect = canvas.getBoundingClientRect()
    const x = ('touches' in e ? e.touches[0].clientX : e.clientX) - rect.left
    const y = ('touches' in e ? e.touches[0].clientY : e.clientY) - rect.top
    ctx.lineTo(x, y)
    ctx.stroke()
  }, [])

  const endDraw = useCallback(() => { isDrawing.current = false }, [])

  const clear = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    canvas.getContext('2d')!.clearRect(0, 0, canvas.width, canvas.height)
  }, [])

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">Dibuja tu firma:</p>
      <canvas
        ref={canvasRef}
        width={400}
        height={150}
        className="border rounded-md w-full touch-none bg-white cursor-crosshair"
        onMouseDown={startDraw}
        onMouseMove={draw}
        onMouseUp={endDraw}
        onMouseLeave={endDraw}
        onTouchStart={startDraw}
        onTouchMove={draw}
        onTouchEnd={endDraw}
      />
      <div className="flex gap-2">
        <Button size="sm" variant="outline" onClick={clear}>Limpiar</Button>
        <Button size="sm" onClick={() => {
          const canvas = canvasRef.current
          if (canvas) onSave(canvas.toDataURL('image/png'))
        }}>
          <Check className="w-4 h-4 mr-1" /> Confirmar firma
        </Button>
        <Button size="sm" variant="ghost" onClick={onCancel}>Cancelar</Button>
      </div>
    </div>
  )
}

export default function ConsentimientoDetailClient({ consentimientoId }: { consentimientoId: string }) {
  const router = useRouter()
  const { data, error, mutate } = useSWR(`/cliente/api/consentimientos/${consentimientoId}`, fetcher)
  const [showSignature, setShowSignature] = useState(false)
  const [showReject, setShowReject] = useState(false)
  const [firmaNombre, setFirmaNombre] = useState('')
  const [motivoRechazo, setMotivoRechazo] = useState('')
  const [loading, setLoading] = useState(false)

  if (error) return <p className="text-red-500">Error al cargar</p>
  if (!data) return <p className="text-muted-foreground">Cargando...</p>

  const c = data.consentimiento
  const badge = ESTADO_BADGE[c.estado] || { label: c.estado, class: '' }
  const canSign = ['enviado', 'visto'].includes(c.estado)

  async function handleSign(firma_imagen: string) {
    if (!firmaNombre.trim()) return
    setLoading(true)
    try {
      await fetch(`/cliente/api/consentimientos/${consentimientoId}/firmar`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accion: 'firmar', firma_nombre: firmaNombre, firma_imagen }),
      })
      mutate()
      setShowSignature(false)
    } finally {
      setLoading(false)
    }
  }

  async function handleReject() {
    setLoading(true)
    try {
      await fetch(`/cliente/api/consentimientos/${consentimientoId}/firmar`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accion: 'rechazar', motivo_rechazo: motivoRechazo }),
      })
      mutate()
      setShowReject(false)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6 pb-20 md:pb-0 max-w-2xl">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={() => router.back()}>
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold">{c.titulo}</h1>
          <p className="text-sm text-muted-foreground">
            {TIPO_LABELS[c.tipo] || c.tipo} - {new Date(c.created_at).toLocaleDateString('es-AR')}
          </p>
        </div>
        <Badge className={badge.class}>{badge.label}</Badge>
      </div>

      {c.paciente_nombre && (
        <p className="text-sm text-muted-foreground">
          Paciente: <span className="font-medium">{c.paciente_nombre}</span>
          {c.paciente_especie && ` (${c.paciente_especie})`}
        </p>
      )}

      {c.veterinario_nombre && (
        <p className="text-sm text-muted-foreground">
          Veterinario/a: <span className="font-medium">{c.veterinario_nombre}</span>
        </p>
      )}

      {/* Consent document */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <FileCheck className="w-4 h-4" /> Documento de consentimiento
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="prose prose-sm max-w-none whitespace-pre-wrap text-sm leading-relaxed">
            {c.contenido}
          </div>
        </CardContent>
      </Card>

      {/* Signature flow */}
      {canSign && !showSignature && !showReject && (
        <div className="flex gap-3">
          <Button className="flex-1" onClick={() => setShowSignature(true)}>
            <Pen className="w-4 h-4 mr-2" /> Firmar consentimiento
          </Button>
          <Button variant="outline" className="text-red-600" onClick={() => setShowReject(true)}>
            <X className="w-4 h-4 mr-2" /> Rechazar
          </Button>
        </div>
      )}

      {showSignature && (
        <Card>
          <CardContent className="pt-4 space-y-4">
            <div className="space-y-2">
              <Label>Nombre completo</Label>
              <Input
                value={firmaNombre}
                onChange={(e) => setFirmaNombre(e.target.value)}
                placeholder="Tu nombre completo como firma"
              />
            </div>
            <SignaturePad onSave={handleSign} onCancel={() => setShowSignature(false)} />
          </CardContent>
        </Card>
      )}

      {showReject && (
        <Card>
          <CardContent className="pt-4 space-y-3">
            <div className="space-y-2">
              <Label>Motivo del rechazo (opcional)</Label>
              <Input
                value={motivoRechazo}
                onChange={(e) => setMotivoRechazo(e.target.value)}
                placeholder="Por que rechazas este consentimiento?"
              />
            </div>
            <div className="flex gap-2">
              <Button variant="destructive" onClick={handleReject} disabled={loading}>
                Confirmar rechazo
              </Button>
              <Button variant="ghost" onClick={() => setShowReject(false)}>Cancelar</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {c.firmado && (
        <Card className="border-green-200 bg-green-50">
          <CardContent className="py-4 text-center text-green-800">
            <Check className="w-6 h-6 mx-auto mb-2" />
            <p className="font-medium">Consentimiento firmado</p>
            {c.firma_nombre && <p className="text-sm">Por: {c.firma_nombre}</p>}
            {c.fecha_firma && (
              <p className="text-sm">El {new Date(c.fecha_firma).toLocaleDateString('es-AR')}</p>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
