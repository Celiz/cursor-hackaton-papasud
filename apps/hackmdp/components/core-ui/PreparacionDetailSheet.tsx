'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { sheetClasses } from '@/lib/design-system';
import { cn } from '@/lib/utils';
import {
  TableSecondaryText,
  TableCodeText,
} from '@/components/core-ui/TableTextTruncate';
import {
  Building2,
  MapPin,
  Calendar,
  Clock,
  CheckCircle2,
  Wrench,
  Truck,
  Package,
  Trash2,
  Save,
  Info,
  User,
  Send,
  Loader2,
  Pencil,
  X,
} from 'lucide-react';
import { toast } from 'sonner';
import { useOrgFeatures } from '@/lib/hooks/use-org-features';
import type { PreparacionOrden, PreparacionItem } from '@/app/dashboard/preparacion-entregas/page.client';

interface PreparacionDetailSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  orden: PreparacionOrden | null;
  onUpdate: () => void;
}

const estadoOrdenConfig: Record<string, { label: string; color: string; icon: any }> = {
  pendiente: { label: 'Pendiente', color: 'gray', icon: Clock },
  en_preparacion: { label: 'En Preparación', color: 'blue', icon: Wrench },
  listo: { label: 'Listo para Enviar', color: 'green', icon: CheckCircle2 },
  despachado: { label: 'Despachado', color: 'purple', icon: Truck },
};

const estadoItemConfig: Record<string, { label: string; dotColor: string; bgColor: string }> = {
  pendiente: { label: 'Pendiente', dotColor: 'bg-gray-400', bgColor: 'bg-gray-500/10 text-gray-600 dark:text-gray-400' },
  en_deposito: { label: 'En Depósito', dotColor: 'bg-yellow-500', bgColor: 'bg-yellow-500/10 text-yellow-700 dark:text-yellow-400' },
  probado: { label: 'Probado', dotColor: 'bg-blue-500', bgColor: 'bg-blue-500/10 text-blue-700 dark:text-blue-400' },
  preparado: { label: 'Preparado', dotColor: 'bg-amber-500', bgColor: 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-200/50 dark:border-amber-800/30' },
  listo: { label: 'Listo', dotColor: 'bg-green-500', bgColor: 'bg-green-500/10 text-green-700 dark:text-green-400' },
};

const condicionConfig: Record<string, { label: string; color: string }> = {
  nuevo: { label: 'Nuevo', color: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400' },
  reacondicionado: { label: 'Reacondicionado', color: 'bg-amber-500/10 text-amber-700 dark:text-amber-400' },
  usado: { label: 'Usado', color: 'bg-orange-500/10 text-orange-700 dark:text-orange-400' },
  demo: { label: 'Demo', color: 'bg-cyan-500/10 text-cyan-700 dark:text-cyan-400' },
};

export function PreparacionDetailSheet({
  open,
  onOpenChange,
  orden,
  onUpdate,
}: PreparacionDetailSheetProps) {
  const [activeTab, setActiveTab] = useState('equipos');
  const [editingItem, setEditingItem] = useState<string | null>(null);
  const [itemUpdates, setItemUpdates] = useState<Record<string, Partial<PreparacionItem>>>({});
  const [isSaving, setIsSaving] = useState(false);

  const { features } = useOrgFeatures();
  const workflow = features?.preparacion?.itemWorkflow || 'equipment';
  const isSimple = workflow === 'simple';
  const itemLabel = features?.preparacion?.itemLabel || 'Equipos';
  const trackingEnabled = features?.entregas.trackingEnabled ?? false;
  const [tracking, setTracking] = useState('');
  const [transportista, setTransportista] = useState(features?.entregas.transportistas?.[0] || 'andreani');
  const [isDispatching, setIsDispatching] = useState(false);

  if (!orden) return null;

  const estadoConfig = estadoOrdenConfig[orden.estado] || estadoOrdenConfig.pendiente;
  const EstadoIcon = estadoConfig.icon;
  const estadoColor = estadoConfig.color;

  const handleItemEstadoChange = async (itemId: string, nuevoEstado: string) => {
    try {
      const updateData: any = { id: itemId, estado: nuevoEstado };
      if (nuevoEstado === 'probado') {
        updateData.fecha_prueba = new Date().toISOString();
        updateData.resultado_prueba = 'ok';
      }

      await fetch('/api/preparacion-entregas/items', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updateData),
      });

      toast.success('Estado actualizado');
      onUpdate();
    } catch (error) {
      console.error('Error updating item:', error);
      toast.error('Error al actualizar');
    }
  };

  const handleSaveItem = async (itemId: string) => {
    const updates = itemUpdates[itemId];
    if (!updates) return;

    setIsSaving(true);
    try {
      await fetch('/api/preparacion-entregas/items', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: itemId, ...updates }),
      });

      toast.success('Equipo actualizado');
      setEditingItem(null);
      setItemUpdates((prev) => {
        const newUpdates = { ...prev };
        delete newUpdates[itemId];
        return newUpdates;
      });
      onUpdate();
    } catch (error) {
      console.error('Error saving item:', error);
      toast.error('Error al guardar');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteItem = async (itemId: string) => {
    if (!confirm('¿Eliminar este equipo de la orden?')) return;

    try {
      await fetch(`/api/preparacion-entregas/items?id=${itemId}`, {
        method: 'DELETE',
      });

      toast.success('Equipo eliminado');
      onUpdate();
    } catch (error) {
      console.error('Error deleting item:', error);
      toast.error('Error al eliminar');
    }
  };

  const handleOrdenEstadoChange = async (nuevoEstado: string) => {
    try {
      const updateData: any = { id: orden.id, estado: nuevoEstado };
      if (nuevoEstado === 'listo') {
        updateData.fecha_listo = new Date().toISOString();
      } else if (nuevoEstado === 'despachado') {
        updateData.fecha_despacho = new Date().toISOString();
      }

      await fetch('/api/preparacion-entregas', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updateData),
      });

      toast.success('Estado de orden actualizado');
      onUpdate();
    } catch (error) {
      console.error('Error updating orden:', error);
      toast.error('Error al actualizar');
    }
  };

  const handleDispatch = async () => {
    if (!tracking.trim()) {
      toast.error('Ingresá el número de seguimiento');
      return;
    }
    setIsDispatching(true);
    try {
      const res = await fetch('/api/preparacion-entregas', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: orden.id,
          estado: 'despachado',
          fecha_despacho: new Date().toISOString(),
          transportista,
          numero_seguimiento: tracking.trim(),
          enviar_email: true,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast.success('Pedido despachado y email de tracking enviado');
      onUpdate();
    } catch (error: any) {
      toast.error(error.message || 'Error al despachar');
    } finally {
      setIsDispatching(false);
    }
  };

  const updateItemField = (itemId: string, field: string, value: string) => {
    setItemUpdates((prev) => ({
      ...prev,
      [itemId]: {
        ...prev[itemId],
        [field]: value,
      },
    }));
  };

  const getItemValue = (item: PreparacionItem, field: keyof PreparacionItem) => {
    const updates = itemUpdates[item.id];
    if (updates && field in updates) {
      return updates[field as keyof typeof updates] as string;
    }
    return item[field] || '';
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        className="w-full h-[100dvh] md:h-[90vh] overflow-hidden p-0 bg-white dark:bg-gray-950"
      >
        <div className="h-full flex flex-col">
          {/* Header */}
          <SheetHeader className="px-6 py-3 border-b border-purple-200/50 dark:border-purple-800/30 shrink-0">
            <div className="flex items-center gap-3 pr-8">
              <div className="flex items-center gap-3 min-w-0">
                <SheetTitle className="text-lg font-semibold text-foreground shrink-0">
                  Preparación
                </SheetTitle>
                <TableCodeText className="shrink-0">
                  {orden.numero}
                </TableCodeText>
                <span
                  className={cn(
                    'inline-flex items-center gap-1.5 px-3 h-7 rounded-full text-xs font-semibold',
                    `bg-${estadoColor}-500/10 text-${estadoColor}-600 dark:text-${estadoColor}-400`
                  )}
                >
                  <EstadoIcon className="w-3.5 h-3.5" />
                  {estadoConfig.label}
                </span>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-1.5 ml-auto shrink-0">
                {orden.estado === 'pendiente' && (
                  <Button
                    type="primary"
                    size="tiny"
                    onClick={() => handleOrdenEstadoChange('en_preparacion')}
                    icon={<Wrench />}
                  >
                    Iniciar Preparación
                  </Button>
                )}
                {orden.estado === 'en_preparacion' && (
                  <Button
                    type="primary"
                    size="tiny"
                    onClick={() => handleOrdenEstadoChange('listo')}
                    icon={<CheckCircle2 />}
                    className="bg-green-600 hover:bg-green-700 text-white border-green-600"
                  >
                    Marcar Listo
                  </Button>
                )}
                {orden.estado === 'listo' && !trackingEnabled && (
                  <Button
                    type="primary"
                    size="tiny"
                    onClick={() => handleOrdenEstadoChange('despachado')}
                    icon={<Truck />}
                    className="bg-purple-600 hover:bg-purple-700 text-white border-purple-600"
                  >
                    Despachar
                  </Button>
                )}
              </div>
            </div>

            {/* Cliente info row */}
            <div className="flex items-center gap-3 mt-1 text-sm">
              <div className="flex items-center gap-1.5 text-muted-foreground">
                <Building2 className="h-3.5 w-3.5" />
                <span className="font-medium text-foreground">
                  {orden.cliente_nombre || orden.cliente_nombre_full || 'Sin cliente'}
                </span>
              </div>
              {orden.tipo_cliente && (
                <Badge variant="outline" className="text-xs">
                  {orden.tipo_cliente}
                </Badge>
              )}
              {orden.ubicacion && (
                <span className="flex items-center gap-1 text-xs text-muted-foreground">
                  <MapPin className="h-3 w-3" />
                  {orden.ubicacion}
                </span>
              )}
              {orden.fecha_requerida && (
                <span className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Calendar className="h-3 w-3" />
                  Requerido: {new Date(orden.fecha_requerida).toLocaleDateString('es-AR')}
                </span>
              )}
            </div>
          </SheetHeader>

          {/* Tracking dispatch panel */}
          {trackingEnabled && (orden.estado === 'listo' || orden.estado === 'en_preparacion') && (
            <div className="mx-4 mt-3 space-y-3 p-4 border border-amber-200/50 dark:border-amber-800/30 rounded-xl bg-gradient-to-br from-white to-amber-50/20 dark:from-gray-900 dark:to-amber-950/10 shadow-sm">
              <h3 className="text-sm font-semibold flex items-center gap-2 text-amber-900 dark:text-amber-100">
                <Truck className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                Despachar Pedido
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {features?.entregas.transportistaSelector && (
                  <div className="space-y-1">
                    <TableSecondaryText>Transportista</TableSecondaryText>
                    <Select value={transportista} onValueChange={setTransportista}>
                      <SelectTrigger className="mt-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {(features.entregas.transportistas || []).map(t => (
                          <SelectItem key={t} value={t}>
                            {t === 'andreani' ? 'Andreani' : t === 'correo_argentino' ? 'Correo Argentino' : t.charAt(0).toUpperCase() + t.slice(1)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
                <div className="space-y-1">
                  <TableSecondaryText>Número de seguimiento</TableSecondaryText>
                  <Input
                    className="mt-1"
                    placeholder="Ej: 360000012345678"
                    value={tracking}
                    onChange={e => setTracking(e.target.value)}
                  />
                </div>
              </div>
              <Button
                type="primary"
                size="small"
                className="w-full bg-amber-600 hover:bg-amber-700 border-amber-600"
                onClick={handleDispatch}
                disabled={isDispatching || !tracking.trim()}
                icon={isDispatching ? <Loader2 className="animate-spin" /> : <Send />}
              >
                {isDispatching ? 'Despachando...' : 'Despachar y enviar tracking'}
              </Button>
            </div>
          )}

          {/* Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col overflow-hidden">
            <div className="px-6 pt-3 pb-2 shrink-0 border-b border-gray-200 dark:border-gray-800">
              <TabsList className={cn(sheetClasses.tabsList, 'grid-cols-2')}>
                <TabsTrigger value="equipos" className={cn(sheetClasses.tabsTrigger, 'gap-1.5')}>
                  <Package className="w-4 h-4" />
                  <span className="text-sm">{itemLabel} ({orden.items?.length || 0})</span>
                </TabsTrigger>
                <TabsTrigger value="info" className={cn(sheetClasses.tabsTrigger, 'gap-1.5')}>
                  <Info className="w-4 h-4" />
                  <span className="text-sm">Información</span>
                </TabsTrigger>
              </TabsList>
            </div>

            <div className="flex-1 overflow-y-auto">
              {/* Tab: Equipos */}
              <TabsContent value="equipos" className="mt-0 p-4 space-y-4">
                <motion.div
                  key="equipos"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, ease: 'easeOut' }}
                  className="space-y-4"
                >
                  {/* Status summary badges */}
                  <div className="flex flex-wrap gap-2">
                    {(isSimple ? [
                      { key: 'pendiente', count: orden.items_pendientes },
                      { key: 'preparado', count: orden.items_probados },
                      { key: 'listo', count: orden.items_listos },
                    ] : [
                      { key: 'pendiente', count: orden.items_pendientes },
                      { key: 'en_deposito', count: orden.items_en_deposito },
                      { key: 'probado', count: orden.items_probados },
                      { key: 'listo', count: orden.items_listos },
                    ]).map(({ key, count }) => {
                      const cfg = estadoItemConfig[key];
                      return (
                        <span
                          key={key}
                          className={cn(
                            'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium',
                            cfg.bgColor
                          )}
                        >
                          <span className={cn('w-2 h-2 rounded-full', cfg.dotColor)} />
                          {count} {cfg.label}
                        </span>
                      );
                    })}
                  </div>

                  {/* Equipment list */}
                  {orden.items && orden.items.length > 0 ? (
                    <div className="space-y-3">
                      {orden.items.map((item, idx) => {
                        const isEditing = editingItem === item.id;
                        const itemEstado = estadoItemConfig[item.estado] || estadoItemConfig.pendiente;
                        const itemCondicion = condicionConfig[item.condicion] || condicionConfig.nuevo;

                        return (
                          <motion.div
                            key={item.id}
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: idx * 0.05 }}
                            className="border border-gray-200 dark:border-gray-800 rounded-xl p-4 bg-white dark:bg-gray-900 hover:border-purple-300 dark:hover:border-purple-700 transition-colors space-y-3"
                          >
                            {/* Item header */}
                            <div className="flex items-start justify-between">
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="font-semibold text-sm">{item.tipo_equipo}</span>
                                  {!isSimple && (
                                    <span className={cn('inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium', itemCondicion.color)}>
                                      {itemCondicion.label}
                                    </span>
                                  )}
                                  <span className={cn('inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium', itemEstado.bgColor)}>
                                    <span className={cn('w-1.5 h-1.5 rounded-full', itemEstado.dotColor)} />
                                    {itemEstado.label}
                                  </span>
                                </div>
                                {!isSimple && (item.marca || item.modelo) && (
                                  <p className="text-xs text-muted-foreground mt-0.5">
                                    {[item.marca, item.modelo].filter(Boolean).join(' — ')}
                                  </p>
                                )}
                              </div>

                              <div className="flex items-center gap-1 shrink-0">
                                {!isEditing ? (
                                  <>
                                    <Button
                                      type="default"
                                      size="tiny"
                                      onClick={() => setEditingItem(item.id)}
                                      icon={<Pencil />}
                                      title="Editar"
                                    />
                                    <Button
                                      type="default"
                                      size="tiny"
                                      onClick={() => handleDeleteItem(item.id)}
                                      icon={<Trash2 className="text-red-500" />}
                                      title="Eliminar"
                                    />
                                  </>
                                ) : (
                                  <>
                                    <Button
                                      type="default"
                                      size="tiny"
                                      onClick={() => {
                                        setEditingItem(null);
                                        setItemUpdates((prev) => {
                                          const newUpdates = { ...prev };
                                          delete newUpdates[item.id];
                                          return newUpdates;
                                        });
                                      }}
                                      icon={<X />}
                                      title="Cancelar"
                                    />
                                    <Button
                                      type="primary"
                                      size="tiny"
                                      onClick={() => handleSaveItem(item.id)}
                                      disabled={isSaving}
                                      icon={<Save />}
                                    >
                                      Guardar
                                    </Button>
                                  </>
                                )}
                              </div>
                            </div>

                            {/* Item details / edit */}
                            {isEditing ? (
                              <div className="grid grid-cols-2 gap-3 pt-3 border-t border-gray-100 dark:border-gray-800">
                                <div className="space-y-1">
                                  <TableSecondaryText>Tipo Equipo</TableSecondaryText>
                                  <Input
                                    value={getItemValue(item, 'tipo_equipo')}
                                    onChange={(e) => updateItemField(item.id, 'tipo_equipo', e.target.value)}
                                    className="h-8 text-sm"
                                  />
                                </div>
                                {!isSimple && (
                                  <div className="space-y-1">
                                    <TableSecondaryText>Marca</TableSecondaryText>
                                    <Input
                                      value={getItemValue(item, 'marca')}
                                      onChange={(e) => updateItemField(item.id, 'marca', e.target.value)}
                                      className="h-8 text-sm"
                                    />
                                  </div>
                                )}
                                {!isSimple && (
                                  <div className="space-y-1">
                                    <TableSecondaryText>Modelo</TableSecondaryText>
                                    <Input
                                      value={getItemValue(item, 'modelo')}
                                      onChange={(e) => updateItemField(item.id, 'modelo', e.target.value)}
                                      className="h-8 text-sm"
                                    />
                                  </div>
                                )}
                                {!isSimple && (
                                  <div className="space-y-1">
                                    <TableSecondaryText>N° Serie</TableSecondaryText>
                                    <Input
                                      value={getItemValue(item, 'numero_serie')}
                                      onChange={(e) => updateItemField(item.id, 'numero_serie', e.target.value)}
                                      className="h-8 text-sm font-mono"
                                    />
                                  </div>
                                )}
                                <div className="space-y-1">
                                  <TableSecondaryText>Ubicación</TableSecondaryText>
                                  <Input
                                    value={getItemValue(item, 'ubicacion')}
                                    onChange={(e) => updateItemField(item.id, 'ubicacion', e.target.value)}
                                    placeholder="ESTANTE 3..."
                                    className="h-8 text-sm"
                                  />
                                </div>
                                {!isSimple && (
                                  <div className="space-y-1">
                                    <TableSecondaryText>Condición</TableSecondaryText>
                                    <Select
                                      value={String(getItemValue(item, 'condicion') || item.condicion)}
                                      onValueChange={(v) => updateItemField(item.id, 'condicion', v)}
                                    >
                                      <SelectTrigger className="h-8 text-sm">
                                        <SelectValue />
                                      </SelectTrigger>
                                      <SelectContent>
                                        {Object.entries(condicionConfig).map(([value, cfg]) => (
                                          <SelectItem key={value} value={value}>
                                            {cfg.label}
                                          </SelectItem>
                                        ))}
                                      </SelectContent>
                                    </Select>
                                  </div>
                                )}
                                <div className="col-span-2 space-y-1">
                                  <TableSecondaryText>Notas</TableSecondaryText>
                                  <Textarea
                                    value={getItemValue(item, 'notas')}
                                    onChange={(e) => updateItemField(item.id, 'notas', e.target.value)}
                                    rows={2}
                                    className="text-sm"
                                  />
                                </div>
                              </div>
                            ) : (
                              <>
                                {((!isSimple && item.numero_serie) || item.ubicacion || item.notas || (!isSimple && item.probado_por_nombre)) && (
                                  <div className="grid grid-cols-2 gap-2 text-sm pt-2 border-t border-gray-100 dark:border-gray-800">
                                    {!isSimple && item.numero_serie && (
                                      <div>
                                        <TableSecondaryText>Serie</TableSecondaryText>
                                        <TableCodeText className="block mt-0.5">{item.numero_serie}</TableCodeText>
                                      </div>
                                    )}
                                    {item.ubicacion && (
                                      <div>
                                        <TableSecondaryText>Ubicación</TableSecondaryText>
                                        <p className="font-medium text-sm mt-0.5">{item.ubicacion}</p>
                                      </div>
                                    )}
                                    {item.notas && (
                                      <div className="col-span-2">
                                        <TableSecondaryText>Notas</TableSecondaryText>
                                        <p className="text-sm text-muted-foreground mt-0.5 italic">{item.notas}</p>
                                      </div>
                                    )}
                                    {!isSimple && item.probado_por_nombre && (
                                      <div className="col-span-2 flex items-center gap-1 text-xs text-muted-foreground">
                                        <User className="h-3 w-3" />
                                        Probado por {item.probado_por_nombre}
                                        {item.fecha_prueba &&
                                          ` el ${new Date(item.fecha_prueba).toLocaleDateString('es-AR')}`}
                                      </div>
                                    )}
                                  </div>
                                )}
                              </>
                            )}

                            {/* State action buttons */}
                            {!isEditing && (
                              <div className="flex flex-wrap gap-2 pt-2 border-t border-gray-100 dark:border-gray-800">
                                {isSimple ? (
                                  <>
                                    {item.estado === 'pendiente' && (
                                      <Button
                                        type="outline"
                                        size="tiny"
                                        onClick={() => handleItemEstadoChange(item.id, 'preparado')}
                                      >
                                        Marcar Preparado
                                      </Button>
                                    )}
                                    {item.estado === 'preparado' && (
                                      <Button
                                        type="primary"
                                        size="tiny"
                                        className="bg-green-600 hover:bg-green-700 text-white border-green-600"
                                        onClick={() => handleItemEstadoChange(item.id, 'listo')}
                                      >
                                        Listo para Enviar
                                      </Button>
                                    )}
                                  </>
                                ) : (
                                  <>
                                    {item.estado === 'pendiente' && (
                                      <Button
                                        type="outline"
                                        size="tiny"
                                        onClick={() => handleItemEstadoChange(item.id, 'en_deposito')}
                                      >
                                        Llegó a Depósito
                                      </Button>
                                    )}
                                    {item.estado === 'en_deposito' && (
                                      <Button
                                        type="outline"
                                        size="tiny"
                                        onClick={() => handleItemEstadoChange(item.id, 'probado')}
                                      >
                                        Marcar Probado
                                      </Button>
                                    )}
                                    {item.estado === 'probado' && (
                                      <Button
                                        type="primary"
                                        size="tiny"
                                        className="bg-green-600 hover:bg-green-700 text-white border-green-600"
                                        onClick={() => handleItemEstadoChange(item.id, 'listo')}
                                      >
                                        Listo para Enviar
                                      </Button>
                                    )}
                                  </>
                                )}
                                {item.estado !== 'pendiente' && (
                                  <Button
                                    type="text"
                                    size="tiny"
                                    className="text-muted-foreground"
                                    onClick={() => handleItemEstadoChange(item.id, 'pendiente')}
                                  >
                                    Volver a Pendiente
                                  </Button>
                                )}
                              </div>
                            )}
                          </motion.div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="p-8 border-2 border-dashed border-gray-200 dark:border-gray-800 rounded-xl text-center">
                      <Package className="h-10 w-10 mx-auto mb-2 text-gray-300 dark:text-gray-700" />
                      <p className="text-muted-foreground text-sm">No hay equipos en esta orden</p>
                    </div>
                  )}
                </motion.div>
              </TabsContent>

              {/* Tab: Información */}
              <TabsContent value="info" className="mt-0 p-4 space-y-4">
                <motion.div
                  key="info"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, ease: 'easeOut' }}
                  className="space-y-4"
                >
                  <div className="space-y-3 p-4 border border-purple-200/40 dark:border-purple-800/30 rounded-xl bg-gradient-to-br from-white to-purple-50/20 dark:from-gray-900 dark:to-purple-950/10 shadow-sm">
                    <div className="flex items-center border-b border-purple-200/50 dark:border-purple-800/30 pb-2">
                      <h3 className="font-semibold text-sm flex items-center gap-2 text-purple-900 dark:text-purple-100">
                        <Calendar className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                        Fechas
                      </h3>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <TableSecondaryText>Fecha Creación</TableSecondaryText>
                        <p className="font-medium text-sm mt-0.5">
                          {new Date(orden.fecha_creacion).toLocaleDateString('es-AR', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric',
                          })}
                        </p>
                      </div>
                      {orden.fecha_requerida && (
                        <div>
                          <TableSecondaryText>Fecha Requerida</TableSecondaryText>
                          <p className="font-medium text-sm mt-0.5">
                            {new Date(orden.fecha_requerida).toLocaleDateString('es-AR')}
                          </p>
                        </div>
                      )}
                      {orden.fecha_listo && (
                        <div>
                          <TableSecondaryText>Fecha Listo</TableSecondaryText>
                          <p className="font-medium text-sm mt-0.5">
                            {new Date(orden.fecha_listo).toLocaleDateString('es-AR')}
                          </p>
                        </div>
                      )}
                      {orden.fecha_despacho && (
                        <div>
                          <TableSecondaryText>Fecha Despacho</TableSecondaryText>
                          <p className="font-medium text-sm mt-0.5">
                            {new Date(orden.fecha_despacho).toLocaleDateString('es-AR')}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>

                  {orden.responsable_nombre && (
                    <div className="space-y-3 p-4 border border-blue-200/40 dark:border-blue-800/30 rounded-xl bg-gradient-to-br from-white to-blue-50/20 dark:from-gray-900 dark:to-blue-950/10 shadow-sm">
                      <div className="flex items-center border-b border-blue-200/50 dark:border-blue-800/30 pb-2">
                        <h3 className="font-semibold text-sm flex items-center gap-2 text-blue-900 dark:text-blue-100">
                          <User className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                          Responsable
                        </h3>
                      </div>
                      <p className="font-medium text-sm">{orden.responsable_nombre}</p>
                    </div>
                  )}

                  {orden.notas && (
                    <div className="space-y-3 p-4 border border-cyan-200/40 dark:border-cyan-800/30 rounded-xl bg-gradient-to-br from-white to-cyan-50/20 dark:from-gray-900 dark:to-cyan-950/10 shadow-sm">
                      <div className="flex items-center border-b border-cyan-200/50 dark:border-cyan-800/30 pb-2">
                        <h3 className="font-semibold text-sm flex items-center gap-2 text-cyan-900 dark:text-cyan-100">
                          <Info className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
                          Notas
                        </h3>
                      </div>
                      <p className="text-sm">{orden.notas}</p>
                    </div>
                  )}
                </motion.div>
              </TabsContent>
            </div>
          </Tabs>
        </div>
      </SheetContent>
    </Sheet>
  );
}
