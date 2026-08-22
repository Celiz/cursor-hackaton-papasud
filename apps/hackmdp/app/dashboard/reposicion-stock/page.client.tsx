'use client';

import { useMemo, useState, useCallback } from 'react';
import useSWR from 'swr';
import { Button } from '@/components/ui/button';
import {
  Package,
  AlertTriangle,
  CheckCircle2,
  Loader2,
  PackageCheck,
  ShoppingCart,
  Mail,
  MessageSquare,
  Check,
  ChevronDown,
  ChevronRight,
  Trash2,
} from 'lucide-react';
import { GenericDataTable } from '@/components/core-ui/GenericDataTable';
import { columnsReposicion, type ReposicionItem } from './columns';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { SearchableCombobox, type ComboboxOption } from '@/components/ui/searchable-combobox';
import { cn } from '@/lib/utils';

const fetcher = async (url: string) => {
  const res = await fetch(url);
  const data = await res.json();
  if (!res.ok || data.error) throw new Error(data.error || 'Error al cargar datos');
  return Array.isArray(data) ? data : [];
};

const searchProveedores = async (query: string): Promise<ComboboxOption[]> => {
  const res = await fetch(`/api/proveedores?search=${encodeURIComponent(query)}`);
  const data = await res.json();
  if (!Array.isArray(data)) return [];
  return data.map((p: any) => ({
    value: p.id,
    label: p.nombre,
    subtitle: p.cuit || undefined,
  }));
};

interface PedidoItem {
  producto_id: string;
  nombre: string;
  codigo: string;
  cantidad: number;
  stock_actual: number | null;
  stock_minimo: number | null;
}

interface ProveedorGroup {
  proveedor_id: string;
  proveedor_nombre: string;
  items: PedidoItem[];
  expanded: boolean;
}

interface OcResult {
  id: string;
  proveedor_id: string;
  proveedor_nombre: string | null;
  proveedor_email: string | null;
  proveedor_telefono: string | null;
  items_count: number;
}

export default function ReposicionStockPageClient() {
  const { data, error, isLoading, mutate } = useSWR<ReposicionItem[]>(
    '/api/reposicion-stock',
    fetcher
  );

  // Selection state
  const [selectedRows, setSelectedRows] = useState<ReposicionItem[]>([]);

  // Single OC dialog (keep for individual row action)
  const [showOCDialog, setShowOCDialog] = useState(false);
  const [ocProveedorId, setOcProveedorId] = useState('');
  const [ocComentarios, setOcComentarios] = useState('');
  const [ocCantidad, setOcCantidad] = useState(1);
  const [ocItem, setOcItem] = useState<{ producto_id: string; nombre: string; stock_actual: number | null; stock_minimo: number | null } | null>(null);

  // Bulk OC dialog
  const [showBulkDialog, setShowBulkDialog] = useState(false);
  const [bulkGroups, setBulkGroups] = useState<ProveedorGroup[]>([]);
  const [bulkComentarios, setBulkComentarios] = useState('');

  // Post-creation results
  const [showResultDialog, setShowResultDialog] = useState(false);
  const [ocResults, setOcResults] = useState<OcResult[]>([]);

  const [procesando, setProcesando] = useState(false);

  const stats = useMemo(() => {
    if (!data || !Array.isArray(data)) return { pendientes: 0, stockBajo: 0, total: 0 };
    return {
      pendientes: data.filter(d => Number(d.movimientos_pendientes) > 0).length,
      stockBajo: data.filter(d =>
        d.stock_minimo != null && Number(d.stock_minimo) > 0 &&
        d.stock_actual != null && Number(d.stock_actual) < Number(d.stock_minimo)
      ).length,
      total: data.length,
    };
  }, [data]);

  // === Individual row actions ===

  const handleMarcarPedidoManual = async (item: ReposicionItem) => {
    try {
      const res = await fetch('/api/reposicion-stock', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ producto_id: item.id, accion: 'pedido_manual' }),
      });
      if (!res.ok) throw new Error('Error al procesar');
      const result = await res.json();
      toast.success(`${item.nombre} marcado como pedido manual (${result.registros_actualizados} consumos)`);
      mutate();
    } catch {
      toast.error('Error al marcar como pedido manual');
    }
  };

  const handleIgnorar = async (item: ReposicionItem) => {
    try {
      const res = await fetch('/api/reposicion-stock', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ producto_id: item.id, accion: 'ignorado' }),
      });
      if (!res.ok) throw new Error('Error al procesar');
      toast.success(`${item.nombre} ignorado`);
      mutate();
    } catch {
      toast.error('Error al ignorar');
    }
  };

  const handleAbrirGenerarOC = (item: ReposicionItem) => {
    setOcItem({
      producto_id: item.id,
      nombre: item.nombre,
      stock_actual: item.stock_actual,
      stock_minimo: item.stock_minimo,
    });
    setOcCantidad(Number(item.cantidad_consumida_pendiente) || 1);
    setOcProveedorId(item.proveedor_habitual_id || '');
    setOcComentarios('');
    setShowOCDialog(true);
  };

  const handleGenerarOC = async () => {
    if (!ocProveedorId || !ocItem) {
      toast.error('Seleccioná un proveedor');
      return;
    }
    if (ocCantidad <= 0) {
      toast.error('La cantidad debe ser mayor a 0');
      return;
    }
    setProcesando(true);
    try {
      const res = await fetch('/api/reposicion-stock', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          proveedor_id: ocProveedorId,
          items: [{ producto_id: ocItem.producto_id, cantidad: ocCantidad }],
          comentarios: ocComentarios || null,
        }),
      });
      if (!res.ok) throw new Error('Error al generar OC');
      const oc = await res.json();
      setShowOCDialog(false);
      setOcItem(null);
      setOcResults([oc]);
      setShowResultDialog(true);
      mutate();
    } catch {
      toast.error('Error al generar orden de compra');
    } finally {
      setProcesando(false);
    }
  };

  // === Bulk OC flow ===

  const handleAbrirBulkOC = useCallback(() => {
    if (selectedRows.length === 0) return;

    // Group by proveedor
    const groupMap = new Map<string, ProveedorGroup>();

    for (const item of selectedRows) {
      const provId = item.proveedor_habitual_id || '__sin_proveedor__';
      const provNombre = item.proveedor_nombre || 'Sin proveedor asignado';

      if (!groupMap.has(provId)) {
        groupMap.set(provId, {
          proveedor_id: provId,
          proveedor_nombre: provNombre,
          items: [],
          expanded: true,
        });
      }

      groupMap.get(provId)!.items.push({
        producto_id: item.id,
        nombre: item.nombre,
        codigo: item.codigo,
        cantidad: Number(item.cantidad_consumida_pendiente) || 1,
        stock_actual: item.stock_actual,
        stock_minimo: item.stock_minimo,
      });
    }

    setBulkGroups(Array.from(groupMap.values()));
    setBulkComentarios('');
    setShowBulkDialog(true);
  }, [selectedRows]);

  const handleBulkCantidadChange = (provId: string, productoId: string, cantidad: number) => {
    setBulkGroups(prev => prev.map(g =>
      g.proveedor_id === provId
        ? { ...g, items: g.items.map(i => i.producto_id === productoId ? { ...i, cantidad: Math.max(1, cantidad) } : i) }
        : g
    ));
  };

  const handleBulkRemoveItem = (provId: string, productoId: string) => {
    setBulkGroups(prev => {
      const updated = prev.map(g =>
        g.proveedor_id === provId
          ? { ...g, items: g.items.filter(i => i.producto_id !== productoId) }
          : g
      );
      return updated.filter(g => g.items.length > 0);
    });
  };

  const handleBulkProveedorChange = (oldProvId: string, newProvId: string) => {
    setBulkGroups(prev => prev.map(g =>
      g.proveedor_id === oldProvId ? { ...g, proveedor_id: newProvId } : g
    ));
  };

  const handleToggleGroup = (provId: string) => {
    setBulkGroups(prev => prev.map(g =>
      g.proveedor_id === provId ? { ...g, expanded: !g.expanded } : g
    ));
  };

  const handleGenerarBulkOC = async () => {
    const validGroups = bulkGroups.filter(g => g.proveedor_id !== '__sin_proveedor__' && g.items.length > 0);
    const sinProveedor = bulkGroups.find(g => g.proveedor_id === '__sin_proveedor__');

    if (sinProveedor && sinProveedor.items.length > 0) {
      toast.error('Asigná un proveedor a todos los productos antes de continuar');
      return;
    }

    if (validGroups.length === 0) {
      toast.error('No hay productos para generar OC');
      return;
    }

    setProcesando(true);
    const results: OcResult[] = [];

    try {
      for (const group of validGroups) {
        const res = await fetch('/api/reposicion-stock', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            proveedor_id: group.proveedor_id,
            items: group.items.map(i => ({ producto_id: i.producto_id, cantidad: i.cantidad })),
            comentarios: bulkComentarios || null,
          }),
        });

        if (!res.ok) {
          toast.error(`Error al generar OC para ${group.proveedor_nombre}`);
          continue;
        }

        const oc = await res.json();
        results.push(oc);
      }

      if (results.length > 0) {
        setShowBulkDialog(false);
        setOcResults(results);
        setShowResultDialog(true);
        mutate();
      }
    } catch {
      toast.error('Error al generar órdenes de compra');
    } finally {
      setProcesando(false);
    }
  };

  // === Send actions ===

  const handleEnviarEmail = (oc: OcResult) => {
    if (!oc.proveedor_email) {
      toast.error('El proveedor no tiene email registrado');
      return;
    }
    const subject = encodeURIComponent(`Orden de Compra - ${oc.proveedor_nombre}`);
    const body = encodeURIComponent(
      `Estimados ${oc.proveedor_nombre},\n\nLes enviamos la orden de compra con ${oc.items_count} producto(s).\n\nSaludos cordiales.`
    );
    window.open(`mailto:${oc.proveedor_email}?subject=${subject}&body=${body}`, '_blank');
    toast.success(`Abriendo email para ${oc.proveedor_nombre}`);
  };

  const handleEnviarWhatsApp = (oc: OcResult) => {
    if (!oc.proveedor_telefono) {
      toast.error('El proveedor no tiene teléfono registrado');
      return;
    }
    // Clean phone number
    const phone = oc.proveedor_telefono.replace(/\D/g, '');
    const message = encodeURIComponent(
      `Hola ${oc.proveedor_nombre}, les enviamos un pedido con ${oc.items_count} producto(s). ¿Pueden confirmar disponibilidad?`
    );
    window.open(`https://wa.me/${phone}?text=${message}`, '_blank');
    toast.success(`Abriendo WhatsApp para ${oc.proveedor_nombre}`);
  };

  const proveedorSearchFn = useCallback(async (query: string): Promise<ComboboxOption[]> => {
    return searchProveedores(query);
  }, []);

  const totalBulkItems = bulkGroups.reduce((sum, g) => sum + g.items.length, 0);

  if (error) {
    return (
      <div className="p-6">
        <p className="text-red-500">Error al cargar datos: {error.message}</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 p-6">
      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <div className="border rounded-lg p-4 flex items-center gap-3">
          <Package className="h-8 w-8 text-orange-500" />
          <div>
            <p className="text-2xl font-bold">{stats.pendientes}</p>
            <p className="text-xs text-muted-foreground">Con consumos pendientes</p>
          </div>
        </div>
        <div className="border rounded-lg p-4 flex items-center gap-3">
          <AlertTriangle className="h-8 w-8 text-red-500" />
          <div>
            <p className="text-2xl font-bold">{stats.stockBajo}</p>
            <p className="text-xs text-muted-foreground">Bajo stock mínimo</p>
          </div>
        </div>
        <div className="border rounded-lg p-4 flex items-center gap-3">
          <CheckCircle2 className="h-8 w-8 text-green-500" />
          <div>
            <p className="text-2xl font-bold">{stats.total}</p>
            <p className="text-xs text-muted-foreground">Total a revisar</p>
          </div>
        </div>
      </div>

      {/* Empty state or Table */}
      {!isLoading && data && data.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center border rounded-lg bg-muted/20">
          <PackageCheck className="h-12 w-12 text-green-500 mb-4" />
          <h3 className="text-lg font-semibold">Todo en orden</h3>
          <p className="text-sm text-muted-foreground mt-1">
            No hay productos que necesiten reposición en este momento.
          </p>
          <Button variant="outline" className="mt-4" onClick={() => mutate()}>
            Actualizar
          </Button>
        </div>
      ) : (
        <GenericDataTable
          columns={columnsReposicion}
          data={data || []}
          isLoading={isLoading}
          enableGlobalSearch
          enableRowSelection
          onSelectionChange={setSelectedRows}
          pageTitle="Reposición de Stock"
          pageDescription="Productos consumidos que necesitan reposición"
          additionalActions={
            selectedRows.length > 0 ? (
              <Button
                onClick={handleAbrirBulkOC}
                className="bg-blue-600 hover:bg-blue-700 text-white"
                size="sm"
              >
                <ShoppingCart className="h-4 w-4 mr-1.5" />
                Crear Pedido ({selectedRows.length})
              </Button>
            ) : undefined
          }
          customRowActions={[
            {
              label: 'Generar OC',
              action: (row: ReposicionItem) => handleAbrirGenerarOC(row),
              icon: <ShoppingCart className="h-4 w-4 text-blue-600" />,
            },
            {
              label: 'Pedido manual',
              action: (row: ReposicionItem) => handleMarcarPedidoManual(row),
              icon: <Package className="h-4 w-4 text-orange-500" />,
              separator: true,
            },
            {
              label: 'Ignorar',
              action: (row: ReposicionItem) => handleIgnorar(row),
              icon: <CheckCircle2 className="h-4 w-4 text-muted-foreground" />,
              className: 'text-muted-foreground',
            },
          ]}
          onRefresh={() => mutate()}
        />
      )}

      {/* Dialog: OC Individual */}
      <Dialog open={showOCDialog} onOpenChange={setShowOCDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Generar Orden de Compra</DialogTitle>
            <DialogDescription>
              Crear OC para: <strong>{ocItem?.nombre}</strong>
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {ocItem && (
              <div className="flex gap-4 text-sm bg-muted/50 rounded-lg p-3">
                <div>
                  <span className="text-muted-foreground">Stock actual:</span>{' '}
                  <span className="font-semibold">{ocItem.stock_actual != null ? Number(ocItem.stock_actual) : '-'}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Stock mínimo:</span>{' '}
                  <span className="font-semibold">{ocItem.stock_minimo != null ? Number(ocItem.stock_minimo) : '-'}</span>
                </div>
              </div>
            )}
            <div>
              <Label>Proveedor</Label>
              <SearchableCombobox
                value={ocProveedorId}
                onValueChange={setOcProveedorId}
                searchFn={proveedorSearchFn}
                placeholder="Buscar proveedor..."
                emptyMessage="No se encontraron proveedores"
              />
            </div>
            <div>
              <Label>Cantidad</Label>
              <Input
                type="number"
                min={1}
                value={ocCantidad}
                onChange={(e) => setOcCantidad(Math.max(1, Number(e.target.value) || 1))}
              />
            </div>
            <div>
              <Label>Comentarios</Label>
              <Textarea
                value={ocComentarios}
                onChange={(e) => setOcComentarios(e.target.value)}
                placeholder="Comentarios opcionales..."
                rows={2}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowOCDialog(false)}>Cancelar</Button>
            <Button onClick={handleGenerarOC} disabled={procesando || !ocProveedorId || ocCantidad <= 0}>
              {procesando && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Crear Orden de Compra
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog: Bulk OC Review */}
      <Dialog open={showBulkDialog} onOpenChange={setShowBulkDialog}>
        <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ShoppingCart className="h-5 w-5" />
              Crear Pedido — {totalBulkItems} productos, {bulkGroups.length} proveedor{bulkGroups.length !== 1 ? 'es' : ''}
            </DialogTitle>
            <DialogDescription>
              Revisá las cantidades y proveedores. Se generará una OC por cada proveedor.
            </DialogDescription>
          </DialogHeader>

          <ScrollArea className="flex-1 min-h-0 pr-4">
            <div className="space-y-3">
              {bulkGroups.map((group) => (
                <div key={group.proveedor_id} className="border rounded-lg overflow-hidden">
                  {/* Group header */}
                  <button
                    type="button"
                    className="w-full flex items-center justify-between p-3 bg-muted/50 hover:bg-muted/80 transition-colors"
                    onClick={() => handleToggleGroup(group.proveedor_id)}
                  >
                    <div className="flex items-center gap-2">
                      {group.expanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                      <span className="font-semibold text-sm">
                        {group.proveedor_id === '__sin_proveedor__' ? (
                          <span className="text-red-600">⚠ Sin proveedor asignado</span>
                        ) : group.proveedor_nombre}
                      </span>
                    </div>
                    <Badge variant="secondary">{group.items.length} items</Badge>
                  </button>

                  {/* Assign proveedor for unassigned group */}
                  {group.proveedor_id === '__sin_proveedor__' && group.expanded && (
                    <div className="px-3 py-2 bg-red-50 dark:bg-red-950/20 border-b">
                      <Label className="text-xs text-red-600">Asignar proveedor:</Label>
                      <SearchableCombobox
                        value=""
                        onValueChange={(val) => handleBulkProveedorChange('__sin_proveedor__', val)}
                        searchFn={proveedorSearchFn}
                        placeholder="Buscar proveedor..."
                        emptyMessage="No se encontraron proveedores"
                      />
                    </div>
                  )}

                  {/* Group items */}
                  {group.expanded && (
                    <div className="divide-y">
                      {group.items.map((item) => (
                        <div key={item.producto_id} className="flex items-center gap-3 px-3 py-2">
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{item.nombre}</p>
                            <div className="flex gap-3 text-xs text-muted-foreground">
                              <span>{item.codigo}</span>
                              <span>Stock: {item.stock_actual != null ? Number(item.stock_actual) : '-'}</span>
                              <span>Mín: {item.stock_minimo != null ? Number(item.stock_minimo) : '-'}</span>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Input
                              type="number"
                              min={1}
                              value={item.cantidad}
                              onChange={(e) => handleBulkCantidadChange(group.proveedor_id, item.producto_id, Number(e.target.value) || 1)}
                              className="w-20 h-8 text-center"
                            />
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0 text-muted-foreground hover:text-red-600"
                              onClick={() => handleBulkRemoveItem(group.proveedor_id, item.producto_id)}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>

            <div className="mt-4">
              <Label>Comentarios (para todas las OC)</Label>
              <Textarea
                value={bulkComentarios}
                onChange={(e) => setBulkComentarios(e.target.value)}
                placeholder="Comentarios opcionales..."
                rows={2}
              />
            </div>
          </ScrollArea>

          <DialogFooter className="pt-4 border-t">
            <Button variant="outline" onClick={() => setShowBulkDialog(false)}>Cancelar</Button>
            <Button onClick={handleGenerarBulkOC} disabled={procesando || bulkGroups.length === 0}>
              {procesando && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Generar {bulkGroups.filter(g => g.proveedor_id !== '__sin_proveedor__').length} OC
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog: Post-creation results with send options */}
      <Dialog open={showResultDialog} onOpenChange={setShowResultDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Check className="h-5 w-5 text-green-600" />
              {ocResults.length === 1 ? 'Orden de compra generada' : `${ocResults.length} órdenes de compra generadas`}
            </DialogTitle>
            <DialogDescription>
              Podés enviar el pedido al proveedor por email o WhatsApp.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            {ocResults.map((oc) => (
              <div key={oc.id} className="border rounded-lg p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-semibold">{oc.proveedor_nombre || 'Proveedor'}</p>
                    <p className="text-xs text-muted-foreground">
                      {oc.items_count} producto{oc.items_count !== 1 ? 's' : ''} — OC #{oc.id.substring(0, 8)}
                    </p>
                  </div>
                  <Badge variant="outline" className="text-green-600 border-green-200">Creada</Badge>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleEnviarEmail(oc)}
                    className={cn(!oc.proveedor_email && "opacity-50")}
                  >
                    <Mail className="h-4 w-4 mr-1.5" />
                    Email
                    {!oc.proveedor_email && <span className="text-xs ml-1 text-muted-foreground">(sin email)</span>}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleEnviarWhatsApp(oc)}
                    className={cn(!oc.proveedor_telefono && "opacity-50")}
                  >
                    <MessageSquare className="h-4 w-4 mr-1.5" />
                    WhatsApp
                    {!oc.proveedor_telefono && <span className="text-xs ml-1 text-muted-foreground">(sin tel)</span>}
                  </Button>
                </div>
              </div>
            ))}
          </div>

          <DialogFooter>
            <Button onClick={() => { setShowResultDialog(false); setOcResults([]); }}>
              Cerrar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
