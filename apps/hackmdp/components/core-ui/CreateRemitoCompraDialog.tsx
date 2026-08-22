"use client";

import { useState, useEffect } from "react";
import { RemitoCompra, Proveedor } from "@/lib/types";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Receipt,
  Building2,
  Calendar,
  Loader2,
  Plus,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { useFormatCurrency } from "@/lib/hooks/use-format-currency";

interface CreateRemitoCompraDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  remito?: RemitoCompra | null;
  proveedores: Proveedor[];
  onSuccess?: () => void;
  scannedData?: {
    proveedor?: string | null
    proveedor_cuit?: string | null
    numero_remito?: string | null
    fecha?: string | null
    items?: Array<{
      descripcion: string
      cantidad: number
      precio_unitario?: number | null
      codigo?: string | null
    }>
    observaciones?: string | null
    total?: number | null
  } | null;
}

interface ItemForm {
  id?: string;
  descripcion: string;
  cantidad: number;
  precio_unitario: number;
  marca?: string;
  rubro?: string;
}

const initialFormData = {
  numero: "",
  proveedor_id: "",
  fecha: new Date().toISOString().split("T")[0],
  fecha_vencimiento: "",
  tipo_comprobante: "factura_a" as string,
  estado: "pendiente" as string,
  subtotal: 0,
  iva: 0,
  otros_impuestos: 0,
  total: 0,
  comentarios: "",
};

const tipoComprobanteOptions = [
  { value: "factura_a", label: "Factura A" },
  { value: "factura_b", label: "Factura B" },
  { value: "factura_c", label: "Factura C" },
  { value: "remito", label: "Remito" },
  { value: "nota_credito", label: "Nota de Crédito" },
  { value: "nota_debito", label: "Nota de Débito" },
];

export function CreateRemitoCompraDialog({
  open,
  onOpenChange,
  remito,
  proveedores,
  onSuccess,
  scannedData,
}: CreateRemitoCompraDialogProps) {
  const [formData, setFormData] = useState(initialFormData);
  const [items, setItems] = useState<ItemForm[]>([]);
  const [loading, setLoading] = useState(false);

  const isEditing = !!remito;

  // Cargar datos del remito si estamos editando
  useEffect(() => {
    if (remito && open) {
      setFormData({
        numero: remito.numero || "",
        proveedor_id: remito.proveedor_id || "",
        fecha: remito.fecha?.split("T")[0] || new Date().toISOString().split("T")[0],
        fecha_vencimiento: remito.fecha_vencimiento?.split("T")[0] || "",
        tipo_comprobante: remito.tipo_comprobante || "factura_a",
        estado: remito.estado || "pendiente",
        subtotal: remito.subtotal || 0,
        iva: remito.iva || 0,
        otros_impuestos: remito.otros_impuestos || 0,
        total: remito.total || 0,
        comentarios: remito.comentarios || "",
      });
      if (remito.items) {
        setItems(
          remito.items.map((item) => ({
            id: item.id,
            descripcion: item.descripcion || "",
            cantidad: item.cantidad || 0,
            precio_unitario: item.precio_unitario || 0,
            marca: item.marca || "",
            rubro: item.rubro || "",
          }))
        );
      }
    } else if (!open) {
      setFormData(initialFormData);
      setItems([]);
    }
  }, [remito, open]);

  // Pre-fill from scanned data (vision AI)
  useEffect(() => {
    if (scannedData && open && !remito) {
      const matchedProveedor = proveedores.find(p => {
        const name = (scannedData.proveedor || '').toLowerCase()
        return p.nombre?.toLowerCase().includes(name) || name.includes(p.nombre?.toLowerCase() || '')
      })

      setFormData(prev => ({
        ...prev,
        numero: scannedData.numero_remito || '',
        proveedor_id: matchedProveedor?.id || '',
        fecha: scannedData.fecha || prev.fecha,
        total: scannedData.total || 0,
        comentarios: scannedData.observaciones || '',
      }))

      if (scannedData.items?.length) {
        setItems(scannedData.items.map(item => ({
          descripcion: item.descripcion || '',
          cantidad: item.cantidad || 1,
          precio_unitario: item.precio_unitario || 0,
        })))
      }
    }
  }, [scannedData, open, remito, proveedores]);

  const handleClose = () => {
    setFormData(initialFormData);
    setItems([]);
    onOpenChange(false);
  };

  const addItem = () => {
    setItems([...items, { descripcion: "", cantidad: 1, precio_unitario: 0 }]);
  };

  const removeItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const updateItem = (index: number, field: keyof ItemForm, value: any) => {
    const newItems = [...items];
    newItems[index] = { ...newItems[index], [field]: value };
    setItems(newItems);
  };

  // Calcular totales automáticamente
  useEffect(() => {
    const subtotal = items.reduce(
      (sum, item) => sum + item.cantidad * item.precio_unitario,
      0
    );
    const iva = subtotal * 0.21; // 21% IVA por defecto
    const total = subtotal + iva + (formData.otros_impuestos || 0);

    setFormData((prev) => ({
      ...prev,
      subtotal,
      iva,
      total,
    }));
  }, [items, formData.otros_impuestos]);

  const handleSubmit = async () => {
    if (!formData.numero.trim()) {
      toast.error("El número es requerido");
      return;
    }
    if (!formData.proveedor_id) {
      toast.error("El proveedor es requerido");
      return;
    }

    setLoading(true);
    try {
      const url = isEditing ? `/api/remitos-compra/${remito.id}` : "/api/remitos-compra";
      const method = isEditing ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...formData, items }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Error al guardar remito");
      }

      toast.success(isEditing ? "Remito actualizado" : "Remito creado");
      handleClose();
      onSuccess?.();
    } catch (error: any) {
      toast.error(error.message || "Error al guardar remito");
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = useFormatCurrency()

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[800px] max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Receipt className="h-5 w-5 text-blue-600" />
            {isEditing ? "Editar Remito de Compra" : "Nuevo Remito de Compra"}
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="max-h-[60vh] pr-4">
          <div className="space-y-6 py-4">
            {/* Datos principales */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="numero">Número *</Label>
                <Input
                  id="numero"
                  value={formData.numero}
                  onChange={(e) => setFormData({ ...formData, numero: e.target.value })}
                  placeholder="0001-00001234"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="proveedor">Proveedor *</Label>
                <Select
                  value={formData.proveedor_id}
                  onValueChange={(value) => setFormData({ ...formData, proveedor_id: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar proveedor..." />
                  </SelectTrigger>
                  <SelectContent>
                    {proveedores.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        <div className="flex items-center gap-2">
                          <Building2 className="h-4 w-4 text-muted-foreground" />
                          {p.nombre}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="fecha">Fecha *</Label>
                <Input
                  id="fecha"
                  type="date"
                  value={formData.fecha}
                  onChange={(e) => setFormData({ ...formData, fecha: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="fecha_vencimiento">Vencimiento</Label>
                <Input
                  id="fecha_vencimiento"
                  type="date"
                  value={formData.fecha_vencimiento}
                  onChange={(e) => setFormData({ ...formData, fecha_vencimiento: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="tipo">Tipo de Comprobante</Label>
                <Select
                  value={formData.tipo_comprobante}
                  onValueChange={(value: any) =>
                    setFormData({ ...formData, tipo_comprobante: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {tipoComprobanteOptions.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="estado">Estado</Label>
                <Select
                  value={formData.estado}
                  onValueChange={(value: any) => setFormData({ ...formData, estado: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pendiente">Pendiente</SelectItem>
                    <SelectItem value="parcial">Parcial</SelectItem>
                    <SelectItem value="pagada">Pagada</SelectItem>
                    <SelectItem value="cancelada">Cancelada</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Items */}
            <div className="space-y-3 pt-4 border-t">
              <div className="flex items-center justify-between">
                <Label className="text-base font-semibold">Items</Label>
                <Button type="button" variant="outline" size="sm" onClick={addItem}>
                  <Plus className="h-4 w-4 mr-1" />
                  Agregar Item
                </Button>
              </div>

              {items.length > 0 ? (
                <div className="space-y-3">
                  {items.map((item, index) => (
                    <div
                      key={index}
                      className="grid grid-cols-12 gap-2 p-3 border rounded-lg bg-gray-50 dark:bg-gray-900"
                    >
                      <div className="col-span-5">
                        <Input
                          placeholder="Descripción"
                          value={item.descripcion}
                          onChange={(e) => updateItem(index, "descripcion", e.target.value)}
                        />
                      </div>
                      <div className="col-span-2">
                        <Input
                          type="number"
                          placeholder="Cantidad"
                          value={item.cantidad || ""}
                          onChange={(e) => updateItem(index, "cantidad", parseFloat(e.target.value) || 0)}
                        />
                      </div>
                      <div className="col-span-3">
                        <Input
                          type="number"
                          placeholder="Precio unitario"
                          value={item.precio_unitario || ""}
                          onChange={(e) =>
                            updateItem(index, "precio_unitario", parseFloat(e.target.value) || 0)
                          }
                        />
                      </div>
                      <div className="col-span-1 flex items-center justify-center text-sm font-medium">
                        {formatCurrency(item.cantidad * item.precio_unitario)}
                      </div>
                      <div className="col-span-1 flex items-center justify-center">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => removeItem(index)}
                          className="h-8 w-8 text-red-500 hover:text-red-700"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-6 text-muted-foreground border rounded-lg border-dashed">
                  <p className="text-sm">No hay items. Click en "Agregar Item" para comenzar.</p>
                </div>
              )}
            </div>

            {/* Totales */}
            <div className="space-y-3 pt-4 border-t">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Otros Impuestos</Label>
                  <Input
                    type="number"
                    value={formData.otros_impuestos || ""}
                    onChange={(e) =>
                      setFormData({ ...formData, otros_impuestos: parseFloat(e.target.value) || 0 })
                    }
                    placeholder="0"
                  />
                </div>
                <div className="space-y-3 text-right">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Subtotal:</span>
                    <span>{formatCurrency(formData.subtotal)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">IVA (21%):</span>
                    <span>{formatCurrency(formData.iva)}</span>
                  </div>
                  {formData.otros_impuestos > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Otros:</span>
                      <span>{formatCurrency(formData.otros_impuestos)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-lg font-bold pt-2 border-t">
                    <span>Total:</span>
                    <span className="text-blue-600">{formatCurrency(formData.total)}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Comentarios */}
            <div className="space-y-2">
              <Label htmlFor="comentarios">Comentarios</Label>
              <Textarea
                id="comentarios"
                value={formData.comentarios}
                onChange={(e) => setFormData({ ...formData, comentarios: e.target.value })}
                placeholder="Notas adicionales..."
                rows={2}
              />
            </div>
          </div>
        </ScrollArea>

        <DialogFooter className="mt-4">
          <Button variant="outline" onClick={handleClose} disabled={loading}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            {isEditing ? "Guardar Cambios" : "Crear Remito"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
