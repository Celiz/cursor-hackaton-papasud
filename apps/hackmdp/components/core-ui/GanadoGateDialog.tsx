'use client'

import { useState, useCallback, useRef } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { SearchableCombobox, ClienteComboboxOption } from '@/components/ui/searchable-combobox'
import { CreateClienteDialog } from '@/components/core-ui/CreateClienteDialog'
import { OportunidadVenta } from '@/lib/types'
import { toast } from 'sonner'
import { Loader2, UserPlus, Search, Mail } from 'lucide-react'

interface GanadoGateDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  oportunidad: OportunidadVenta | null
  onComplete: (updatedOp: OportunidadVenta) => void
  onCancel: () => void
  // Etapa a la que se quiere mover (requiere cliente). Default 'ganado'.
  targetEtapa?: string
  targetLabel?: string
}

export function GanadoGateDialog({
  open,
  onOpenChange,
  oportunidad,
  onComplete,
  onCancel,
  targetEtapa = 'ganado',
  targetLabel = 'ganada',
}: GanadoGateDialogProps) {
  const [mode, setMode] = useState<'choose' | 'search' | 'create'>('choose')
  const [selectedClienteId, setSelectedClienteId] = useState<string>('')
  const [selectedClienteEmail, setSelectedClienteEmail] = useState<string>('')
  const lastSearchResults = useRef<ClienteComboboxOption[]>([])
  const [saving, setSaving] = useState(false)
  const [showSolicitudPrompt, setShowSolicitudPrompt] = useState(false)
  const [sendingSolicitud, setSendingSolicitud] = useState(false)
  const [completedOp, setCompletedOp] = useState<OportunidadVenta | null>(null)
  const [createDialogOpen, setCreateDialogOpen] = useState(false)

  const resetState = useCallback(() => {
    setMode('choose')
    setSelectedClienteId('')
    setSelectedClienteEmail('')
    setSaving(false)
    setShowSolicitudPrompt(false)
    setSendingSolicitud(false)
    setCompletedOp(null)
    setCreateDialogOpen(false)
  }, [])

  const handleOpenChange = useCallback((open: boolean) => {
    if (!open) {
      onCancel()
      resetState()
    }
    onOpenChange(open)
  }, [onCancel, onOpenChange, resetState])

  const searchClientes = useCallback(async (q: string): Promise<ClienteComboboxOption[]> => {
    if (!q || q.length < 2) return []
    const res = await fetch(`/api/clientes?search=${encodeURIComponent(q)}&limit=20&view=principal`)
    if (!res.ok) return []
    const data = await res.json()
    const results = (data || []).map((c: any) => ({
      label: c.nombre,
      value: c.id,
      subtitle: c.cuit || c.identificador_unico || '',
      badge: c.nombre_fantasia || undefined,
      data: {
        nombre: c.nombre,
        nombre_fantasia: c.nombre_fantasia,
        identificador_unico: c.identificador_unico,
        cuit: c.cuit,
        email: c.email ? (Array.isArray(c.email) ? c.email : [c.email]) : [],
        telefono: c.telefono ? (Array.isArray(c.telefono) ? c.telefono : [c.telefono]) : [],
      },
    }))
    lastSearchResults.current = results
    return results
  }, [])

  const handleAssociateCliente = useCallback(async (clienteId: string, clienteEmail?: string) => {
    if (!oportunidad || !clienteId) return

    setSaving(true)
    try {
      const res = await fetch(`/api/oportunidades?id=${oportunidad.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        // Solo 'ganado' cambia también el estado; otras etapas (ej. logística)
        // solo mueven la etapa.
        body: JSON.stringify({ cliente_id: clienteId, etapa: targetEtapa, ...(targetEtapa === 'ganado' ? { estado: 'ganado' } : {}) }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Error al actualizar')
      }

      const updated = await res.json()
      toast.success(targetEtapa === 'ganado' ? 'Oportunidad marcada como ganada' : `Cliente asociado · oportunidad en ${targetLabel}`)

      // Resolve email: explicit param > state
      const email = clienteEmail || selectedClienteEmail
      if (email) {
        setSelectedClienteEmail(email)
        setCompletedOp(updated)
        setShowSolicitudPrompt(true)
      } else {
        onComplete(updated)
        resetState()
        onOpenChange(false)
      }
    } catch (error: any) {
      toast.error(error.message)
    } finally {
      setSaving(false)
    }
  }, [oportunidad, selectedClienteEmail, onComplete, resetState, onOpenChange, targetEtapa, targetLabel])

  const handleCreateCliente = useCallback(async (data: any) => {
    try {
      const res = await fetch('/api/clientes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })

      if (!res.ok) {
        const errorData = await res.json()
        throw new Error(errorData.error || 'Error al crear cliente')
      }

      const newCliente = await res.json()
      toast.success(`Cliente "${newCliente.nombre}" creado`)
      setCreateDialogOpen(false)

      // Extract email from the created client data
      const email = data.email
        ? (typeof data.email === 'string' ? data.email.split(',')[0].trim() : data.email[0])
        : ''

      await handleAssociateCliente(newCliente.id, email)
    } catch (error: any) {
      toast.error(error.message)
      throw error
    }
  }, [handleAssociateCliente])

  const handleSendSolicitud = useCallback(async () => {
    if (!completedOp || !selectedClienteEmail) return

    setSendingSolicitud(true)
    try {
      const res = await fetch('/api/solicitud-datos-cliente', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cliente_id: completedOp.cliente_id || completedOp.cliente?.id,
          oportunidad_id: completedOp.id,
          email_destino: selectedClienteEmail,
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Error al enviar solicitud')
      }

      toast.success('Solicitud de datos enviada por email')
    } catch (error: any) {
      toast.error(error.message)
    } finally {
      setSendingSolicitud(false)
      onComplete(completedOp)
      resetState()
      onOpenChange(false)
    }
  }, [completedOp, selectedClienteEmail, onComplete, resetState, onOpenChange])

  const handleSkipSolicitud = useCallback(() => {
    if (completedOp) onComplete(completedOp)
    resetState()
    onOpenChange(false)
  }, [completedOp, onComplete, resetState, onOpenChange])

  if (!oportunidad) return null

  // Solicitud prompt after associating client
  if (showSolicitudPrompt) {
    return (
      <Dialog open={open} onOpenChange={() => {}}>
        <DialogContent className="sm:max-w-md" onPointerDownOutside={(e) => e.preventDefault()}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Mail className="h-5 w-5 text-purple-500" />
              Solicitar datos de facturacion
            </DialogTitle>
            <DialogDescription>
              Enviar un formulario por email a <strong>{selectedClienteEmail}</strong> para
              que complete sus datos de facturacion (CUIT, condicion IVA, direccion).
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={handleSkipSolicitud} disabled={sendingSolicitud}>
              Omitir
            </Button>
            <Button onClick={handleSendSolicitud} disabled={sendingSolicitud}>
              {sendingSolicitud && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Enviar solicitud
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    )
  }

  return (
    <>
      <Dialog open={open && !createDialogOpen} onOpenChange={handleOpenChange}>
        <DialogContent className="sm:max-w-lg" onPointerDownOutside={(e) => e.preventDefault()}>
          <DialogHeader>
            <DialogTitle>
              {targetEtapa === 'ganado'
                ? 'Asociar cliente para marcar como ganada'
                : `Asociar cliente para pasar a ${targetLabel}`}
            </DialogTitle>
            <DialogDescription>
              La oportunidad &ldquo;{oportunidad.nombre}&rdquo; necesita un cliente asociado
              {targetEtapa === 'ganado' ? ' antes de marcarse como ganada.' : ` antes de pasar a ${targetLabel}.`}
            </DialogDescription>
          </DialogHeader>

          {mode === 'choose' && (
            <div className="grid gap-3 py-4">
              <Button
                variant="outline"
                className="h-auto p-4 justify-start gap-3"
                onClick={() => setMode('search')}
              >
                <Search className="h-5 w-5 text-blue-500 shrink-0" />
                <div className="text-left">
                  <p className="font-medium">Asociar cliente existente</p>
                  <p className="text-sm text-muted-foreground">Buscar entre los clientes registrados</p>
                </div>
              </Button>
              <Button
                variant="outline"
                className="h-auto p-4 justify-start gap-3"
                onClick={() => {
                  setMode('create')
                  setCreateDialogOpen(true)
                }}
              >
                <UserPlus className="h-5 w-5 text-emerald-500 shrink-0" />
                <div className="text-left">
                  <p className="font-medium">Crear cliente nuevo</p>
                  <p className="text-sm text-muted-foreground">
                    {oportunidad.contacto_nombre
                      ? `Pre-rellenar con "${oportunidad.contacto_nombre}"`
                      : 'Registrar un nuevo cliente'}
                  </p>
                </div>
              </Button>
            </div>
          )}

          {mode === 'search' && (
            <div className="py-4 space-y-4">
              <SearchableCombobox
                value={selectedClienteId}
                onValueChange={(val) => {
                  setSelectedClienteId(val)
                  // Extract email from cached search results
                  const match = lastSearchResults.current.find(o => o.value === val)
                  const emails = match?.data?.email || []
                  setSelectedClienteEmail(emails[0] || '')
                }}
                searchFn={searchClientes}
                placeholder="Buscar cliente por nombre, CUIT..."
                emptyMessage="No se encontraron clientes"
                renderOption={(option) => (
                  <div className="flex flex-col">
                    <span className="font-medium">{option.label}</span>
                    {option.subtitle && (
                      <span className="text-xs text-muted-foreground">{option.subtitle}</span>
                    )}
                  </div>
                )}
              />

              <DialogFooter className="gap-2 sm:gap-0">
                <Button variant="outline" onClick={() => setMode('choose')}>
                  Volver
                </Button>
                <Button
                  onClick={() => handleAssociateCliente(selectedClienteId)}
                  disabled={!selectedClienteId || saving}
                >
                  {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Asociar y marcar ganada
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <CreateClienteDialog
        open={createDialogOpen}
        onOpenChange={(open) => {
          setCreateDialogOpen(open)
          if (!open) setMode('choose')
        }}
        onSave={handleCreateCliente}
        defaultNombre={oportunidad.contacto_nombre || ''}
        defaultEmail={oportunidad.contacto_email || ''}
        defaultTelefono={oportunidad.contacto_telefono || ''}
      />
    </>
  )
}
