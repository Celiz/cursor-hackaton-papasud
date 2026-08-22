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
import { Conteo } from '@/app/dashboard/inventario/conteos/columns'
import {
  ClipboardList,
  Warehouse,
  Calendar,
  Package,
  Play,
  Trash2,
  AlertTriangle,
  CheckCircle,
} from 'lucide-react'

interface ConteoDetailSheetProps {
  conteo: Conteo
  open: boolean
  onOpenChange: (open: boolean) => void
  onEdit: (data: Partial<Conteo>) => void
  onStart: () => void
  onDelete: () => void
}

const ESTADO_STYLES: Record<string, { variant: 'default' | 'secondary' | 'outline' | 'destructive'; label: string }> = {
  planificado: { variant: 'secondary', label: 'Planificado' },
  en_curso: { variant: 'default', label: 'En Curso' },
  completado: { variant: 'default', label: 'Completado' },
  cancelado: { variant: 'destructive', label: 'Cancelado' },
}

const TIPO_LABELS: Record<string, string> = {
  ciclico: 'Cíclico',
  completo: 'Completo',
  parcial: 'Parcial',
  sorpresa: 'Sorpresa',
}

export function ConteoDetailSheet({
  conteo,
  open,
  onOpenChange,
  onStart,
  onDelete,
}: ConteoDetailSheetProps) {
  const estadoStyle = ESTADO_STYLES[conteo.estado] || { variant: 'secondary', label: conteo.estado }
  const canStart = conteo.estado === 'planificado'
  const canDelete = conteo.estado === 'planificado' || conteo.estado === 'en_curso'

  // Calcular progreso
  const total = conteo.total_items || 0
  const contados = conteo.items_contados || 0
  const porcentaje = total > 0 ? (contados / total) * 100 : 0

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-[600px] overflow-y-auto">
        <SheetHeader className="pb-4 border-b">
          <div className="flex items-start justify-between">
            <div>
              <SheetTitle className="flex items-center gap-2">
                <ClipboardList className="h-5 w-5" />
                {conteo.numero}
              </SheetTitle>
              <p className="text-sm text-muted-foreground mt-1">
                {conteo.nombre}
              </p>
            </div>
            <Badge variant={estadoStyle.variant}>{estadoStyle.label}</Badge>
          </div>
        </SheetHeader>

        <Tabs defaultValue="info" className="mt-6">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="info">Información</TabsTrigger>
            <TabsTrigger value="items">Items ({conteo.total_items})</TabsTrigger>
          </TabsList>

          <TabsContent value="info" className="space-y-6 mt-4">
            {/* Descripción */}
            {conteo.descripcion && (
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">{conteo.descripcion}</p>
              </div>
            )}

            {/* Depósito */}
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-sm font-medium">
                <Warehouse className="h-4 w-4" />
                Depósito
              </div>
              <p>{conteo.deposito?.nombre || 'Todos los depósitos'}</p>
            </div>

            {/* Tipo de conteo */}
            <div className="space-y-3">
              <p className="text-sm font-medium">Tipo de Conteo</p>
              <Badge variant="outline">{TIPO_LABELS[conteo.tipo_conteo] || conteo.tipo_conteo}</Badge>
            </div>

            {/* Fecha programada */}
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-sm font-medium">
                <Calendar className="h-4 w-4" />
                Fecha Programada
              </div>
              <p className="text-lg">
                {conteo.fecha_programada
                  ? new Date(conteo.fecha_programada).toLocaleDateString('es-AR', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                    })
                  : 'Sin fecha'}
              </p>
            </div>

            {/* Progreso */}
            <div className="space-y-3">
              <p className="text-sm font-medium">Progreso del Conteo</p>
              <div className="space-y-2">
                <div className="flex items-center gap-3">
                  <div className="flex-1 h-3 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary transition-all"
                      style={{ width: `${Math.min(porcentaje, 100)}%` }}
                    />
                  </div>
                  <span className="text-lg font-bold">{porcentaje.toFixed(0)}%</span>
                </div>
                <p className="text-sm text-muted-foreground">
                  {contados} de {total} items contados
                </p>
              </div>
            </div>

            {/* Estadísticas */}
            <div className="grid grid-cols-3 gap-4 p-4 bg-muted rounded-lg">
              <div className="text-center">
                <Package className="h-5 w-5 mx-auto mb-1 text-muted-foreground" />
                <p className="text-2xl font-bold">{conteo.total_items}</p>
                <p className="text-xs text-muted-foreground">Total Items</p>
              </div>
              <div className="text-center">
                <CheckCircle className="h-5 w-5 mx-auto mb-1 text-green-600" />
                <p className="text-2xl font-bold">{conteo.items_contados}</p>
                <p className="text-xs text-muted-foreground">Contados</p>
              </div>
              <div className="text-center">
                <AlertTriangle className="h-5 w-5 mx-auto mb-1 text-amber-600" />
                <p className="text-2xl font-bold">{conteo.items_con_diferencia}</p>
                <p className="text-xs text-muted-foreground">Con Diferencia</p>
              </div>
            </div>

            {/* Fechas de ejecución */}
            {(conteo.fecha_inicio || conteo.fecha_fin) && (
              <div className="grid grid-cols-2 gap-4 pt-4 border-t">
                {conteo.fecha_inicio && (
                  <div>
                    <p className="text-sm text-muted-foreground">Iniciado</p>
                    <p>{new Date(conteo.fecha_inicio).toLocaleDateString('es-AR')}</p>
                  </div>
                )}
                {conteo.fecha_fin && (
                  <div>
                    <p className="text-sm text-muted-foreground">Finalizado</p>
                    <p>{new Date(conteo.fecha_fin).toLocaleDateString('es-AR')}</p>
                  </div>
                )}
              </div>
            )}

            {/* Valor diferencias */}
            {conteo.valor_total_diferencias != null && conteo.valor_total_diferencias !== 0 && (
              <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
                <p className="text-sm text-amber-700 font-medium">Valor Total de Diferencias</p>
                <p className="text-2xl font-bold text-amber-700">
                  ${Number(conteo.valor_total_diferencias).toLocaleString('es-AR', { minimumFractionDigits: 2 })}
                </p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="items" className="mt-4">
            <div className="space-y-3">
              {Array.isArray(conteo.items) && conteo.items.length > 0 ? (
                conteo.items.map((item) => (
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
                      <div className="flex items-center gap-2">
                        <span className="text-muted-foreground">{item.cantidad_sistema}</span>
                        <span>→</span>
                        <span className={`font-bold ${item.diferencia && item.diferencia !== 0 ? 'text-amber-600' : 'text-green-600'}`}>
                          {item.cantidad_contada ?? '?'}
                        </span>
                      </div>
                      {item.diferencia != null && item.diferencia !== 0 && (
                        <p className="text-xs text-amber-600">
                          Dif: {item.diferencia > 0 ? '+' : ''}{item.diferencia}
                        </p>
                      )}
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-center text-muted-foreground py-8">
                  No hay items en este conteo
                </p>
              )}
            </div>
          </TabsContent>
        </Tabs>

        {/* Acciones */}
        <div className="flex gap-2 mt-6 pt-4 border-t">
          {canStart && (
            <Button onClick={onStart} className="flex-1">
              <Play className="h-4 w-4 mr-2" />
              Iniciar Conteo
            </Button>
          )}
          {canDelete && (
            <Button variant="destructive" onClick={onDelete}>
              <Trash2 className="h-4 w-4 mr-2" />
              {conteo.estado === 'planificado' ? 'Eliminar' : 'Cancelar'}
            </Button>
          )}
          {!canStart && !canDelete && (
            <p className="text-sm text-muted-foreground text-center w-full py-2">
              Este conteo no puede ser modificado
            </p>
          )}
        </div>
      </SheetContent>
    </Sheet>
  )
}
