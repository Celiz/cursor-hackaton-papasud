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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Serial } from '@/app/dashboard/inventario/seriales/columns'
import {
  Hash,
  Package,
  MapPin,
  Shield,
  User,
  Calendar,
  DollarSign,
  Edit,
  Save,
  X,
  AlertTriangle,
  CheckCircle,
} from 'lucide-react'

interface SerialDetailSheetProps {
  serial: Serial
  open: boolean
  onOpenChange: (open: boolean) => void
  onEdit: (data: Partial<Serial>) => void
}

const ESTADO_OPTIONS = [
  { value: 'stock', label: 'En Stock' },
  { value: 'vendido', label: 'Vendido' },
  { value: 'comodato', label: 'Comodato' },
  { value: 'servicio_tecnico', label: 'Servicio Técnico' },
  { value: 'reparacion', label: 'En Reparación' },
  { value: 'baja', label: 'Baja' },
]

const ESTADO_STYLES: Record<string, { variant: 'default' | 'secondary' | 'destructive' | 'outline'; label: string }> = {
  stock: { variant: 'default', label: 'En Stock' },
  vendido: { variant: 'secondary', label: 'Vendido' },
  comodato: { variant: 'outline', label: 'Comodato' },
  servicio_tecnico: { variant: 'outline', label: 'Servicio Técnico' },
  baja: { variant: 'destructive', label: 'Baja' },
  reparacion: { variant: 'outline', label: 'En Reparación' },
}

export function SerialDetailSheet({
  serial,
  open,
  onOpenChange,
  onEdit,
}: SerialDetailSheetProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [formData, setFormData] = useState({
    estado: serial.estado,
    garantia_meses: serial.garantia_meses || '',
    costo_adquisicion: serial.costo_adquisicion?.toString() || '',
    factura_venta: serial.factura_venta || '',
  })

  const handleSave = () => {
    onEdit({
      estado: formData.estado as Serial['estado'],
      garantia_meses: formData.garantia_meses ? Number(formData.garantia_meses) : null,
      costo_adquisicion: formData.costo_adquisicion ? parseFloat(formData.costo_adquisicion) : null,
      factura_venta: formData.factura_venta || null,
    })
    setIsEditing(false)
  }

  const handleCancel = () => {
    setFormData({
      estado: serial.estado,
      garantia_meses: serial.garantia_meses || '',
      costo_adquisicion: serial.costo_adquisicion?.toString() || '',
      factura_venta: serial.factura_venta || '',
    })
    setIsEditing(false)
  }

  // Calcular estado de garantía
  const getGarantiaStatus = () => {
    if (!serial.garantia_hasta) return null

    const hoy = new Date()
    const fechaGarantia = new Date(serial.garantia_hasta)
    const diasRestantes = Math.ceil((fechaGarantia.getTime() - hoy.getTime()) / (1000 * 60 * 60 * 24))

    if (diasRestantes < 0) {
      return { icon: AlertTriangle, color: 'text-destructive', text: 'Garantía vencida' }
    }
    if (diasRestantes <= 30) {
      return { icon: AlertTriangle, color: 'text-amber-600', text: `${diasRestantes} días restantes` }
    }
    return { icon: CheckCircle, color: 'text-green-600', text: 'Garantía vigente' }
  }

  const garantiaStatus = getGarantiaStatus()
  const estadoStyle = ESTADO_STYLES[serial.estado] || { variant: 'secondary', label: serial.estado }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-[540px] overflow-y-auto">
        <SheetHeader className="pb-4 border-b">
          <div className="flex items-start justify-between">
            <div>
              <SheetTitle className="flex items-center gap-2">
                <Hash className="h-5 w-5" />
                {serial.numero_serie}
              </SheetTitle>
              <p className="text-sm text-muted-foreground mt-1">
                {serial.producto?.nombre || 'Sin producto'}
              </p>
            </div>
            <Badge variant={estadoStyle.variant}>{estadoStyle.label}</Badge>
          </div>
        </SheetHeader>

        <Tabs defaultValue="info" className="mt-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="info">Información</TabsTrigger>
            <TabsTrigger value="ubicacion">Ubicación</TabsTrigger>
            <TabsTrigger value="garantia">Garantía</TabsTrigger>
          </TabsList>

          <TabsContent value="info" className="space-y-6 mt-4">
            {/* Producto */}
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-sm font-medium">
                <Package className="h-4 w-4" />
                Producto
              </div>
              <div className="p-3 bg-muted rounded-lg">
                <p className="font-medium">{serial.producto?.nombre || '-'}</p>
                {serial.producto?.codigo && (
                  <p className="text-sm text-muted-foreground">Código: {serial.producto.codigo}</p>
                )}
              </div>
            </div>

            {/* Estado */}
            <div className="space-y-3">
              <Label>Estado</Label>
              {isEditing ? (
                <Select
                  value={formData.estado}
                  onValueChange={(value) => setFormData({ ...formData, estado: value as Serial['estado'] })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ESTADO_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <Badge variant={estadoStyle.variant}>{estadoStyle.label}</Badge>
              )}
            </div>

            {/* Lote */}
            {serial.lote?.numero_lote && (
              <div className="space-y-3">
                <Label>Lote</Label>
                <p className="font-mono">{serial.lote.numero_lote}</p>
                {serial.lote.fecha_vencimiento && (
                  <p className="text-sm text-muted-foreground">
                    Vence: {new Date(serial.lote.fecha_vencimiento).toLocaleDateString('es-AR')}
                  </p>
                )}
              </div>
            )}

            {/* Costo */}
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-sm font-medium">
                <DollarSign className="h-4 w-4" />
                Costo de Adquisición
              </div>
              {isEditing ? (
                <Input
                  type="number"
                  step="0.01"
                  value={formData.costo_adquisicion}
                  onChange={(e) => setFormData({ ...formData, costo_adquisicion: e.target.value })}
                  placeholder="0.00"
                />
              ) : (
                <p className="text-lg font-medium">
                  {serial.costo_adquisicion
                    ? `$${Number(serial.costo_adquisicion).toLocaleString('es-AR', { minimumFractionDigits: 2 })}`
                    : '-'}
                </p>
              )}
            </div>

            {/* Factura venta */}
            {(serial.estado === 'vendido' || isEditing) && (
              <div className="space-y-3">
                <Label>Factura de Venta</Label>
                {isEditing ? (
                  <Input
                    value={formData.factura_venta}
                    onChange={(e) => setFormData({ ...formData, factura_venta: e.target.value })}
                    placeholder="ej: FA-0001-00001234"
                  />
                ) : (
                  <p>{serial.factura_venta || '-'}</p>
                )}
              </div>
            )}

            {/* Fecha venta */}
            {serial.fecha_venta && (
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <Calendar className="h-4 w-4" />
                  Fecha de Venta
                </div>
                <p>{new Date(serial.fecha_venta).toLocaleDateString('es-AR')}</p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="ubicacion" className="space-y-6 mt-4">
            {/* Depósito */}
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-sm font-medium">
                <MapPin className="h-4 w-4" />
                Depósito
              </div>
              <p className="text-lg">{serial.deposito?.nombre || 'Sin asignar'}</p>
            </div>

            {/* Bin */}
            {serial.bin && (
              <div className="space-y-3">
                <Label>Ubicación (Bin)</Label>
                <p>
                  {serial.bin.codigo || serial.bin.nombre || '-'}
                </p>
              </div>
            )}

            {/* Cliente */}
            {serial.cliente && (
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <User className="h-4 w-4" />
                  Cliente
                </div>
                <p>{serial.cliente.nombre || serial.cliente.razon_social || '-'}</p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="garantia" className="space-y-6 mt-4">
            {/* Estado de Garantía */}
            {garantiaStatus && (
              <div className={`flex items-center gap-2 p-3 rounded-lg bg-muted ${garantiaStatus.color}`}>
                <garantiaStatus.icon className="h-5 w-5" />
                <span className="font-medium">{garantiaStatus.text}</span>
              </div>
            )}

            {/* Meses de Garantía */}
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-sm font-medium">
                <Shield className="h-4 w-4" />
                Meses de Garantía
              </div>
              {isEditing ? (
                <Input
                  type="number"
                  value={formData.garantia_meses}
                  onChange={(e) => setFormData({ ...formData, garantia_meses: e.target.value })}
                  placeholder="12"
                />
              ) : (
                <p className="text-lg">{serial.garantia_meses ? `${serial.garantia_meses} meses` : 'Sin garantía'}</p>
              )}
            </div>

            {/* Fecha hasta */}
            {serial.garantia_hasta && (
              <div className="space-y-3">
                <Label>Válida hasta</Label>
                <p className="text-lg">
                  {new Date(serial.garantia_hasta).toLocaleDateString('es-AR', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })}
                </p>
              </div>
            )}

            {/* Fechas */}
            <div className="space-y-3">
              <Label>Registrado</Label>
              <p className="text-sm text-muted-foreground">
                {new Date(serial.created_at).toLocaleDateString('es-AR', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                })}
              </p>
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
            <Button onClick={() => setIsEditing(true)} className="flex-1">
              <Edit className="h-4 w-4 mr-2" />
              Editar
            </Button>
          )}
        </div>
      </SheetContent>
    </Sheet>
  )
}
