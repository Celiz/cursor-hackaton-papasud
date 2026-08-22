'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import {
  Sheet, SheetContent, SheetHeader, SheetTitle,
} from '@/components/ui/sheet'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import {
  User, Search, Phone, Mail, Calendar, Package,
  Wrench, FileText, DollarSign, Plus, Loader2, LinkIcon,
  PenTool, X, MessageCircle, ArrowDownLeft, ArrowUpRight,
} from 'lucide-react'
import { toast } from 'sonner'
import Link from 'next/link'
import { CreatePedidoDialog } from '@/components/core-ui/CreatePedidoDialog'
import { CreateServicioDialogWizard } from '@/components/core-ui/CreateServicioDialogWizard'
import { formatCurrency } from '@/lib/format-currency'

// ─── Types ───────────────────────────────────────────────────────

interface ContactPanelSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  personaId?: string | null
  phone?: string
  contactName?: string
  conversationId?: string
  onLinked?: (personaId: string) => void
}

interface PersonaData {
  id: string
  nombre: string
  apellido: string | null
  email: string | null
  telefono: string | null
  direccion: string | null
  ciudad: string | null
  provincia: string | null
  documento_tipo: string | null
  documento_nro: string | null
}

interface OrgContact {
  id: string
  tipo: string | null
  notas: string | null
  condicion_iva: string | null
  cliente_desde: string | null
}

interface SaldoData {
  total_facturado: number
  total_pagado: number
  total_notas_credito: number
  saldo_actual: number
  total_vencido: number
  saldo_a_favor_legal: number
}

interface Pedido {
  id: string
  numero: string
  fecha: string
  estado: string
  total: number
  created_at: string
}

interface Servicio {
  id: string
  descripcion: string
  estado: string
  tecnico: string | null
  created_at: string
  equipo: { marca: string | null; modelo: string | null }
}

interface Factura {
  id: string
  tipo_comprobante: string
  numero_comprobante: string
  fecha_emision: string
  total: number
  estado: string
  created_at: string
}

interface PanelData {
  persona: PersonaData
  org_contact: OrgContact | null
  saldo: SaldoData | null
  pedidos: Pedido[]
  servicios: Servicio[]
  facturas: Factura[]
}

interface SearchResult {
  persona_id: string
  contact_id: string
  nombre: string
  email: string | null
  telefono: string | null
  tipo: string | null
}

// ─── Helpers ─────────────────────────────────────────────────────

const formatDate = (d: string) =>
  new Date(d).toLocaleDateString('es-AR')

function getInitials(nombre: string, apellido?: string | null): string {
  const first = nombre?.charAt(0) || ''
  const last = apellido?.charAt(0) || ''
  return (first + last).toUpperCase() || '?'
}

function estadoBadgeVariant(estado: string): 'default' | 'secondary' | 'success' | 'warning' | 'destructive' | 'info' {
  const lower = estado?.toLowerCase() || ''
  if (['entregado', 'pagado', 'cobrada', 'publicado', 'finalizado'].includes(lower)) return 'success'
  if (['cancelado', 'anulada', 'rechazado'].includes(lower)) return 'destructive'
  if (['pendiente', 'borrador'].includes(lower)) return 'warning'
  if (['en proceso', 'en reparacion', 'programado'].includes(lower)) return 'info'
  return 'secondary'
}

// ─── Sub-components ──────────────────────────────────────────────

function SaldoCard({ saldo }: { saldo: SaldoData | null }) {
  if (!saldo) {
    return (
      <div className="rounded-lg border border-gray-200 p-4 text-center text-sm text-gray-500">
        Sin movimientos de cuenta corriente
      </div>
    )
  }

  const owes = saldo.saldo_actual > 0
  return (
    <div className="rounded-lg border border-gray-200 p-4 space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-sm text-gray-500 flex items-center gap-1.5">
          <DollarSign className="size-3.5" />
          Saldo actual
        </span>
        <span className={`text-lg font-semibold ${owes ? 'text-red-600' : 'text-green-600'}`}>
          {formatCurrency(saldo.saldo_actual)}
        </span>
      </div>
      {saldo.total_vencido > 0 && (
        <div className="flex items-center justify-between text-xs">
          <span className="text-gray-400">Vencido</span>
          <span className="text-red-500 font-medium">{formatCurrency(saldo.total_vencido)}</span>
        </div>
      )}
    </div>
  )
}

function PedidosList({ pedidos }: { pedidos: Pedido[] }) {
  if (pedidos.length === 0) {
    return <EmptyState icon={Package} label="Sin pedidos" />
  }
  return (
    <div className="space-y-2">
      {pedidos.map(p => (
        <Link
          key={p.id}
          href={`/dashboard/pedidos/${p.id}`}
          className="flex items-center justify-between p-3 rounded-lg border border-gray-100 hover:bg-gray-50 transition-colors"
        >
          <div className="min-w-0">
            <div className="text-sm font-medium truncate">{p.numero}</div>
            <div className="text-xs text-gray-500">{formatDate(p.fecha)}</div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Badge variant={estadoBadgeVariant(p.estado)}>{p.estado}</Badge>
            <span className="text-sm font-medium">{formatCurrency(p.total)}</span>
          </div>
        </Link>
      ))}
    </div>
  )
}

function ServiciosList({ servicios }: { servicios: Servicio[] }) {
  if (servicios.length === 0) {
    return <EmptyState icon={Wrench} label="Sin servicios" />
  }
  return (
    <div className="space-y-2">
      {servicios.map(s => (
        <Link
          key={s.id}
          href={`/dashboard/servicios/${s.id}`}
          className="block p-3 rounded-lg border border-gray-100 hover:bg-gray-50 transition-colors"
        >
          <div className="flex items-center justify-between mb-1">
            <span className="text-sm font-medium truncate mr-2">{s.descripcion || 'Sin descripcion'}</span>
            <Badge variant={estadoBadgeVariant(s.estado)}>{s.estado}</Badge>
          </div>
          <div className="flex items-center gap-3 text-xs text-gray-500">
            {(s.equipo?.marca || s.equipo?.modelo) && (
              <span>{[s.equipo.marca, s.equipo.modelo].filter(Boolean).join(' ')}</span>
            )}
            {s.tecnico && <span>Tec: {s.tecnico}</span>}
          </div>
        </Link>
      ))}
    </div>
  )
}

function FacturasList({ facturas }: { facturas: Factura[] }) {
  if (facturas.length === 0) {
    return <EmptyState icon={FileText} label="Sin facturas" />
  }
  return (
    <div className="space-y-2">
      {facturas.map(f => (
        <Link
          key={f.id}
          href={`/dashboard/facturacion/${f.id}`}
          className="flex items-center justify-between p-3 rounded-lg border border-gray-100 hover:bg-gray-50 transition-colors"
        >
          <div className="min-w-0">
            <div className="text-sm font-medium truncate">
              {f.tipo_comprobante} {f.numero_comprobante}
            </div>
            <div className="text-xs text-gray-500">{formatDate(f.fecha_emision)}</div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Badge variant={estadoBadgeVariant(f.estado)}>{f.estado}</Badge>
            <span className="text-sm font-medium">{formatCurrency(f.total)}</span>
          </div>
        </Link>
      ))}
    </div>
  )
}

function EmptyState({ icon: Icon, label }: { icon: typeof Package; label: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-8 text-gray-400">
      <Icon className="size-8 mb-2 stroke-1" />
      <span className="text-sm">{label}</span>
    </div>
  )
}

function LoadingSpinner() {
  return (
    <div className="flex items-center justify-center py-12">
      <Loader2 className="size-6 animate-spin text-gray-400" />
    </div>
  )
}

// ─── Communication Timeline ──────────────────────────────────────

function formatRelativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const min = Math.floor(diff / 60000)
  if (min < 1) return 'Ahora'
  if (min < 60) return `Hace ${min} min`
  const hr = Math.floor(diff / 3600000)
  if (hr < 24) return `Hace ${hr}h`
  const day = Math.floor(diff / 86400000)
  if (day < 7) return `Hace ${day}d`
  return formatDate(iso)
}

interface TimelineItem {
  id: string
  channel: 'whatsapp' | 'email'
  direction: 'entrante' | 'saliente'
  preview: string
  timestamp: string
  waConversationId?: string
  emailThreadId?: string
  emailSubject?: string
  emailUnreadCount?: number
}

function TimelineItemRow({ item }: { item: TimelineItem }) {
  const isWa = item.channel === 'whatsapp'
  const isIncoming = item.direction === 'entrante'
  const DirectionIcon = isIncoming ? ArrowDownLeft : ArrowUpRight

  const content = (
    <div className="flex items-start gap-3 p-3 rounded-lg border border-gray-100 hover:bg-gray-50 transition-colors">
      {/* Channel indicator */}
      <div className={`mt-0.5 size-7 rounded-full flex items-center justify-center shrink-0 ${
        isWa ? 'bg-green-100 text-green-600' : 'bg-blue-100 text-blue-600'
      }`}>
        {isWa ? <MessageCircle className="size-3.5" /> : <Mail className="size-3.5" />}
      </div>

      {/* Content */}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5 mb-0.5">
          <DirectionIcon className={`size-3 shrink-0 ${isIncoming ? 'text-gray-400' : 'text-primary/60'}`} />
          {item.emailSubject && (
            <span className="text-xs font-medium truncate">{item.emailSubject}</span>
          )}
          {item.emailUnreadCount != null && item.emailUnreadCount > 0 && (
            <Badge variant="default" className="text-[10px] px-1 py-0 h-4">{item.emailUnreadCount}</Badge>
          )}
        </div>
        <p className="text-xs text-gray-600 line-clamp-2">{item.preview || '(sin contenido)'}</p>
      </div>

      {/* Timestamp */}
      <span className="text-[10px] text-gray-400 shrink-0 mt-0.5">{formatRelativeTime(item.timestamp)}</span>
    </div>
  )

  if (item.emailThreadId) {
    return (
      <Link href={`/dashboard/email?thread=${item.emailThreadId}`} className="block">
        {content}
      </Link>
    )
  }

  return content
}

function ComunicacionTimeline({ personaId }: { personaId: string }) {
  const [waMessages, setWaMessages] = useState<any[]>([])
  const [emailThreads, setEmailThreads] = useState<any[]>([])
  const [waLoading, setWaLoading] = useState(true)
  const [emailLoading, setEmailLoading] = useState(true)
  const [emailMeta, setEmailMeta] = useState<{ noEmail?: boolean; noAccount?: boolean; error?: string }>({})

  useEffect(() => {
    // Fetch WA messages
    fetch(`/api/contacts/${personaId}/communications/whatsapp`)
      .then(res => res.json())
      .then(data => setWaMessages(data.messages || []))
      .catch(() => setWaMessages([]))
      .finally(() => setWaLoading(false))

    // Fetch email threads
    fetch(`/api/contacts/${personaId}/communications/email`)
      .then(res => res.json())
      .then(data => {
        setEmailThreads(data.threads || [])
        setEmailMeta({ noEmail: data.noEmail, noAccount: data.noAccount, error: data.error })
      })
      .catch(() => setEmailMeta({ error: 'Error cargando emails' }))
      .finally(() => setEmailLoading(false))
  }, [personaId])

  const items = useMemo(() => {
    const timeline: TimelineItem[] = []

    // Map WA messages
    for (const msg of waMessages) {
      timeline.push({
        id: `wa-${msg.id}`,
        channel: 'whatsapp',
        direction: msg.direccion,
        preview: msg.contenido || '',
        timestamp: msg.created_at,
        waConversationId: msg.conversation_id,
      })
    }

    // Map email threads
    for (const thread of emailThreads) {
      timeline.push({
        id: `email-${thread.id}`,
        channel: 'email',
        direction: 'entrante', // threads are shown as incoming by default
        preview: thread.snippet || thread.subject || '',
        timestamp: thread.last_message_at,
        emailThreadId: thread.id,
        emailSubject: thread.subject,
        emailUnreadCount: thread.unread_count,
      })
    }

    // Sort by timestamp DESC
    timeline.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())

    return timeline
  }, [waMessages, emailThreads])

  if (waLoading && emailLoading) return <LoadingSpinner />

  return (
    <div className="space-y-2">
      {/* Email status messages */}
      {emailMeta.noAccount && (
        <div className="rounded-lg bg-blue-50 border border-blue-200 px-3 py-2 text-xs text-blue-700">
          Configura una cuenta de email para ver la correspondencia con este contacto.
        </div>
      )}

      {/* Email loading indicator */}
      {emailLoading && !waLoading && (
        <div className="flex items-center gap-2 text-xs text-gray-400 px-1">
          <Loader2 className="size-3 animate-spin" />
          <span>Cargando emails...</span>
        </div>
      )}

      {/* Timeline items */}
      {items.length > 0 ? (
        items.map(item => <TimelineItemRow key={item.id} item={item} />)
      ) : !waLoading && !emailLoading ? (
        <EmptyState icon={MessageCircle} label="Sin comunicaciones" />
      ) : null}
    </div>
  )
}

// ─── Linked Mode ─────────────────────────────────────────────────

function LinkedPanel({ personaId }: { personaId: string }) {
  const [data, setData] = useState<PanelData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeAction, setActiveAction] = useState<string | null>(null)
  const [notaText, setNotaText] = useState('')
  const [facturaDesc, setFacturaDesc] = useState('')
  const [facturaTotal, setFacturaTotal] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const fetchPanel = useCallback(() => {
    setLoading(true)
    setError(null)

    fetch(`/api/contacts/${personaId}/panel`)
      .then(res => {
        if (!res.ok) throw new Error('Error cargando datos')
        return res.json()
      })
      .then(json => setData(json))
      .catch(err => setError(err.message))
      .finally(() => setLoading(false))
  }, [personaId])

  useEffect(() => {
    fetchPanel()
  }, [fetchPanel])

  if (loading) return <LoadingSpinner />
  if (error || !data) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-gray-400">
        <User className="size-8 mb-2 stroke-1" />
        <span className="text-sm">{error || 'No se encontraron datos'}</span>
      </div>
    )
  }

  const { persona, org_contact, saldo, pedidos, servicios, facturas } = data
  const fullName = [persona.nombre, persona.apellido].filter(Boolean).join(' ')

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-5 py-4 border-b border-gray-100">
        <div className="flex items-center gap-3 mb-3">
          <Avatar className="size-12">
            <AvatarFallback className="bg-primary/10 text-primary text-sm font-medium">
              {getInitials(persona.nombre, persona.apellido)}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <h3 className="text-base font-semibold truncate">{fullName}</h3>
            {org_contact?.tipo && (
              <Badge variant="default" className="mt-0.5">{org_contact.tipo}</Badge>
            )}
          </div>
        </div>
        <div className="space-y-1.5 text-sm text-gray-600">
          {persona.telefono && (
            <div className="flex items-center gap-2">
              <Phone className="size-3.5 text-gray-400 shrink-0" />
              <span className="truncate">{persona.telefono}</span>
            </div>
          )}
          {persona.email && (
            <div className="flex items-center gap-2">
              <Mail className="size-3.5 text-gray-400 shrink-0" />
              <span className="truncate">{persona.email}</span>
            </div>
          )}
          {org_contact?.cliente_desde && (
            <div className="flex items-center gap-2">
              <Calendar className="size-3.5 text-gray-400 shrink-0" />
              <span>Cliente desde {formatDate(org_contact.cliente_desde)}</span>
            </div>
          )}
        </div>
      </div>

      {/* Quick actions */}
      <div className="flex gap-2 px-5 pb-3">
        <Button size="sm" variant="outline" className="text-xs gap-1" onClick={() => setActiveAction(activeAction === 'nota' ? null : 'nota')}>
          <PenTool className="h-3 w-3" /> Nota
        </Button>
        <Button size="sm" variant="outline" className="text-xs gap-1" onClick={() => setActiveAction(activeAction === 'pedido' ? null : 'pedido')}>
          <Package className="h-3 w-3" /> Pedido
        </Button>
        <Button size="sm" variant="outline" className="text-xs gap-1" onClick={() => setActiveAction(activeAction === 'servicio' ? null : 'servicio')}>
          <Wrench className="h-3 w-3" /> Servicio
        </Button>
        <Button size="sm" variant="outline" className="text-xs gap-1" onClick={() => setActiveAction(activeAction === 'factura' ? null : 'factura')}>
          <FileText className="h-3 w-3" /> Factura
        </Button>
      </div>

      {/* Inline nota form */}
      {activeAction === 'nota' && data?.org_contact && (
        <div className="px-5 pb-3 space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-semibold">Nueva nota</h4>
            <Button size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={() => setActiveAction(null)}>
              <X className="h-4 w-4" />
            </Button>
          </div>
          <textarea
            className="w-full border rounded-md p-2 text-sm min-h-[80px] resize-none focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
            placeholder="Escribir nota..."
            value={notaText}
            onChange={(e) => setNotaText(e.target.value)}
          />
          <Button
            size="sm"
            onClick={async () => {
              if (!notaText.trim() || !data.org_contact) return
              setSubmitting(true)
              try {
                const res = await fetch(`/api/clientes/${data.org_contact.id}/notas`, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ contenido: notaText.trim() }),
                })
                if (!res.ok) throw new Error('Error guardando nota')
                toast.success('Nota guardada')
                setNotaText('')
                setActiveAction(null)
                fetchPanel()
              } catch {
                toast.error('Error al guardar la nota')
              } finally {
                setSubmitting(false)
              }
            }}
            disabled={!notaText.trim() || submitting}
          >
            {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Guardar nota'}
          </Button>
        </div>
      )}

      {/* Inline factura IVR form */}
      {activeAction === 'factura' && data?.org_contact && (
        <div className="px-5 pb-3 space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-semibold">Nueva factura (IVR)</h4>
            <Button size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={() => setActiveAction(null)}>
              <X className="h-4 w-4" />
            </Button>
          </div>
          <Input
            placeholder="Descripcion"
            value={facturaDesc}
            onChange={(e) => setFacturaDesc(e.target.value)}
          />
          <Input
            type="number"
            placeholder="Total"
            value={facturaTotal}
            onChange={(e) => setFacturaTotal(e.target.value)}
          />
          <Button
            size="sm"
            onClick={async () => {
              if (!facturaTotal || !data.org_contact) return
              setSubmitting(true)
              try {
                const total = parseFloat(facturaTotal)
                const res = await fetch('/api/facturas', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    cliente_id: data.org_contact.id,
                    tipo_factura: 'IVR',
                    total,
                    items: [{
                      descripcion: facturaDesc || 'Factura IVR',
                      cantidad: 1,
                      precio_unitario: total,
                      subtotal: total,
                    }],
                  }),
                })
                if (!res.ok) throw new Error('Error creando factura')
                toast.success('Factura creada')
                setFacturaDesc('')
                setFacturaTotal('')
                setActiveAction(null)
                fetchPanel()
              } catch {
                toast.error('Error al crear la factura')
              } finally {
                setSubmitting(false)
              }
            }}
            disabled={!facturaTotal || submitting}
          >
            {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Crear factura'}
          </Button>
          <p className="text-[10px] text-muted-foreground">
            Para facturas A/B/C, usa la seccion Facturacion completa.
          </p>
        </div>
      )}

      {/* Pedido dialog */}
      {activeAction === 'pedido' && data?.org_contact && (
        <CreatePedidoDialog
          open={true}
          onOpenChange={(open) => { if (!open) setActiveAction(null) }}
          onSuccess={() => { setActiveAction(null); fetchPanel() }}
          defaultClienteId={data.org_contact.id}
        />
      )}

      {/* Servicio dialog */}
      {activeAction === 'servicio' && data?.org_contact && (
        <CreateServicioDialogWizard
          isOpen={true}
          onClose={() => setActiveAction(null)}
          onCreate={async (formData) => {
            const res = await fetch('/api/servicios', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(formData),
            })
            if (!res.ok) throw new Error('Error al crear servicio')
            toast.success('Servicio creado')
            setActiveAction(null)
            fetchPanel()
          }}
          defaultClienteId={data.org_contact.id}
        />
      )}

      {/* Tabs */}
      <Tabs defaultValue="resumen" className="flex-1 flex flex-col min-h-0">
        <TabsList className="w-full justify-start rounded-none border-b border-gray-100 bg-transparent px-5 h-10 shrink-0">
          <TabsTrigger value="resumen" className="text-xs">Resumen</TabsTrigger>
          <TabsTrigger value="pedidos" className="text-xs">Pedidos</TabsTrigger>
          <TabsTrigger value="servicios" className="text-xs">Servicios</TabsTrigger>
          <TabsTrigger value="facturas" className="text-xs">Facturas</TabsTrigger>
          <TabsTrigger value="comunicacion" className="text-xs">Msgs</TabsTrigger>
        </TabsList>

        <ScrollArea className="flex-1">
          <TabsContent value="resumen" className="px-5 py-4 mt-0 space-y-5">
            <SaldoCard saldo={saldo} />

            {pedidos.length > 0 && (
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-xs font-medium text-gray-500 uppercase tracking-wider">Ultimos pedidos</h4>
                  <span className="text-xs text-gray-400">{pedidos.length}</span>
                </div>
                <PedidosList pedidos={pedidos.slice(0, 3)} />
              </div>
            )}

            {servicios.length > 0 && (
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-xs font-medium text-gray-500 uppercase tracking-wider">Ultimos servicios</h4>
                  <span className="text-xs text-gray-400">{servicios.length}</span>
                </div>
                <ServiciosList servicios={servicios.slice(0, 3)} />
              </div>
            )}

            {facturas.length > 0 && (
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-xs font-medium text-gray-500 uppercase tracking-wider">Ultimas facturas</h4>
                  <span className="text-xs text-gray-400">{facturas.length}</span>
                </div>
                <FacturasList facturas={facturas.slice(0, 3)} />
              </div>
            )}

            {pedidos.length === 0 && servicios.length === 0 && facturas.length === 0 && !saldo && (
              <div className="text-center text-sm text-gray-400 py-4">
                Sin actividad registrada
              </div>
            )}
          </TabsContent>

          <TabsContent value="pedidos" className="px-5 py-4 mt-0">
            <PedidosList pedidos={pedidos} />
          </TabsContent>

          <TabsContent value="servicios" className="px-5 py-4 mt-0">
            <ServiciosList servicios={servicios} />
          </TabsContent>

          <TabsContent value="facturas" className="px-5 py-4 mt-0">
            <FacturasList facturas={facturas} />
          </TabsContent>

          <TabsContent value="comunicacion" className="px-5 py-4 mt-0">
            <ComunicacionTimeline personaId={personaId} />
          </TabsContent>
        </ScrollArea>
      </Tabs>
    </div>
  )
}

// ─── Unlinked Mode ───────────────────────────────────────────────

function UnlinkedPanel({
  phone,
  contactName,
  conversationId,
  onLinked,
}: {
  phone?: string
  contactName?: string
  conversationId?: string
  onLinked?: (personaId: string) => void
}) {
  const [searchQuery, setSearchQuery] = useState('')
  const [results, setResults] = useState<SearchResult[]>([])
  const [searching, setSearching] = useState(false)
  const [linking, setLinking] = useState<string | null>(null)

  // Debounced search
  useEffect(() => {
    if (searchQuery.length < 2) {
      setResults([])
      return
    }

    setSearching(true)
    const timer = setTimeout(() => {
      fetch(`/api/contacts/search?q=${encodeURIComponent(searchQuery)}`)
        .then(res => res.json())
        .then(data => {
          setResults(data)
          setSearching(false)
        })
        .catch(() => setSearching(false))
    }, 300)

    return () => clearTimeout(timer)
  }, [searchQuery])

  const handleLink = useCallback(async (personaId: string) => {
    if (!conversationId) return
    setLinking(personaId)
    try {
      const res = await fetch(`/api/whatsapp/conversations/${conversationId}/link`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ persona_id: personaId }),
      })
      if (res.ok) {
        onLinked?.(personaId)
      }
    } catch {
      // silently fail, user can retry
    } finally {
      setLinking(null)
    }
  }, [conversationId, onLinked])

  const createUrl = `/dashboard/clientes/nuevo${phone || contactName
    ? '?' + new URLSearchParams(
      Object.entries({ telefono: phone || '', nombre: contactName || '' })
        .filter(([, v]) => v)
    ).toString()
    : ''}`

  return (
    <div className="flex flex-col h-full">
      {/* Contact info */}
      <div className="px-5 py-4 border-b border-gray-100">
        <div className="flex items-center gap-3 mb-3">
          <Avatar className="size-12">
            <AvatarFallback className="bg-gray-100 text-gray-500 text-sm font-medium">
              {contactName ? contactName.charAt(0).toUpperCase() : '?'}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <h3 className="text-base font-semibold truncate">
              {contactName || 'Contacto desconocido'}
            </h3>
            {phone && (
              <div className="flex items-center gap-1.5 text-sm text-gray-500">
                <Phone className="size-3.5" />
                <span>{phone}</span>
              </div>
            )}
          </div>
        </div>
        <div className="rounded-lg bg-amber-50 border border-amber-200 px-3 py-2 text-xs text-amber-700">
          Este contacto no esta vinculado a un cliente. Busca un cliente existente o crea uno nuevo.
        </div>
      </div>

      {/* Search */}
      <div className="px-5 py-3 border-b border-gray-100">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-gray-400" />
          <Input
            placeholder="Buscar por nombre, email o telefono..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="pl-9 h-9 text-sm"
          />
          {searching && (
            <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 size-4 animate-spin text-gray-400" />
          )}
        </div>
      </div>

      {/* Results */}
      <ScrollArea className="flex-1">
        <div className="px-5 py-3">
          {results.length > 0 ? (
            <div className="space-y-1">
              {results.map(r => (
                <button
                  key={r.persona_id}
                  onClick={() => handleLink(r.persona_id)}
                  disabled={!!linking}
                  className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors text-left disabled:opacity-50"
                >
                  <Avatar className="size-9">
                    <AvatarFallback className="bg-primary/10 text-primary text-xs font-medium">
                      {r.nombre?.charAt(0)?.toUpperCase() || '?'}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium truncate">{r.nombre}</div>
                    <div className="text-xs text-gray-500 truncate">
                      {[r.telefono, r.email].filter(Boolean).join(' · ')}
                    </div>
                  </div>
                  {linking === r.persona_id ? (
                    <Loader2 className="size-4 animate-spin text-gray-400 shrink-0" />
                  ) : (
                    <LinkIcon className="size-4 text-gray-300 shrink-0" />
                  )}
                </button>
              ))}
            </div>
          ) : searchQuery.length >= 2 && !searching ? (
            <div className="text-center py-8 text-gray-400">
              <Search className="size-8 mx-auto mb-2 stroke-1" />
              <span className="text-sm">No se encontraron clientes</span>
            </div>
          ) : searchQuery.length < 2 ? (
            <div className="text-center py-8 text-gray-400">
              <User className="size-8 mx-auto mb-2 stroke-1" />
              <span className="text-sm">Escribe al menos 2 caracteres para buscar</span>
            </div>
          ) : null}
        </div>
      </ScrollArea>

      {/* Create new */}
      <div className="px-5 py-3 border-t border-gray-100">
        <Button variant="outline" className="w-full h-9 text-sm" asChild>
          <Link href={createUrl}>
            <Plus className="size-4 mr-1.5" />
            Crear nuevo cliente
          </Link>
        </Button>
      </div>
    </div>
  )
}

// ─── Main Component ──────────────────────────────────────────────

export function ContactPanelSheet({
  open,
  onOpenChange,
  personaId,
  phone,
  contactName,
  conversationId,
  onLinked,
}: ContactPanelSheetProps) {
  // Track linked persona locally so linking switches to linked mode
  const [linkedPersonaId, setLinkedPersonaId] = useState<string | null>(null)

  // Reset local link when props change
  useEffect(() => {
    setLinkedPersonaId(null)
  }, [conversationId])

  const effectivePersonaId = personaId || linkedPersonaId

  const handleLinked = useCallback((pid: string) => {
    setLinkedPersonaId(pid)
    onLinked?.(pid)
  }, [onLinked])

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        title={effectivePersonaId ? 'Panel de contacto' : 'Vincular contacto'}
        className="w-[440px] sm:w-[500px] p-0 z-[60]"
      >
        <SheetHeader className="sr-only">
          <SheetTitle>
            {effectivePersonaId ? 'Panel de contacto' : 'Vincular contacto'}
          </SheetTitle>
        </SheetHeader>

        {effectivePersonaId ? (
          <LinkedPanel personaId={effectivePersonaId} />
        ) : (
          <UnlinkedPanel
            phone={phone}
            contactName={contactName}
            conversationId={conversationId}
            onLinked={handleLinked}
          />
        )}
      </SheetContent>
    </Sheet>
  )
}
