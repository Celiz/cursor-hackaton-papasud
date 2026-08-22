'use client'

import { useState } from 'react'
import { Sheet, SheetContent } from '@/components/ui/sheet'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Pencil, Save, X, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import type { RegRegistro, RegEstadoRegistro } from '@locus/db/schema/regulatory'

const ESTADO_CONFIG: Record<RegEstadoRegistro, { label: string; badgeClass: string }> = {
  vigente: { label: 'Vigente', badgeClass: 'border-green-200 bg-green-50 text-green-700' },
  en_tramite: { label: 'En tramite', badgeClass: 'border-blue-200 bg-blue-50 text-blue-700' },
  vencido: { label: 'Vencido', badgeClass: 'border-red-200 bg-red-50 text-red-700' },
  suspendido: { label: 'Suspendido', badgeClass: 'border-orange-200 bg-orange-50 text-orange-700' },
  cancelado: { label: 'Cancelado', badgeClass: 'border-gray-200 bg-gray-50 text-gray-500' },
}

const TIPO_REGISTRO_LABELS: Record<string, string> = {
  producto_medico: 'Producto medico',
  reactivo: 'Reactivo',
  equipo_importado: 'Equipo importado',
}

interface RegistroDetailSheetProps {
  registro: RegRegistro | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onUpdate: () => void
}

export function RegistroDetailSheet({ registro, open, onOpenChange, onUpdate }: RegistroDetailSheetProps) {
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [editData, setEditData] = useState<Partial<RegRegistro>>({})

  const startEditing = () => {
    if (!registro) return
    setEditData({
      estado: registro.estado,
      titular: registro.titular,
      fecha_vencimiento: registro.fecha_vencimiento,
      disposicion: registro.disposicion,
      descripcion: registro.descripcion,
      notas: registro.notas,
    })
    setEditing(true)
    setError(null)
  }

  const cancelEditing = () => {
    setEditing(false)
    setEditData({})
    setError(null)
  }

  const saveChanges = async () => {
    if (!registro) return
    setSaving(true)
    setError(null)
    try {
      const res = await fetch(`/api/regulatorio/registros/${registro.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editData),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || 'Error al guardar')
      }
      setEditing(false)
      setEditData({})
      onUpdate()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error al guardar')
    } finally {
      setSaving(false)
    }
  }

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '-'
    try {
      return format(new Date(dateStr), 'dd MMM yyyy', { locale: es })
    } catch {
      return dateStr
    }
  }

  if (!registro) return null

  const estadoConfig = ESTADO_CONFIG[registro.estado]

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" title={registro.numero_registro} className="overflow-y-auto">
        <div className="flex flex-col gap-6 p-4 pt-8">
          {/* Header */}
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-lg font-bold font-mono">{registro.numero_registro}</h2>
              <Badge variant="outline" className={cn('mt-1', estadoConfig.badgeClass)}>
                {editing ? (
                  <Select
                    value={editData.estado || registro.estado}
                    onValueChange={(v) => setEditData((prev) => ({ ...prev, estado: v as RegEstadoRegistro }))}
                  >
                    <SelectTrigger className="h-6 border-0 bg-transparent p-0 text-xs shadow-none">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="vigente">Vigente</SelectItem>
                      <SelectItem value="en_tramite">En tramite</SelectItem>
                      <SelectItem value="vencido">Vencido</SelectItem>
                      <SelectItem value="suspendido">Suspendido</SelectItem>
                      <SelectItem value="cancelado">Cancelado</SelectItem>
                    </SelectContent>
                  </Select>
                ) : (
                  estadoConfig.label
                )}
              </Badge>
            </div>

            <div className="flex items-center gap-1.5">
              {editing ? (
                <>
                  <button
                    type="button"
                    onClick={cancelEditing}
                    className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium rounded-md border border-gray-200 bg-white hover:bg-gray-50 transition-colors"
                  >
                    <X className="h-3.5 w-3.5" />
                    Cancelar
                  </button>
                  <button
                    type="button"
                    onClick={saveChanges}
                    disabled={saving}
                    className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium rounded-md bg-purple-600 hover:bg-purple-700 text-white transition-colors disabled:opacity-50"
                  >
                    {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                    Guardar
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  onClick={startEditing}
                  className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium rounded-md border border-gray-200 bg-white hover:bg-gray-50 transition-colors"
                >
                  <Pencil className="h-3.5 w-3.5" />
                  Editar
                </button>
              )}
            </div>
          </div>

          {error && (
            <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-md px-3 py-2">{error}</p>
          )}

          {/* Fields Grid */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-medium text-muted-foreground">Entidad</label>
              <p className="mt-1">
                <Badge
                  variant="outline"
                  className={cn(
                    'text-xs uppercase',
                    registro.entidad === 'anmat'
                      ? 'border-purple-200 bg-purple-50 text-purple-700'
                      : 'border-emerald-200 bg-emerald-50 text-emerald-700'
                  )}
                >
                  {registro.entidad}
                </Badge>
              </p>
            </div>

            <div>
              <label className="text-xs font-medium text-muted-foreground">Tipo de registro</label>
              <p className="mt-1 text-sm">{TIPO_REGISTRO_LABELS[registro.tipo_registro] || registro.tipo_registro}</p>
            </div>

            <div>
              <label className="text-xs font-medium text-muted-foreground">Clase de riesgo</label>
              <p className="mt-1">
                {registro.clase_riesgo ? (
                  <Badge variant="outline" className="text-xs">{registro.clase_riesgo}</Badge>
                ) : (
                  <span className="text-sm text-muted-foreground">-</span>
                )}
              </p>
            </div>

            <div>
              <label className="text-xs font-medium text-muted-foreground">Titular</label>
              {editing ? (
                <Input
                  className="mt-1 h-8 text-sm"
                  value={editData.titular || ''}
                  onChange={(e) => setEditData((prev) => ({ ...prev, titular: e.target.value }))}
                />
              ) : (
                <p className="mt-1 text-sm">{registro.titular || '-'}</p>
              )}
            </div>

            <div>
              <label className="text-xs font-medium text-muted-foreground">Fecha otorgamiento</label>
              <p className="mt-1 text-sm">{formatDate(registro.fecha_otorgamiento)}</p>
            </div>

            <div>
              <label className="text-xs font-medium text-muted-foreground">Fecha vencimiento</label>
              {editing ? (
                <Input
                  type="date"
                  className="mt-1 h-8 text-sm"
                  value={editData.fecha_vencimiento || ''}
                  onChange={(e) => setEditData((prev) => ({ ...prev, fecha_vencimiento: e.target.value }))}
                />
              ) : (
                <div className="mt-1 flex items-center gap-2">
                  <span className="text-sm">{formatDate(registro.fecha_vencimiento)}</span>
                  {registro.dias_para_vencer != null && registro.dias_para_vencer <= 90 && (
                    <Badge
                      variant="outline"
                      className={cn(
                        'text-[10px] tabular-nums',
                        registro.dias_para_vencer < 0
                          ? 'border-red-200 bg-red-50 text-red-700'
                          : registro.dias_para_vencer <= 30
                          ? 'border-orange-200 bg-orange-50 text-orange-700'
                          : 'border-yellow-200 bg-yellow-50 text-yellow-700'
                      )}
                    >
                      {registro.dias_para_vencer < 0 ? `Vencido ${Math.abs(registro.dias_para_vencer)}d` : `${registro.dias_para_vencer}d`}
                    </Badge>
                  )}
                </div>
              )}
            </div>

            {registro.entidad === 'anmat' && (
              <div className="col-span-2">
                <label className="text-xs font-medium text-muted-foreground">Disposicion</label>
                {editing ? (
                  <Input
                    className="mt-1 h-8 text-sm"
                    value={editData.disposicion || ''}
                    onChange={(e) => setEditData((prev) => ({ ...prev, disposicion: e.target.value }))}
                  />
                ) : (
                  <p className="mt-1 text-sm">{registro.disposicion || '-'}</p>
                )}
              </div>
            )}
          </div>

          {/* Producto link */}
          {registro.producto_nombre && (
            <div>
              <label className="text-xs font-medium text-muted-foreground">Producto</label>
              <p className="mt-1 text-sm font-medium text-purple-600">{registro.producto_nombre}</p>
            </div>
          )}

          {/* Descripcion */}
          <div>
            <label className="text-xs font-medium text-muted-foreground">Descripcion</label>
            {editing ? (
              <Textarea
                className="mt-1 text-sm"
                rows={3}
                value={editData.descripcion || ''}
                onChange={(e) => setEditData((prev) => ({ ...prev, descripcion: e.target.value }))}
              />
            ) : (
              <p className="mt-1 text-sm whitespace-pre-wrap">{registro.descripcion || '-'}</p>
            )}
          </div>

          {/* Notas */}
          <div>
            <label className="text-xs font-medium text-muted-foreground">Notas</label>
            {editing ? (
              <Textarea
                className="mt-1 text-sm"
                rows={3}
                value={editData.notas || ''}
                onChange={(e) => setEditData((prev) => ({ ...prev, notas: e.target.value }))}
              />
            ) : (
              <p className="mt-1 text-sm whitespace-pre-wrap text-muted-foreground">{registro.notas || '-'}</p>
            )}
          </div>

          {/* Metadata */}
          <div className="border-t pt-4 mt-2">
            <div className="flex items-center gap-4 text-xs text-muted-foreground">
              <span>Creado: {formatDate(registro.created_at)}</span>
              <span>Actualizado: {formatDate(registro.updated_at)}</span>
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}
