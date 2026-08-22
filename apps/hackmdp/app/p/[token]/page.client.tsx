'use client'

import { useState } from 'react'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Badge,
  Button,
  Textarea,
  Collapsible,
  CollapsibleTrigger,
  CollapsibleContent,
  SignaturePad,
  type SignatureData,
} from '@locus/ui'
import { CheckCircle, XCircle, ChevronDown } from 'lucide-react'

interface DocumentData {
  tipo: string
  id: number
  numero?: string
  titulo?: string
  descripcion?: string
  contenido?: string
  subtotal?: number
  descuento?: number
  impuestos?: number
  total?: number
  fecha_emision?: string
  fecha_vencimiento?: string
  condiciones?: string
  estado: string
  firmado: boolean
  fecha_firma?: string
  firma_nombre?: string
  firma_imagen?: string
  motivo_rechazo?: string
  cliente?: {
    nombre?: string
    apellido?: string
    nombre_fantasia?: string
    email?: string
    direccion?: string
  }
  paciente?: {
    nombre?: string
    especie?: string
    raza?: string
  }
  items?: Array<{
    descripcion: string
    cantidad: number
    precio_unitario: number
    subtotal: number
    tipo?: string
    es_opcional?: boolean
    incluido_en_precio?: boolean
    imagen_url?: string | null
  }>
  moneda?: string
  incluye_instalacion?: boolean
  incluye_capacitacion?: boolean
  forma_pago?: string
  tiempo_entrega?: string
  garantia?: string
}

type ViewState = 'idle' | 'signing' | 'done' | 'rejected' | 'error'

export function PublicSignClient({ token, data }: { token: string; data: DocumentData }) {
  const [state, setState] = useState<ViewState>('idle')
  const [errorMsg, setErrorMsg] = useState('')
  const [motivoRechazo, setMotivoRechazo] = useState('')
  const [rejectOpen, setRejectOpen] = useState(false)

  const isAlreadySigned = data.firmado || data.estado === 'aceptado' || data.estado === 'firmado'
  const isRejected = data.estado === 'rechazado'
  const showSignedBanner = isAlreadySigned || state === 'done'
  const showRejectedBanner = isRejected || state === 'rejected'
  const showActions = !isAlreadySigned && !isRejected && state !== 'done' && state !== 'rejected'

  async function handleSign(signatureData: SignatureData) {
    setState('signing')
    setErrorMsg('')
    try {
      const accion = data.tipo === 'vet_consentimiento' ? 'firmar' : 'aceptar'
      const res = await fetch(`/api/firma-publica/${token}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          accion,
          firma_nombre: signatureData.firma_nombre,
          firma_imagen: signatureData.firma_imagen,
        }),
      })

      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Error al firmar')
      }

      setState('done')
    } catch (err: any) {
      setErrorMsg(err.message || 'Error al firmar el documento')
      setState('error')
    }
  }

  async function handleReject() {
    setState('signing')
    setErrorMsg('')
    try {
      const res = await fetch(`/api/firma-publica/${token}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          accion: 'rechazar',
          motivo_rechazo: motivoRechazo,
        }),
      })

      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Error al rechazar')
      }

      setState('rejected')
    } catch (err: any) {
      setErrorMsg(err.message || 'Error al rechazar el documento')
      setState('error')
    }
  }

  function formatCurrency(value: number | undefined, moneda?: string) {
    if (value == null) return '-'
    const currency = moneda === 'USD' ? 'USD' : 'ARS'
    return new Intl.NumberFormat('es-AR', { style: 'currency', currency }).format(value)
  }

  const clienteName =
    data.cliente?.nombre_fantasia ||
    [data.cliente?.nombre, data.cliente?.apellido].filter(Boolean).join(' ') ||
    'Cliente'

  return (
    <div className="space-y-6">
      {/* Signed banner */}
      {showSignedBanner && (
        <div className="rounded-md border border-green-200 bg-green-50 p-4 text-center space-y-2">
          <CheckCircle className="mx-auto h-10 w-10 text-green-500" />
          <h2 className="text-lg font-semibold text-green-800">Documento firmado</h2>
          {data.firma_nombre && data.fecha_firma && (
            <p className="text-xs text-green-700">
              Firmado por {data.firma_nombre} el{' '}
              {new Date(data.fecha_firma).toLocaleDateString('es-AR', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              })}
            </p>
          )}
          {data.firma_imagen && (
            <div className="flex justify-center pt-1">
              <img src={data.firma_imagen} alt="Firma" className="max-w-[240px] border rounded bg-white" />
            </div>
          )}
        </div>
      )}

      {/* Rejected banner */}
      {showRejectedBanner && (
        <div className="rounded-md border border-red-200 bg-red-50 p-4 text-center space-y-2">
          <XCircle className="mx-auto h-10 w-10 text-red-500" />
          <h2 className="text-lg font-semibold text-red-800">Documento rechazado</h2>
          {data.motivo_rechazo && (
            <p className="text-xs text-red-700">Motivo: {data.motivo_rechazo}</p>
          )}
        </div>
      )}

      {/* Document Card */}
      {data.tipo === 'presupuesto_venta' && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-xl">{data.titulo || 'Presupuesto'}</CardTitle>
              <Badge variant="secondary">Presupuesto</Badge>
            </div>
            {data.numero && (
              <p className="text-sm text-muted-foreground">N.{data.numero}</p>
            )}
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">Para: {clienteName}</p>
            {data.descripcion && <p className="text-sm">{data.descripcion}</p>}
            {data.items && data.items.length > 0 && (
              <div className="border rounded-md overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50">
                    <tr>
                      <th className="text-left p-2">Descripcion</th>
                      <th className="text-right p-2">Cant.</th>
                      <th className="text-right p-2">P. Unit.</th>
                      <th className="text-right p-2">Subtotal</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.items.map((item, i) => (
                      <tr key={i} className="border-t">
                        <td className="p-2">{item.descripcion}</td>
                        <td className="text-right p-2">{item.cantidad}</td>
                        <td className="text-right p-2">{formatCurrency(item.precio_unitario)}</td>
                        <td className="text-right p-2">{formatCurrency(item.subtotal)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            <div className="flex justify-end">
              <div className="text-right space-y-1">
                {data.subtotal != null && (
                  <p className="text-sm">Subtotal: {formatCurrency(data.subtotal)}</p>
                )}
                {data.descuento != null && data.descuento > 0 && (
                  <p className="text-sm">Descuento: -{formatCurrency(data.descuento)}</p>
                )}
                {data.impuestos != null && data.impuestos > 0 && (
                  <p className="text-sm">IVA: {formatCurrency(data.impuestos)}</p>
                )}
                <p className="text-lg font-bold">Total: {formatCurrency(data.total)}</p>
              </div>
            </div>
            {data.condiciones && (
              <div className="pt-4 border-t">
                <p className="text-xs font-medium text-muted-foreground mb-1">Terminos y condiciones</p>
                <p className="text-xs text-muted-foreground whitespace-pre-wrap">{data.condiciones}</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {data.tipo === 'presupuesto_equipo' && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-xl">{data.titulo || 'Presupuesto de Equipamiento'}</CardTitle>
              <Badge variant="secondary">Equipamiento</Badge>
            </div>
            {data.numero && (
              <p className="text-sm text-muted-foreground">N° {data.numero}</p>
            )}
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">Para: {clienteName}</p>
            {data.descripcion && <p className="text-sm whitespace-pre-wrap">{data.descripcion}</p>}

            {data.items && data.items.length > 0 && (
              <div className="border rounded-md overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50">
                    <tr>
                      <th className="text-left p-2">Equipo / Item</th>
                      <th className="text-right p-2">Cant.</th>
                      <th className="text-right p-2">Subtotal</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.items.map((item, i) => (
                      <tr key={i} className="border-t">
                        <td className="p-2">
                          <div className="flex items-center gap-2">
                            {item.imagen_url && (
                              <img
                                src={item.imagen_url}
                                alt=""
                                className="h-10 w-10 object-cover rounded border"
                              />
                            )}
                            <div>
                              <span>{item.descripcion}</span>
                              {item.es_opcional && (
                                <Badge variant="outline" className="ml-2 text-xs">Opcional</Badge>
                              )}
                              {item.incluido_en_precio && (
                                <Badge variant="outline" className="ml-2 text-xs">Incluido</Badge>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="text-right p-2 align-middle">{item.cantidad}</td>
                        <td className="text-right p-2 align-middle">
                          {item.incluido_en_precio ? '—' : formatCurrency(item.subtotal, data.moneda)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {(data.incluye_instalacion || data.incluye_capacitacion) && (
              <div className="text-sm">
                <p className="font-medium text-muted-foreground mb-1">Qué incluye</p>
                <ul className="list-disc list-inside space-y-0.5 text-muted-foreground">
                  {data.incluye_instalacion && <li>Instalación</li>}
                  {data.incluye_capacitacion && <li>Capacitación</li>}
                </ul>
              </div>
            )}

            {(data.forma_pago || data.tiempo_entrega || data.garantia) && (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                {data.forma_pago && (
                  <div>
                    <p className="font-medium text-muted-foreground">Forma de pago</p>
                    <p>{data.forma_pago}</p>
                  </div>
                )}
                {data.tiempo_entrega && (
                  <div>
                    <p className="font-medium text-muted-foreground">Tiempo de entrega</p>
                    <p>{data.tiempo_entrega}</p>
                  </div>
                )}
                {data.garantia && (
                  <div>
                    <p className="font-medium text-muted-foreground">Garantía</p>
                    <p>{data.garantia}</p>
                  </div>
                )}
              </div>
            )}

            <div className="flex justify-end">
              <div className="text-right space-y-1">
                {data.subtotal != null && (
                  <p className="text-sm">Subtotal: {formatCurrency(data.subtotal, data.moneda)}</p>
                )}
                {data.descuento != null && data.descuento > 0 && (
                  <p className="text-sm">Descuento: -{formatCurrency(data.descuento, data.moneda)}</p>
                )}
                {data.impuestos != null && data.impuestos > 0 && (
                  <p className="text-sm">IVA: {formatCurrency(data.impuestos, data.moneda)}</p>
                )}
                <p className="text-lg font-bold">Inversión total: {formatCurrency(data.total, data.moneda)}</p>
              </div>
            </div>

            {data.condiciones && (
              <div className="pt-4 border-t">
                <p className="text-xs font-medium text-muted-foreground mb-1">Términos y condiciones</p>
                <p className="text-xs text-muted-foreground whitespace-pre-wrap">{data.condiciones}</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {data.tipo === 'vet_presupuesto' && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-xl">{data.titulo || 'Presupuesto Veterinario'}</CardTitle>
              <Badge className="bg-emerald-100 text-emerald-800 hover:bg-emerald-100">
                Presupuesto Veterinario
              </Badge>
            </div>
            {data.numero && (
              <p className="text-sm text-muted-foreground">N.{data.numero}</p>
            )}
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-col gap-1 text-sm text-muted-foreground">
              <p>Cliente: {clienteName}</p>
              {data.paciente?.nombre && (
                <p>
                  Paciente: {data.paciente.nombre}
                  {data.paciente.especie && ` (${data.paciente.especie}`}
                  {data.paciente.raza && ` - ${data.paciente.raza}`}
                  {data.paciente.especie && ')'}
                </p>
              )}
            </div>
            {data.descripcion && <p className="text-sm">{data.descripcion}</p>}
            {data.items && data.items.length > 0 && (
              <div className="border rounded-md overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50">
                    <tr>
                      <th className="text-left p-2">Descripcion</th>
                      <th className="text-right p-2">Cant.</th>
                      <th className="text-right p-2">P. Unit.</th>
                      <th className="text-right p-2">Subtotal</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.items.map((item, i) => (
                      <tr key={i} className="border-t">
                        <td className="p-2">{item.descripcion}</td>
                        <td className="text-right p-2">{item.cantidad}</td>
                        <td className="text-right p-2">{formatCurrency(item.precio_unitario)}</td>
                        <td className="text-right p-2">{formatCurrency(item.subtotal)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            <div className="flex justify-end">
              <div className="text-right space-y-1">
                {data.subtotal != null && (
                  <p className="text-sm">Subtotal: {formatCurrency(data.subtotal)}</p>
                )}
                {data.descuento != null && data.descuento > 0 && (
                  <p className="text-sm">Descuento: -{formatCurrency(data.descuento)}</p>
                )}
                {data.impuestos != null && data.impuestos > 0 && (
                  <p className="text-sm">IVA: {formatCurrency(data.impuestos)}</p>
                )}
                <p className="text-lg font-bold">Total: {formatCurrency(data.total)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {data.tipo === 'vet_consentimiento' && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-xl">{data.titulo || 'Consentimiento Informado'}</CardTitle>
              <Badge className="bg-rose-100 text-rose-800 hover:bg-rose-100">
                Consentimiento
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-col gap-1 text-sm text-muted-foreground">
              <p>Cliente: {clienteName}</p>
              {data.paciente?.nombre && (
                <p>
                  Paciente: {data.paciente.nombre}
                  {data.paciente.especie && ` (${data.paciente.especie}`}
                  {data.paciente.raza && ` - ${data.paciente.raza}`}
                  {data.paciente.especie && ')'}
                </p>
              )}
            </div>
            {data.contenido && (
              <div className="prose prose-sm max-w-none">
                <div className="whitespace-pre-wrap text-sm">{data.contenido}</div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Error state */}
      {state === 'error' && (
        <div className="rounded-md border border-red-200 bg-red-50 p-4 text-center">
          <p className="text-sm text-red-700">{errorMsg}</p>
          <Button
            variant="outline"
            size="sm"
            className="mt-2"
            onClick={() => setState('idle')}
          >
            Intentar de nuevo
          </Button>
        </div>
      )}

      {/* Signature Pad */}
      {showActions && (state === 'idle' || state === 'error') && (
        <Card>
          <CardHeader>
            <CardTitle>Firma</CardTitle>
          </CardHeader>
          <CardContent>
            <SignaturePad
              onSign={handleSign}
              disabled={false}
              loading={false}
            />
          </CardContent>
        </Card>
      )}

      {/* Reject section */}
      {showActions && (state === 'idle' || state === 'error') && (
        <Collapsible open={rejectOpen} onOpenChange={setRejectOpen}>
          <CollapsibleTrigger asChild>
            <Button variant="ghost" className="w-full text-muted-foreground">
              <ChevronDown
                className={`mr-2 h-4 w-4 transition-transform ${rejectOpen ? 'rotate-180' : ''}`}
              />
              Rechazar documento
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <Card className="mt-2 border-red-200">
              <CardContent className="pt-4 space-y-4">
                <Textarea
                  placeholder="Motivo del rechazo (opcional)"
                  value={motivoRechazo}
                  onChange={(e) => setMotivoRechazo(e.target.value)}
                />
                <Button
                  variant="destructive"
                  className="w-full"
                  onClick={handleReject}
                  disabled={false}
                >
                  Confirmar rechazo
                </Button>
              </CardContent>
            </Card>
          </CollapsibleContent>
        </Collapsible>
      )}
    </div>
  )
}
