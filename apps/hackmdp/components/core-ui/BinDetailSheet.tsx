'use client'

import { useState } from 'react'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Bin } from '@/app/dashboard/inventario/bins/columns'
import {
  MapPin,
  Warehouse,
  Thermometer,
  Package,
  Edit,
  Save,
  X,
  Trash2,
  Lock,
  Unlock,
} from 'lucide-react'

interface BinDetailSheetProps {
  bin: Bin
  open: boolean
  onOpenChange: (open: boolean) => void
  onEdit: (data: Partial<Bin>) => void
  onDelete: () => void
}

const TIPO_OPTIONS = [
  { value: 'picking', label: 'Picking' },
  { value: 'reserve', label: 'Reserva' },
  { value: 'receiving', label: 'Recepción' },
  { value: 'shipping', label: 'Envío' },
  { value: 'quarantine', label: 'Cuarentena' },
  { value: 'returns', label: 'Devoluciones' },
]

const TIPO_STYLES: Record<string, { variant: 'default' | 'secondary' | 'outline' | 'destructive'; label: string }> = {
  picking: { variant: 'default', label: 'Picking' },
  reserve: { variant: 'secondary', label: 'Reserva' },
  receiving: { variant: 'outline', label: 'Recepción' },
  shipping: { variant: 'outline', label: 'Envío' },
  quarantine: { variant: 'destructive', label: 'Cuarentena' },
  returns: { variant: 'outline', label: 'Devoluciones' },
}

export function BinDetailSheet({
  bin,
  open,
  onOpenChange,
  onEdit,
  onDelete,
}: BinDetailSheetProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [formData, setFormData] = useState({
    nombre: bin.nombre || '',
    descripcion: bin.descripcion || '',
    pasillo: bin.pasillo || '',
    estanteria: bin.estanteria || '',
    nivel: bin.nivel?.toString() || '',
    posicion: bin.posicion || '',
    tipo: bin.tipo,
    prioridad: bin.prioridad?.toString() || '0',
    capacidad_m3: bin.capacidad_m3?.toString() || '',
    capacidad_kg: bin.capacidad_kg?.toString() || '',
    capacidad_unidades: bin.capacidad_unidades?.toString() || '',
    temperatura_min: bin.temperatura_min?.toString() || '',
    temperatura_max: bin.temperatura_max?.toString() || '',
    bloqueado: bin.bloqueado,
    razon_bloqueo: bin.razon_bloqueo || '',
    activo: bin.activo,
  })

  const handleSave = () => {
    onEdit({
      nombre: formData.nombre || null,
      descripcion: formData.descripcion || null,
      pasillo: formData.pasillo || null,
      estanteria: formData.estanteria || null,
      nivel: formData.nivel ? parseInt(formData.nivel) : null,
      posicion: formData.posicion || null,
      tipo: formData.tipo as Bin['tipo'],
      prioridad: parseInt(formData.prioridad) || 0,
      capacidad_m3: formData.capacidad_m3 ? parseFloat(formData.capacidad_m3) : null,
      capacidad_kg: formData.capacidad_kg ? parseFloat(formData.capacidad_kg) : null,
      capacidad_unidades: formData.capacidad_unidades ? parseInt(formData.capacidad_unidades) : null,
      temperatura_min: formData.temperatura_min ? parseFloat(formData.temperatura_min) : null,
      temperatura_max: formData.temperatura_max ? parseFloat(formData.temperatura_max) : null,
      bloqueado: formData.bloqueado,
      razon_bloqueo: formData.razon_bloqueo || null,
      activo: formData.activo,
    })
    setIsEditing(false)
  }

  const handleCancel = () => {
    setFormData({
      nombre: bin.nombre || '',
      descripcion: bin.descripcion || '',
      pasillo: bin.pasillo || '',
      estanteria: bin.estanteria || '',
      nivel: bin.nivel?.toString() || '',
      posicion: bin.posicion || '',
      tipo: bin.tipo,
      prioridad: bin.prioridad?.toString() || '0',
      capacidad_m3: bin.capacidad_m3?.toString() || '',
      capacidad_kg: bin.capacidad_kg?.toString() || '',
      capacidad_unidades: bin.capacidad_unidades?.toString() || '',
      temperatura_min: bin.temperatura_min?.toString() || '',
      temperatura_max: bin.temperatura_max?.toString() || '',
      bloqueado: bin.bloqueado,
      razon_bloqueo: bin.razon_bloqueo || '',
      activo: bin.activo,
    })
    setIsEditing(false)
  }

  const tipoStyle = TIPO_STYLES[bin.tipo] || { variant: 'secondary', label: bin.tipo }

  // Calcular color de ocupación
  const porcentaje = bin.porcentaje_ocupacion || 0
  let ocupacionColor = 'bg-green-500'
  if (porcentaje >= 80) ocupacionColor = 'bg-red-500'
  else if (porcentaje >= 60) ocupacionColor = 'bg-amber-500'

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-[600px] overflow-y-auto">
        <SheetHeader className="pb-4 border-b">
          <div className="flex items-start justify-between">
            <div>
              <SheetTitle className="flex items-center gap-2">
                <MapPin className="h-5 w-5" />
                {bin.codigo}
                {bin.bloqueado && (
                  <Lock className="h-4 w-4 text-destructive" />
                )}
              </SheetTitle>
              <p className="text-sm text-muted-foreground mt-1">
                {bin.deposito?.nombre || 'Sin depósito'}
              </p>
            </div>
            <div className="flex gap-2">
              <Badge variant={tipoStyle.variant}>{tipoStyle.label}</Badge>
              {bin.bloqueado ? (
                <Badge variant="destructive">Bloqueado</Badge>
              ) : (
                <Badge variant={bin.activo ? 'default' : 'secondary'}>
                  {bin.activo ? 'Activo' : 'Inactivo'}
                </Badge>
              )}
            </div>
          </div>
        </SheetHeader>

        <Tabs defaultValue="info" className="mt-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="info">Información</TabsTrigger>
            <TabsTrigger value="capacidad">Capacidad</TabsTrigger>
            <TabsTrigger value="config">Configuración</TabsTrigger>
          </TabsList>

          <TabsContent value="info" className="space-y-6 mt-4">
            {/* Depósito */}
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-sm font-medium">
                <Warehouse className="h-4 w-4" />
                Depósito
              </div>
              <p>{bin.deposito?.nombre || '-'}</p>
            </div>

            {/* Nombre */}
            <div className="space-y-3">
              <Label>Nombre</Label>
              {isEditing ? (
                <Input
                  value={formData.nombre}
                  onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                  placeholder="Nombre descriptivo"
                />
              ) : (
                <p>{bin.nombre || '-'}</p>
              )}
            </div>

            {/* Ubicación física */}
            <div className="space-y-3">
              <Label>Ubicación Física</Label>
              {isEditing ? (
                <div className="grid grid-cols-4 gap-2">
                  <div>
                    <Label className="text-xs">Pasillo</Label>
                    <Input
                      value={formData.pasillo}
                      onChange={(e) => setFormData({ ...formData, pasillo: e.target.value })}
                      placeholder="A"
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Estantería</Label>
                    <Input
                      value={formData.estanteria}
                      onChange={(e) => setFormData({ ...formData, estanteria: e.target.value })}
                      placeholder="05"
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Nivel</Label>
                    <Input
                      type="number"
                      value={formData.nivel}
                      onChange={(e) => setFormData({ ...formData, nivel: e.target.value })}
                      placeholder="3"
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Posición</Label>
                    <Input
                      value={formData.posicion}
                      onChange={(e) => setFormData({ ...formData, posicion: e.target.value })}
                      placeholder="01"
                    />
                  </div>
                </div>
              ) : (
                <p className="font-mono">
                  {[
                    bin.pasillo && `Pasillo ${bin.pasillo}`,
                    bin.estanteria && `Estantería ${bin.estanteria}`,
                    bin.nivel && `Nivel ${bin.nivel}`,
                    bin.posicion && `Pos. ${bin.posicion}`,
                  ].filter(Boolean).join(' / ') || '-'}
                </p>
              )}
            </div>

            {/* Tipo */}
            <div className="space-y-3">
              <Label>Tipo</Label>
              {isEditing ? (
                <Select
                  value={formData.tipo}
                  onValueChange={(value) => setFormData({ ...formData, tipo: value as Bin['tipo'] })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TIPO_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <Badge variant={tipoStyle.variant}>{tipoStyle.label}</Badge>
              )}
            </div>

            {/* Prioridad */}
            <div className="space-y-3">
              <Label>Prioridad de Picking</Label>
              {isEditing ? (
                <Input
                  type="number"
                  value={formData.prioridad}
                  onChange={(e) => setFormData({ ...formData, prioridad: e.target.value })}
                />
              ) : (
                <p>{bin.prioridad}</p>
              )}
            </div>

            {/* Descripción */}
            <div className="space-y-3">
              <Label>Descripción</Label>
              {isEditing ? (
                <Textarea
                  value={formData.descripcion}
                  onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })}
                  rows={3}
                />
              ) : (
                <p className="text-sm">{bin.descripcion || '-'}</p>
              )}
            </div>
          </TabsContent>

          <TabsContent value="capacidad" className="space-y-6 mt-4">
            {/* Ocupación actual */}
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-sm font-medium">
                <Package className="h-4 w-4" />
                Ocupación Actual
              </div>
              <div className="flex items-center gap-3">
                <div className="flex-1 h-3 bg-muted rounded-full overflow-hidden">
                  <div
                    className={`h-full ${ocupacionColor} transition-all`}
                    style={{ width: `${Math.min(porcentaje, 100)}%` }}
                  />
                </div>
                <span className="text-lg font-bold">{porcentaje.toFixed(1)}%</span>
              </div>
            </div>

            {/* Capacidad */}
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Cap. Unidades</Label>
                {isEditing ? (
                  <Input
                    type="number"
                    value={formData.capacidad_unidades}
                    onChange={(e) => setFormData({ ...formData, capacidad_unidades: e.target.value })}
                  />
                ) : (
                  <p className="text-lg font-medium">
                    {bin.ocupacion_unidades}/{bin.capacidad_unidades || '∞'}
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label>Cap. m³</Label>
                {isEditing ? (
                  <Input
                    type="number"
                    step="0.001"
                    value={formData.capacidad_m3}
                    onChange={(e) => setFormData({ ...formData, capacidad_m3: e.target.value })}
                  />
                ) : (
                  <p className="text-lg font-medium">
                    {bin.ocupacion_m3}/{bin.capacidad_m3 || '∞'}
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label>Cap. kg</Label>
                {isEditing ? (
                  <Input
                    type="number"
                    step="0.01"
                    value={formData.capacidad_kg}
                    onChange={(e) => setFormData({ ...formData, capacidad_kg: e.target.value })}
                  />
                ) : (
                  <p className="text-lg font-medium">
                    {bin.ocupacion_kg}/{bin.capacidad_kg || '∞'}
                  </p>
                )}
              </div>
            </div>

            {/* Temperatura */}
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-sm font-medium">
                <Thermometer className="h-4 w-4" />
                Control de Temperatura
              </div>
              {isEditing ? (
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Temp. Mín (°C)</Label>
                    <Input
                      type="number"
                      step="0.1"
                      value={formData.temperatura_min}
                      onChange={(e) => setFormData({ ...formData, temperatura_min: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Temp. Máx (°C)</Label>
                    <Input
                      type="number"
                      step="0.1"
                      value={formData.temperatura_max}
                      onChange={(e) => setFormData({ ...formData, temperatura_max: e.target.value })}
                    />
                  </div>
                </div>
              ) : (
                <p>
                  {bin.temperatura_min != null || bin.temperatura_max != null
                    ? `${bin.temperatura_min ?? '-'}°C - ${bin.temperatura_max ?? '-'}°C`
                    : 'Sin control de temperatura'}
                </p>
              )}
            </div>

            {/* Producto dedicado */}
            {bin.producto_dedicado?.id && (
              <div className="space-y-3">
                <Label>Producto Dedicado</Label>
                <div className="p-3 bg-muted rounded-lg">
                  <p className="font-medium">{bin.producto_dedicado.nombre}</p>
                  {bin.producto_dedicado.codigo && (
                    <p className="text-sm text-muted-foreground">{bin.producto_dedicado.codigo}</p>
                  )}
                </div>
              </div>
            )}
          </TabsContent>

          <TabsContent value="config" className="space-y-6 mt-4">
            {/* Bloqueo */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label>Bloqueado</Label>
                  <p className="text-xs text-muted-foreground">Impide operaciones</p>
                </div>
                <Switch
                  checked={formData.bloqueado}
                  onCheckedChange={(checked) => setFormData({ ...formData, bloqueado: checked })}
                  disabled={!isEditing}
                />
              </div>

              {formData.bloqueado && (
                <div className="space-y-2">
                  <Label>Razón del Bloqueo</Label>
                  {isEditing ? (
                    <Textarea
                      value={formData.razon_bloqueo}
                      onChange={(e) => setFormData({ ...formData, razon_bloqueo: e.target.value })}
                      placeholder="Motivo del bloqueo..."
                      rows={2}
                    />
                  ) : (
                    <p className="text-sm text-destructive">{bin.razon_bloqueo || '-'}</p>
                  )}
                </div>
              )}
            </div>

            {/* Activo */}
            <div className="flex items-center justify-between">
              <div>
                <Label>Activo</Label>
                <p className="text-xs text-muted-foreground">Disponible para uso</p>
              </div>
              <Switch
                checked={formData.activo}
                onCheckedChange={(checked) => setFormData({ ...formData, activo: checked })}
                disabled={!isEditing}
              />
            </div>

            {/* Fechas */}
            <div className="space-y-3 pt-4 border-t">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">Creado</p>
                  <p>{new Date(bin.created_at).toLocaleDateString('es-AR')}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Actualizado</p>
                  <p>{new Date(bin.updated_at).toLocaleDateString('es-AR')}</p>
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>

        {/* Acciones */}
        <div className="flex gap-2 mt-6 pt-4 border-t">
          {isEditing ? (
            <>
              <Button onClick={handleSave} className="flex-1">
                <Save className="h-4 w-4 mr-2" />
                Guardar
              </Button>
              <Button variant="outline" onClick={handleCancel}>
                <X className="h-4 w-4 mr-2" />
                Cancelar
              </Button>
            </>
          ) : (
            <>
              <Button onClick={() => setIsEditing(true)} className="flex-1">
                <Edit className="h-4 w-4 mr-2" />
                Editar
              </Button>
              {!bin.bloqueado ? (
                <Button
                  variant="outline"
                  onClick={() => {
                    setFormData({ ...formData, bloqueado: true })
                    setIsEditing(true)
                  }}
                >
                  <Lock className="h-4 w-4 mr-2" />
                  Bloquear
                </Button>
              ) : (
                <Button
                  variant="outline"
                  onClick={() => onEdit({ bloqueado: false, razon_bloqueo: null })}
                >
                  <Unlock className="h-4 w-4 mr-2" />
                  Desbloquear
                </Button>
              )}
              <Button variant="destructive" onClick={onDelete}>
                <Trash2 className="h-4 w-4" />
              </Button>
            </>
          )}
        </div>
      </SheetContent>
    </Sheet>
  )
}
