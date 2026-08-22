'use client'

import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Transferencia } from '@/app/dashboard/inventario/transferencias/columns'
import {
  ArrowRight,
  Warehouse,
  Calendar,
  Package,
  FileText,
  CheckCircle,
  Trash2,
} from 'lucide-react'

interface TransferenciaDetailSheetProps {
  transferencia: Transferencia
  open: boolean
  onOpenChange: (open: boolean) => void
  onEdit: (data: Partial<Transferencia>) => void
  onConfirm: () => void
  onDelete: () => void
}

const ESTADO_STYLES: Record<string, { variant: 'default' | 'secondary' | 'outline' | 'destructive'; label: string }> = {
  borrador: { variant: 'secondary', label: 'Borrador' },
  pendiente: { variant: 'outline', label: 'Pendiente' },
  en_transito: { variant: 'default', label: 'En Tránsito' },
  completada: { variant: 'default', label: 'Completada' },
  cancelada: { variant: 'destructive', label: 'Cancelada' },
}

export function TransferenciaDetailSheet({
  transferencia,
  open,
  onOpenChange,
  onConfirm,
  onDelete,
}: TransferenciaDetailSheetProps) {
  const estadoStyle = ESTADO_STYLES[transferencia.estado] || { variant: 'secondary', label: transferencia.estado }
  const canConfirm = transferencia.estado === 'borrador' || transferencia.estado === 'pendiente'
  const canDelete = transferencia.estado === 'borrador'

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-[600px] overflow-y-auto">
        <SheetHeader className="pb-4 border-b">
          <div className="flex items-start justify-between">
            <div>
              <SheetTitle className="flex items-center gap-2">
                <Package className="h-5 w-5" />
                {transferencia.numero}
              </SheetTitle>
              <p className="text-sm text-muted-foreground mt-1">
                Transferencia de inventario
              </p>
            </div>
            <Badge variant={estadoStyle.variant}>{estadoStyle.label}</Badge>
          </div>
        </SheetHeader>

        <Tabs defaultValue="info" className="mt-6">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="info">Información</TabsTrigger>
            <TabsTrigger value="items">Items ({transferencia.total_items})</TabsTrigger>
          </TabsList>

          <TabsContent value="info" className="space-y-6 mt-4">
            {/* Ruta */}
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-sm font-medium">
                <Warehouse className="h-4 w-4" />
                Ruta
              </div>
              <div className="p-4 bg-muted rounded-lg">
                <div className="flex items-center gap-4">
                  <div className="flex-1">
                    <p className="text-sm text-muted-foreground">Origen</p>
                    <p className="font-medium">{transferencia.origen?.nombre || '-'}</p>
                    <p className="text-xs text-muted-foreground">{transferencia.origen?.codigo}</p>
                  </div>
                  <ArrowRight className="h-6 w-6 text-muted-foreground" />
                  <div className="flex-1">
                    <p className="text-sm text-muted-foreground">Destino</p>
                    <p className="font-medium">{transferencia.destino?.nombre || '-'}</p>
                    <p className="text-xs text-muted-foreground">{transferencia.destino?.codigo}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Fecha */}
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-sm font-medium">
                <Calendar className="h-4 w-4" />
                Fecha de Transferencia
              </div>
              <p className="text-lg">
                {new Date(transferencia.fecha_transferencia).toLocaleDateString('es-AR', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                })}
              </p>
            </div>

            {/* Motivo */}
            {transferencia.motivo && (
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <FileText className="h-4 w-4" />
                  Motivo
                </div>
                <p className="text-sm">{transferencia.motivo}</p>
              </div>
            )}

            {/* Observaciones */}
            {transferencia.observaciones && (
              <div className="space-y-3">
                <p className="text-sm font-medium">Observaciones</p>
                <p className="text-sm text-muted-foreground">{transferencia.observaciones}</p>
              </div>
            )}

            {/* Totales */}
            <div className="grid grid-cols-2 gap-4 p-4 bg-muted rounded-lg">
              <div>
                <p className="text-sm text-muted-foreground">Total Items</p>
                <p className="text-2xl font-bold">{transferencia.total_items}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Unidades</p>
                <p className="text-2xl font-bold">{transferencia.total_cantidad}</p>
              </div>
            </div>

            {/* Fecha confirmación */}
            {transferencia.fecha_confirmacion && (
              <div className="space-y-3 pt-4 border-t">
                <p className="text-sm text-muted-foreground">Confirmada</p>
                <p>
                  {new Date(transferencia.fecha_confirmacion).toLocaleDateString('es-AR')}
                  {transferencia.confirmado_por && ` por ${transferencia.confirmado_por}`}
                </p>
              </div>
            )}

            {/* Fechas sistema */}
            <div className="grid grid-cols-2 gap-4 text-sm pt-4 border-t">
              <div>
                <p className="text-muted-foreground">Creada</p>
                <p>{new Date(transferencia.created_at).toLocaleDateString('es-AR')}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Actualizada</p>
                <p>{new Date(transferencia.updated_at).toLocaleDateString('es-AR')}</p>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="items" className="mt-4">
            <div className="space-y-3">
              {Array.isArray(transferencia.items) && transferencia.items.length > 0 ? (
                transferencia.items.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between p-3 bg-muted rounded-lg"
                  >
                    <div className="flex-1">
                      <p className="font-medium">{item.producto?.nombre || 'Producto'}</p>
                      {item.producto?.codigo && (
                        <p className="text-xs text-muted-foreground">{item.producto.codigo}</p>
                      )}
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-lg">{item.cantidad}</p>
                      <p className="text-xs text-muted-foreground">unidades</p>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-center text-muted-foreground py-8">
                  No hay items en esta transferencia
                </p>
              )}
            </div>
          </TabsContent>
        </Tabs>

        {/* Acciones */}
        <div className="flex gap-2 mt-6 pt-4 border-t">
          {canConfirm && (
            <Button onClick={onConfirm} className="flex-1">
              <CheckCircle className="h-4 w-4 mr-2" />
              Confirmar
            </Button>
          )}
          {canDelete && (
            <Button variant="destructive" onClick={onDelete}>
              <Trash2 className="h-4 w-4 mr-2" />
              Eliminar
            </Button>
          )}
          {!canConfirm && !canDelete && (
            <p className="text-sm text-muted-foreground text-center w-full py-2">
              Esta transferencia no puede ser modificada
            </p>
          )}
        </div>
      </SheetContent>
    </Sheet>
  )
}
