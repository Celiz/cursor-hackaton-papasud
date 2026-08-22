"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatCurrency } from "@/lib/utils";
import { toast } from "sonner";
import {
  Pencil,
  X,
  Save,
  Plus,
  Minus,
  Trash2,
  Loader2,
  Package,
  AlertTriangle,
} from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { DetailSheetSection } from "../DetailSheetComponents";
import type { PedidoCallbacks } from "./types";

interface PedidoItemsEditorProps {
  pedidoId: string;
  pedidoData: any;
  items: any[];
  enPreparacion: boolean;
  callbacks: PedidoCallbacks;
}

export function PedidoItemsEditor({
  pedidoId,
  pedidoData,
  items,
  enPreparacion,
  callbacks,
}: PedidoItemsEditorProps) {
  const [modoEdicion, setModoEdicion] = useState(false);
  const [editingItems, setEditingItems] = useState<any[]>([]);
  const [isSavingChanges, setIsSavingChanges] = useState(false);
  const [showEditWarningDialog, setShowEditWarningDialog] = useState(false);

  const canEdit = pedidoData.estado !== 'cancelado' && pedidoData.estado !== 'entregado' && !pedidoData.convertido_factura;

  const handleStartEdit = () => {
    const currentItems = items.map((item: any, idx: number) => ({
      ...item,
      id: item.id || `item-${idx}`,
    }));
    if (enPreparacion) {
      setEditingItems(currentItems);
      setShowEditWarningDialog(true);
    } else {
      setEditingItems(currentItems);
      setModoEdicion(true);
    }
  };

  const handleCancelEdit = () => {
    setModoEdicion(false);
    setEditingItems([]);
  };

  const handleUpdateItemCantidad = (itemId: string, newCantidad: number) => {
    if (newCantidad < 1) return;
    setEditingItems(prev =>
      prev.map(item =>
        item.id === itemId
          ? {
              ...item,
              cantidad: newCantidad,
              subtotal: newCantidad * (item.precio_unitario || 0)
            }
          : item
      )
    );
  };

  const handleRemoveItem = (itemId: string) => {
    setEditingItems(prev => prev.filter(item => item.id !== itemId));
  };

  const handleSaveChanges = async () => {
    const originalItems = items;

    const itemsEliminados = originalItems.filter(
      (orig: any) => !editingItems.find(edit => edit.id === orig.id)
    );
    const itemsModificados = editingItems.filter(edit => {
      const orig = originalItems.find((o: any) => o.id === edit.id);
      return orig && orig.cantidad !== edit.cantidad;
    });

    setIsSavingChanges(true);
    try {
      const newSubtotal = editingItems.reduce((sum, item) => sum + (item.subtotal || 0), 0);
      const newIva = newSubtotal * 0.21;
      const newTotal = newSubtotal + newIva;

      const res = await fetch(`/api/pedidos-ventas/${pedidoId}/items`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: editingItems,
          subtotal: newSubtotal,
          iva: newIva,
          total: newTotal,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Error al guardar cambios");
      }

      // Register modification note
      const notaContenido: string[] = [];
      const getItemName = (i: any) => i.producto?.nombre || i.nombre || i.descripcion || '-';

      if (itemsEliminados.length > 0) {
        notaContenido.push(`Items eliminados: ${itemsEliminados.map((i: any) => `${getItemName(i)} (${i.cantidad})`).join(', ')}`);
      }
      if (itemsModificados.length > 0) {
        notaContenido.push(`Items modificados: ${itemsModificados.map((i: any) => {
          const orig = originalItems.find((o: any) => o.id === i.id);
          return `${getItemName(i)} (${orig?.cantidad} → ${i.cantidad})`;
        }).join(', ')}`);
      }

      if (notaContenido.length > 0) {
        await fetch(`/api/pedidos-ventas/${pedidoId}/notas`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            tipo: "modificacion",
            contenido: notaContenido.join('\n'),
            items_eliminados: itemsEliminados.map((i: any) => ({
              producto_id: i.producto_id,
              nombre: getItemName(i),
              cantidad: i.cantidad
            })),
            items_modificados: itemsModificados.map((i: any) => {
              const orig = originalItems.find((o: any) => o.id === i.id);
              return {
                producto_id: i.producto_id,
                nombre: getItemName(i),
                cantidad_anterior: orig?.cantidad,
                cantidad_nueva: i.cantidad
              };
            }),
          }),
        });
      }

      toast.success("Cambios guardados correctamente");
      setModoEdicion(false);
      setEditingItems([]);
      callbacks.mutate();
      callbacks.mutateNotas();
      callbacks.onSuccess?.();
    } catch (error: any) {
      toast.error(error.message || "Error al guardar cambios");
    } finally {
      setIsSavingChanges(false);
    }
  };

  const total = pedidoData.total || items.reduce((sum: number, item: any) => sum + (item.subtotal || 0), 0);

  return (
    <>
      <DetailSheetSection
        icon={Package}
        title="Items del Pedido"
        theme="blue"
        action={
          !modoEdicion && canEdit ? (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleStartEdit}
              className="h-7 text-xs"
            >
              <Pencil className="h-3.5 w-3.5 mr-1" />
              Editar
            </Button>
          ) : modoEdicion ? (
            <div className="flex gap-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleCancelEdit}
                className="h-7 text-xs"
                disabled={isSavingChanges}
              >
                <X className="h-3.5 w-3.5 mr-1" />
                Cancelar
              </Button>
              <Button
                size="sm"
                onClick={handleSaveChanges}
                className="h-7 text-xs bg-green-600 hover:bg-green-700"
                disabled={isSavingChanges || editingItems.length === 0}
              >
                {isSavingChanges ? (
                  <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />
                ) : (
                  <Save className="h-3.5 w-3.5 mr-1" />
                )}
                Guardar
              </Button>
            </div>
          ) : null
        }
      >
        {modoEdicion ? (
          <div className="space-y-3">
            {editingItems.length === 0 ? (
              <div className="text-center py-6 text-amber-600 bg-amber-50 rounded-lg border border-amber-200">
                <AlertTriangle className="h-6 w-6 mx-auto mb-2" />
                <p className="text-sm font-medium">No quedan items en el pedido</p>
                <p className="text-xs mt-1">Agregá items o cancelá la edición</p>
              </div>
            ) : (
              editingItems.map((item: any, index: number) => (
                <div
                  key={item.id || index}
                  className="flex items-center gap-3 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800"
                >
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">
                      {item.producto?.nombre || item.descripcion || "-"}
                    </p>
                    {item.producto?.codigo && (
                      <p className="text-xs text-muted-foreground font-mono">
                        {item.producto.codigo}
                      </p>
                    )}
                    <p className="text-xs text-muted-foreground mt-1">
                      {formatCurrency(item.precio_unitario || 0)} c/u
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => handleUpdateItemCantidad(item.id, item.cantidad - 1)}
                      disabled={item.cantidad <= 1}
                    >
                      <Minus className="h-4 w-4" />
                    </Button>
                    <Input
                      type="number"
                      value={item.cantidad}
                      onChange={(e) => handleUpdateItemCantidad(item.id, parseInt(e.target.value) || 1)}
                      className="w-16 h-8 text-center"
                      min={1}
                    />
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => handleUpdateItemCantidad(item.id, item.cantidad + 1)}
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="text-right w-24">
                    <p className="font-bold text-blue-600 dark:text-blue-400">
                      {formatCurrency(item.subtotal || 0)}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-red-500 hover:text-red-700 hover:bg-red-50"
                    onClick={() => handleRemoveItem(item.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))
            )}

            {editingItems.length > 0 && (
              <div className="flex justify-between items-center pt-3 border-t border-gray-200 dark:border-gray-700">
                <span className="text-lg font-semibold">Nuevo Total</span>
                <span className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                  {formatCurrency(editingItems.reduce((sum, item) => sum + (item.subtotal || 0), 0) * 1.21)}
                </span>
              </div>
            )}
          </div>
        ) : items.length > 0 ? (
          <div className="space-y-3">
            {items.map((item: any, index: number) => (
              <div
                key={item.id || index}
                className="flex items-start justify-between p-3 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700"
              >
                <div className="flex-1">
                  <p className="font-medium text-sm">
                    {item.producto?.nombre || item.nombre || item.descripcion || "-"}
                  </p>
                  {(item.producto?.codigo || item.sku) && (
                    <p className="text-xs text-muted-foreground font-mono">
                      Código: {item.producto?.codigo || item.sku}
                    </p>
                  )}
                  <div className="flex items-center gap-4 mt-2 text-sm">
                    <span className="text-muted-foreground">
                      Cantidad:{" "}
                      <span className="font-semibold text-foreground">
                        {item.cantidad}
                      </span>
                    </span>
                    <span className="text-muted-foreground">
                      Precio: {formatCurrency(item.precio_unitario || 0)}
                    </span>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-bold text-lg text-blue-600 dark:text-blue-400">
                    {formatCurrency(item.subtotal || 0)}
                  </p>
                </div>
              </div>
            ))}

            <div className="flex justify-between items-center pt-3 border-t border-gray-200 dark:border-gray-700">
              <span className="text-lg font-semibold">Total</span>
              <span className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                {formatCurrency(total)}
              </span>
            </div>
          </div>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            No hay items en este pedido
          </div>
        )}
      </DetailSheetSection>

      {/* Edit Warning Dialog (in preparation) */}
      <AlertDialog open={showEditWarningDialog} onOpenChange={setShowEditWarningDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-amber-600">
              <AlertTriangle className="h-5 w-5" />
              Pedido en Preparación
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-3 text-sm text-muted-foreground">
                <p>
                  Este pedido ya fue enviado a preparación y el equipo de logística puede estar trabajando en él.
                </p>
                <div className="p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-200 dark:border-amber-800">
                  <p className="text-amber-800 dark:text-amber-200 font-medium">
                    Si modificás el pedido:
                  </p>
                  <ul className="list-disc list-inside mt-2 text-amber-700 dark:text-amber-300 space-y-1">
                    <li>Se notificará automáticamente a Logística</li>
                    <li>El cambio quedará registrado en el timeline</li>
                    <li>Aparecerá una advertencia en la orden de preparación</li>
                  </ul>
                </div>
                <p className="text-sm">
                  ¿Estás segura de que querés continuar?
                </p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setEditingItems([])}>
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                setShowEditWarningDialog(false);
                setModoEdicion(true);
              }}
              className="bg-amber-600 hover:bg-amber-700"
            >
              <Pencil className="h-4 w-4 mr-2" />
              Sí, editar pedido
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
