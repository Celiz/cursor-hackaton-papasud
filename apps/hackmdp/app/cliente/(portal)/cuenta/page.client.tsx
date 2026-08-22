'use client'

import { useState } from 'react'
import useSWR from 'swr'
import { User, Mail, Phone, FileText, Bell, KeyRound, Check, Shield, Download, Trash2, AlertTriangle, Clock } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

const fetcher = (url: string) => fetch(url).then(r => r.json())

export default function CuentaClient({ orgTheme, orgPais }: { orgTheme: string; orgPais: string }) {
  const { data, mutate } = useSWR('/cliente/api/cuenta', fetcher)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [exporting, setExporting] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [deletionReason, setDeletionReason] = useState('')
  const [deletionSubmitting, setDeletionSubmitting] = useState(false)
  const [deletionResult, setDeletionResult] = useState<{ success: boolean; message: string } | null>(null)

  if (!data) return <p className="text-muted-foreground">Cargando...</p>

  const { persona, preferencias, has_credentials, origen } = data

  async function togglePreference(key: 'email' | 'whatsapp') {
    const updated = { ...preferencias, [key]: !preferencias[key] }
    setSaving(true)
    setSaved(false)
    try {
      await fetch('/cliente/api/cuenta/preferencias', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updated),
      })
      mutate()
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6 pb-20 md:pb-0 max-w-lg">
      <h1 className="text-2xl font-bold">Mi cuenta</h1>

      {/* Personal data */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <User className="w-4 h-4" /> Datos personales
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center gap-3">
            <User className="w-4 h-4 text-muted-foreground" />
            <div>
              <p className="text-xs text-muted-foreground">Nombre</p>
              <p className="text-sm font-medium">{persona.nombre || '-'}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Mail className="w-4 h-4 text-muted-foreground" />
            <div>
              <p className="text-xs text-muted-foreground">Email</p>
              <p className="text-sm font-medium">{persona.email || '-'}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Phone className="w-4 h-4 text-muted-foreground" />
            <div>
              <p className="text-xs text-muted-foreground">Teléfono</p>
              <p className="text-sm font-medium">{persona.telefono || '-'}</p>
            </div>
          </div>
          {persona.documento_nro && (
            <div className="flex items-center gap-3">
              <FileText className="w-4 h-4 text-muted-foreground" />
              <div>
                <p className="text-xs text-muted-foreground">Documento</p>
                <p className="text-sm font-medium">{persona.documento_tipo} {persona.documento_nro}</p>
              </div>
            </div>
          )}
          <p className="text-xs text-muted-foreground mt-2">
            Para modificar tus datos, contacta al negocio.
          </p>
        </CardContent>
      </Card>

      {/* Notification preferences */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Bell className="w-4 h-4" /> Preferencias de notificacion
            {saved && <Badge className="bg-green-100 text-green-800 text-xs"><Check className="w-3 h-3 mr-1" />Guardado</Badge>}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Email</p>
              <p className="text-xs text-muted-foreground">Recibir notificaciones por email</p>
            </div>
            <button
              onClick={() => togglePreference('email')}
              disabled={saving}
              className={`relative w-11 h-6 rounded-full transition-colors ${
                preferencias.email ? 'bg-green-500' : 'bg-gray-300'
              }`}
            >
              <span
                className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform ${
                  preferencias.email ? 'translate-x-5' : ''
                }`}
              />
            </button>
          </div>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">WhatsApp</p>
              <p className="text-xs text-muted-foreground">Recibir notificaciones por WhatsApp</p>
            </div>
            <button
              onClick={() => togglePreference('whatsapp')}
              disabled={saving}
              className={`relative w-11 h-6 rounded-full transition-colors ${
                preferencias.whatsapp ? 'bg-green-500' : 'bg-gray-300'
              }`}
            >
              <span
                className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform ${
                  preferencias.whatsapp ? 'translate-x-5' : ''
                }`}
              />
            </button>
          </div>
        </CardContent>
      </Card>

      {/* Account status */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <KeyRound className="w-4 h-4" /> Cuenta
          </CardTitle>
        </CardHeader>
        <CardContent>
          {has_credentials ? (
            <div className="flex items-center gap-2 text-sm">
              <Check className="w-4 h-4 text-green-500" />
              <span>Cuenta activa - podes ingresar con email y contrasena</span>
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                {origen === 'token'
                  ? 'Entraste por un link. Crea una contrasena para poder ingresar siempre.'
                  : 'Tu cuenta no tiene contrasena configurada.'}
              </p>
              <Button asChild size="sm">
                <a href="/cliente/activar">
                  <KeyRound className="w-4 h-4 mr-2" /> Activar cuenta
                </a>
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
      {/* RGPD — only for Spanish orgs */}
      {orgPais === 'ES' && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Shield className="w-4 h-4" /> Proteccion de datos (RGPD)
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-xs text-muted-foreground">
              De acuerdo con el Reglamento (UE) 2016/679, tienes derecho a acceder, exportar y solicitar la eliminacion de tus datos personales.
            </p>

            <div className="flex flex-col gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={exporting}
                onClick={async () => {
                  setExporting(true)
                  try {
                    const res = await fetch('/api/cliente/rgpd/export')
                    if (!res.ok) throw new Error('Error al exportar')
                    const blob = await res.blob()
                    const url = URL.createObjectURL(blob)
                    const a = document.createElement('a')
                    a.href = url
                    a.download = `mis-datos-${new Date().toISOString().split('T')[0]}.json`
                    a.click()
                    URL.revokeObjectURL(url)
                  } catch {
                    alert('No se pudieron exportar los datos. Intenta de nuevo.')
                  } finally {
                    setExporting(false)
                  }
                }}
              >
                <Download className="w-4 h-4 mr-2" />
                {exporting ? 'Exportando...' : 'Descargar mis datos'}
              </Button>

              <Button
                variant="outline"
                size="sm"
                className="text-red-600 hover:text-red-700 hover:bg-red-50"
                onClick={() => setShowDeleteDialog(true)}
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Solicitar eliminacion de datos
              </Button>
            </div>

            {deletionResult && (
              <div className={`flex items-start gap-2 p-3 rounded-md text-sm ${
                deletionResult.success
                  ? 'bg-green-50 text-green-800'
                  : 'bg-red-50 text-red-800'
              }`}>
                {deletionResult.success ? (
                  <Clock className="w-4 h-4 mt-0.5 shrink-0" />
                ) : (
                  <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
                )}
                <span>{deletionResult.message}</span>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Deletion confirmation dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Solicitar eliminacion de datos</DialogTitle>
            <DialogDescription>
              Esta accion solicitara la eliminacion de todos tus datos personales. El proceso puede tardar hasta 30 dias.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <label className="text-sm font-medium">Motivo (opcional)</label>
            <textarea
              className="w-full border rounded-md p-2 text-sm min-h-[80px] resize-none"
              placeholder="Indica por que deseas eliminar tus datos..."
              value={deletionReason}
              onChange={(e) => setDeletionReason(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowDeleteDialog(false)}
              disabled={deletionSubmitting}
            >
              Cancelar
            </Button>
            <Button
              variant="destructive"
              disabled={deletionSubmitting}
              onClick={async () => {
                setDeletionSubmitting(true)
                try {
                  const res = await fetch('/api/cliente/rgpd/deletion-request', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ reason: deletionReason || undefined }),
                  })
                  const data = await res.json()
                  if (res.ok) {
                    setDeletionResult({ success: true, message: data.message })
                  } else {
                    setDeletionResult({ success: false, message: data.error || 'Error al enviar la solicitud' })
                  }
                  setShowDeleteDialog(false)
                  setDeletionReason('')
                } catch {
                  setDeletionResult({ success: false, message: 'Error de conexion. Intenta de nuevo.' })
                  setShowDeleteDialog(false)
                } finally {
                  setDeletionSubmitting(false)
                }
              }}
            >
              {deletionSubmitting ? 'Enviando...' : 'Confirmar solicitud'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
