'use client'

import { useState, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import useSWR from 'swr'
import { ArrowLeft, Check, X, Pen } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

const fetcher = (url: string) => fetch(url).then(r => r.json())

const ESTADO_BADGE: Record<string, { label: string; class: string }> = {
  enviado: { label: 'Nuevo', class: 'bg-blue-100 text-blue-800' },
  visto: { label: 'Pendiente', class: 'bg-amber-100 text-amber-800' },
  aceptado: { label: 'Aceptado', class: 'bg-green-100 text-green-800' },
  rechazado: { label: 'Rechazado', class: 'bg-red-100 text-red-800' },
  vencido: { label: 'Vencido', class: 'bg-gray-100 text-gray-800' },
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
    const ctx = canvas.getContext('2d')!
    ctx.clearRect(0, 0, canvas.width, canvas.height)
  }, [])

  const save = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    onSave(canvas.toDataURL('image/png'))
  }, [onSave])

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
        <Button size="sm" onClick={save}><Check className="w-4 h-4 mr-1" /> Confirmar firma</Button>
        <Button size="sm" variant="ghost" onClick={onCancel}>Cancelar</Button>
      </div>
    </div>
  )
}

export default function PresupuestoDetailClient({ presupuestoId }: { presupuestoId: string }) {
  const router = useRouter()
  const { data, error } = useSWR(`/cliente/api/presupuestos/${presupuestoId}`, fetcher)
  const [showSignature, setShowSignature] = useState(false)
  const [showReject, setShowReject] = useState(false)
  const [motivoRechazo, setMotivoRechazo] = useState('')
  const [loading, setLoading] = useState(false)

  if (error) return <p className="text-red-500">Error al cargar</p>
  if (!data) return <p className="text-muted-foreground">Cargando...</p>

  const { presupuesto: p, items } = data
  const badge = ESTADO_BADGE[p.estado] || { label: p.estado, class: '' }
  const canSign = ['enviado', 'visto'].includes(p.estado)

  async function handleAccept(firma_imagen: string) {
    setLoading(true)
    try {
      await fetch(`/cliente/api/presupuestos/${presupuestoId}/firmar`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accion: 'aceptar', firma_imagen }),
      })
      router.refresh()
      setShowSignature(false)
    } finally {
      setLoading(false)
    }
  }

  async function handleReject() {
    setLoading(true)
    try {
      await fetch(`/cliente/api/presupuestos/${presupuestoId}/firmar`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accion: 'rechazar', motivo_rechazo: motivoRechazo }),
      })
      router.refresh()
      setShowReject(false)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6 pb-20 md:pb-0 max-w-2xl">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={() => router.push('/cliente/presupuestos')}>
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold">{p.titulo || p.numero}</h1>
          <p className="text-sm text-muted-foreground">
            {p.numero} - {new Date(p.created_at).toLocaleDateString('es-AR')}
          </p>
        </div>
        <Badge className={badge.class}>{badge.label}</Badge>
      </div>

      {p.paciente_nombre && (
        <p className="text-sm text-muted-foreground">
          Paciente: <span className="font-medium">{p.paciente_nombre}</span>
          {p.paciente_especie && ` (${p.paciente_especie})`}
        </p>
      )}

      {/* Items table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-muted-foreground bg-gray-50">
                  <th className="py-3 px-4">Descripcion</th>
                  <th className="py-3 px-4 text-right">Cant.</th>
                  <th className="py-3 px-4 text-right">P. Unit.</th>
                  <th className="py-3 px-4 text-right">Subtotal</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item: any) => (
                  <tr key={item.id} className="border-b last:border-0">
                    <td className="py-3 px-4">
                      <span className="font-medium">{item.descripcion}</span>
                      <span className="text-xs text-muted-foreground ml-2 capitalize">({item.tipo})</span>
                    </td>
                    <td className="py-3 px-4 text-right">{Number(item.cantidad)}</td>
                    <td className="py-3 px-4 text-right">${Number(item.precio_unitario).toLocaleString('es-AR')}</td>
                    <td className="py-3 px-4 text-right font-medium">${Number(item.subtotal).toLocaleString('es-AR')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="border-t p-4 space-y-1">
            {Number(p.descuento_pct) > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Descuento ({p.descuento_pct}%)</span>
                <span>-${((Number(p.subtotal) * Number(p.descuento_pct)) / 100).toLocaleString('es-AR')}</span>
              </div>
            )}
            <div className="flex justify-between text-lg font-bold">
              <span>Total</span>
              <span>${Number(p.total || 0).toLocaleString('es-AR')}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {p.observaciones && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Observaciones</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm whitespace-pre-wrap">{p.observaciones}</p>
          </CardContent>
        </Card>
      )}

      {/* Signature flow */}
      {canSign && !showSignature && !showReject && (
        <div className="flex gap-3">
          <Button className="flex-1" onClick={() => setShowSignature(true)}>
            <Pen className="w-4 h-4 mr-2" /> Aceptar y firmar
          </Button>
          <Button variant="outline" className="text-red-600" onClick={() => setShowReject(true)}>
            <X className="w-4 h-4 mr-2" /> Rechazar
          </Button>
        </div>
      )}

      {showSignature && (
        <Card>
          <CardContent className="pt-4">
            <SignaturePad onSave={handleAccept} onCancel={() => setShowSignature(false)} />
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
                placeholder="Por que rechazas este presupuesto?"
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

      {p.firmado && (
        <Card className="border-green-200 bg-green-50">
          <CardContent className="py-4 text-center text-green-800">
            <Check className="w-6 h-6 mx-auto mb-2" />
            <p className="font-medium">Presupuesto aceptado</p>
            {p.fecha_firma && (
              <p className="text-sm">Firmado el {new Date(p.fecha_firma).toLocaleDateString('es-AR')}</p>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
