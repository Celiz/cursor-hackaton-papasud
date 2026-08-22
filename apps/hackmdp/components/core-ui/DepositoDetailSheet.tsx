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
import { Deposito } from '@/app/dashboard/inventario/depositos/columns'
import {
  Warehouse,
  MapPin,
  Thermometer,
  Package,
  User,
  Edit,
  Save,
  X,
  Trash2,
  Star,
  Phone,
} from 'lucide-react'

interface DepositoDetailSheetProps {
  deposito: Deposito
  open: boolean
  onOpenChange: (open: boolean) => void
  onEdit: (data: Partial<Deposito>) => void
  onDelete: () => void
}

const TIPO_OPTIONS = [
  { value: 'almacen', label: 'Almacén' },
  { value: 'tienda', label: 'Tienda' },
  { value: 'frigorifico', label: 'Frigorífico' },
  { value: 'transito', label: 'Tránsito' },
  { value: 'devolucion', label: 'Devolución' },
  { value: 'cuarentena', label: 'Cuarentena' },
]

const TIPO_STYLES: Record<string, { variant: 'default' | 'secondary' | 'outline'; label: string }> = {
  almacen: { variant: 'default', label: 'Almacén' },
  tienda: { variant: 'secondary', label: 'Tienda' },
  frigorifico: { variant: 'outline', label: 'Frigorífico' },
  transito: { variant: 'outline', label: 'Tránsito' },
  devolucion: { variant: 'outline', label: 'Devolución' },
  cuarentena: { variant: 'outline', label: 'Cuarentena' },
}

export function DepositoDetailSheet({
  deposito,
  open,
  onOpenChange,
  onEdit,
  onDelete,
}: DepositoDetailSheetProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [formData, setFormData] = useState({
    nombre: deposito.nombre,
    tipo: deposito.tipo,
    direccion: deposito.direccion || '',
    ciudad: deposito.ciudad || '',
    provincia: deposito.provincia || '',
    codigo_postal: deposito.codigo_postal || '',
    telefono: deposito.telefono || '',
    responsable: deposito.responsable || '',
    capacidad_m3: deposito.capacidad_m3?.toString() || '',
    temperatura_controlada: deposito.temperatura_controlada,
    temperatura_min: deposito.temperatura_min?.toString() || '',
    temperatura_max: deposito.temperatura_max?.toString() || '',
    requiere_autorizacion: deposito.requiere_autorizacion,
    permite_picking: deposito.permite_picking,
    permite_recepcion: deposito.permite_recepcion,
    es_principal: deposito.es_principal,
    activo: deposito.activo,
    notas: deposito.notas || '',
  })

  const handleSave = () => {
    onEdit({
      nombre: formData.nombre,
      tipo: formData.tipo as Deposito['tipo'],
      direccion: formData.direccion || null,
      ciudad: formData.ciudad || null,
      provincia: formData.provincia || null,
      codigo_postal: formData.codigo_postal || null,
      telefono: formData.telefono || null,
      responsable: formData.responsable || null,
      capacidad_m3: formData.capacidad_m3 ? parseFloat(formData.capacidad_m3) : null,
      temperatura_controlada: formData.temperatura_controlada,
      temperatura_min: formData.temperatura_min ? parseFloat(formData.temperatura_min) : null,
      temperatura_max: formData.temperatura_max ? parseFloat(formData.temperatura_max) : null,
      requiere_autorizacion: formData.requiere_autorizacion,
      permite_picking: formData.permite_picking,
      permite_recepcion: formData.permite_recepcion,
      es_principal: formData.es_principal,
      activo: formData.activo,
      notas: formData.notas || null,
    })
    setIsEditing(false)
  }

  const handleCancel = () => {
    setFormData({
      nombre: deposito.nombre,
      tipo: deposito.tipo,
      direccion: deposito.direccion || '',
      ciudad: deposito.ciudad || '',
      provincia: deposito.provincia || '',
      codigo_postal: deposito.codigo_postal || '',
      telefono: deposito.telefono || '',
      responsable: deposito.responsable || '',
      capacidad_m3: deposito.capacidad_m3?.toString() || '',
      temperatura_controlada: deposito.temperatura_controlada,
      temperatura_min: deposito.temperatura_min?.toString() || '',
      temperatura_max: deposito.temperatura_max?.toString() || '',
      requiere_autorizacion: deposito.requiere_autorizacion,
      permite_picking: deposito.permite_picking,
      permite_recepcion: deposito.permite_recepcion,
      es_principal: deposito.es_principal,
      activo: deposito.activo,
      notas: deposito.notas || '',
    })
    setIsEditing(false)
  }

  const tipoStyle = TIPO_STYLES[deposito.tipo] || { variant: 'secondary', label: deposito.tipo }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-[600px] overflow-y-auto">
        <SheetHeader className="pb-4 border-b">
          <div className="flex items-start justify-between">
            <div>
              <SheetTitle className="flex items-center gap-2">
                <Warehouse className="h-5 w-5" />
                {deposito.nombre}
                {deposito.es_principal && (
                  <Star className="h-4 w-4 text-amber-500 fill-amber-500" />
                )}
              </SheetTitle>
              <p className="text-sm text-muted-foreground mt-1 font-mono">
                {deposito.codigo}
              </p>
            </div>
            <div className="flex gap-2">
              <Badge variant={tipoStyle.variant}>{tipoStyle.label}</Badge>
              <Badge variant={deposito.activo ? 'default' : 'destructive'}>
                {deposito.activo ? 'Activo' : 'Inactivo'}
              </Badge>
            </div>
          </div>
        </SheetHeader>

        <Tabs defaultValue="info" className="mt-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="info">Información</TabsTrigger>
            <TabsTrigger value="ubicacion">Ubicación</TabsTrigger>
            <TabsTrigger value="config">Configuración</TabsTrigger>
          </TabsList>

          <TabsContent value="info" className="space-y-6 mt-4">
            {/* Nombre */}
            <div className="space-y-3">
              <Label>Nombre</Label>
              {isEditing ? (
                <Input
                  value={formData.nombre}
                  onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                />
              ) : (
                <p className="font-medium">{deposito.nombre}</p>
              )}
            </div>

            {/* Tipo */}
            <div className="space-y-3">
              <Label>Tipo</Label>
              {isEditing ? (
                <Select
                  value={formData.tipo}
                  onValueChange={(value) => setFormData({ ...formData, tipo: value as Deposito['tipo'] })}
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

            {/* Responsable */}
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-sm font-medium">
                <User className="h-4 w-4" />
                Responsable
              </div>
              {isEditing ? (
                <Input
                  value={formData.responsable}
                  onChange={(e) => setFormData({ ...formData, responsable: e.target.value })}
                  placeholder="Nombre del responsable"
                />
              ) : (
                <p>{deposito.responsable || '-'}</p>
              )}
            </div>

            {/* Teléfono */}
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-sm font-medium">
                <Phone className="h-4 w-4" />
                Teléfono
              </div>
              {isEditing ? (
                <Input
                  value={formData.telefono}
                  onChange={(e) => setFormData({ ...formData, telefono: e.target.value })}
                  placeholder="+54 11 1234-5678"
                />
              ) : (
                <p>{deposito.telefono || '-'}</p>
              )}
            </div>

            {/* Capacidad */}
            <div className="space-y-3">
              <Label>Capacidad (m³)</Label>
              {isEditing ? (
                <Input
                  type="number"
                  value={formData.capacidad_m3}
                  onChange={(e) => setFormData({ ...formData, capacidad_m3: e.target.value })}
                  placeholder="100"
                />
              ) : (
                <p>{deposito.capacidad_m3 ? `${deposito.capacidad_m3} m³` : '-'}</p>
              )}
            </div>

            {/* Stock Info */}
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-sm font-medium">
                <Package className="h-4 w-4" />
                Stock Actual
              </div>
              <div className="p-3 bg-muted rounded-lg grid grid-cols-3 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Bins</p>
                  <p className="text-lg font-bold">{deposito.total_bins || 0}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Unidades</p>
                  <p className="text-lg font-bold">{(deposito.total_stock || 0).toLocaleString('es-AR')}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Reservado</p>
                  <p className="text-lg font-bold">{(deposito.total_reservado || 0).toLocaleString('es-AR')}</p>
                </div>
              </div>
            </div>

            {/* Notas */}
            <div className="space-y-3">
              <Label>Notas</Label>
              {isEditing ? (
                <Textarea
                  value={formData.notas}
                  onChange={(e) => setFormData({ ...formData, notas: e.target.value })}
                  rows={3}
                />
              ) : (
                <p className="text-sm">{deposito.notas || '-'}</p>
              )}
            </div>
          </TabsContent>

          <TabsContent value="ubicacion" className="space-y-6 mt-4">
            {/* Dirección */}
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-sm font-medium">
                <MapPin className="h-4 w-4" />
                Dirección
              </div>
              {isEditing ? (
                <Input
                  value={formData.direccion}
                  onChange={(e) => setFormData({ ...formData, direccion: e.target.value })}
                  placeholder="Av. Ejemplo 1234"
                />
              ) : (
                <p>{deposito.direccion || '-'}</p>
              )}
            </div>

            {/* Ciudad y Provincia */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-3">
                <Label>Ciudad</Label>
                {isEditing ? (
                  <Input
                    value={formData.ciudad}
                    onChange={(e) => setFormData({ ...formData, ciudad: e.target.value })}
                  />
                ) : (
                  <p>{deposito.ciudad || '-'}</p>
                )}
              </div>
              <div className="space-y-3">
                <Label>Provincia</Label>
                {isEditing ? (
                  <Input
                    value={formData.provincia}
                    onChange={(e) => setFormData({ ...formData, provincia: e.target.value })}
                  />
                ) : (
                  <p>{deposito.provincia || '-'}</p>
                )}
              </div>
            </div>

            {/* Código Postal */}
            <div className="space-y-3">
              <Label>Código Postal</Label>
              {isEditing ? (
                <Input
                  value={formData.codigo_postal}
                  onChange={(e) => setFormData({ ...formData, codigo_postal: e.target.value })}
                />
              ) : (
                <p>{deposito.codigo_postal || '-'}</p>
              )}
            </div>
          </TabsContent>

          <TabsContent value="config" className="space-y-6 mt-4">
            {/* Temperatura Controlada */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-sm font-medium">
                <Thermometer className="h-4 w-4" />
                Control de Temperatura
              </div>

              <div className="flex items-center justify-between">
                <Label>Temperatura Controlada</Label>
                <Switch
                  checked={formData.temperatura_controlada}
                  onCheckedChange={(checked) => setFormData({ ...formData, temperatura_controlada: checked })}
                  disabled={!isEditing}
                />
              </div>

              {formData.temperatura_controlada && (
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Temp. Mínima (°C)</Label>
                    {isEditing ? (
                      <Input
                        type="number"
                        value={formData.temperatura_min}
                        onChange={(e) => setFormData({ ...formData, temperatura_min: e.target.value })}
                      />
                    ) : (
                      <p>{deposito.temperatura_min ?? '-'}°C</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label>Temp. Máxima (°C)</Label>
                    {isEditing ? (
                      <Input
                        type="number"
                        value={formData.temperatura_max}
                        onChange={(e) => setFormData({ ...formData, temperatura_max: e.target.value })}
                      />
                    ) : (
                      <p>{deposito.temperatura_max ?? '-'}°C</p>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Permisos */}
            <div className="space-y-4">
              <h3 className="text-sm font-medium">Operaciones Permitidas</h3>

              <div className="flex items-center justify-between">
                <div>
                  <Label>Permite Picking</Label>
                  <p className="text-xs text-muted-foreground">Preparación de pedidos</p>
                </div>
                <Switch
                  checked={formData.permite_picking}
                  onCheckedChange={(checked) => setFormData({ ...formData, permite_picking: checked })}
                  disabled={!isEditing}
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label>Permite Recepción</Label>
                  <p className="text-xs text-muted-foreground">Ingreso de mercadería</p>
                </div>
                <Switch
                  checked={formData.permite_recepcion}
                  onCheckedChange={(checked) => setFormData({ ...formData, permite_recepcion: checked })}
                  disabled={!isEditing}
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label>Requiere Autorización</Label>
                  <p className="text-xs text-muted-foreground">Para movimientos</p>
                </div>
                <Switch
                  checked={formData.requiere_autorizacion}
                  onCheckedChange={(checked) => setFormData({ ...formData, requiere_autorizacion: checked })}
                  disabled={!isEditing}
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label>Depósito Principal</Label>
                  <p className="text-xs text-muted-foreground">Default para operaciones</p>
                </div>
                <Switch
                  checked={formData.es_principal}
                  onCheckedChange={(checked) => setFormData({ ...formData, es_principal: checked })}
                  disabled={!isEditing}
                />
              </div>

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
              <Button variant="destructive" onClick={onDelete}>
                <Trash2 className="h-4 w-4 mr-2" />
                Desactivar
              </Button>
            </>
          )}
        </div>
      </SheetContent>
    </Sheet>
  )
}
