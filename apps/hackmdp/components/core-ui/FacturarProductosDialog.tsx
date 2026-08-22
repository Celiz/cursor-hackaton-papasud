"use client";

import React, { useState } from "react";
import { formatCurrency } from "@/lib/format-currency";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DollarSign, Info, Package, Plus, Trash2 } from "lucide-react";
import { Producto } from "@/lib/types";

type PrecioFuente = 'override_fijo' | 'override_margen' | 'lista_margen' | 'producto_default' | 'manual';

interface ProductoItem {
  producto: Producto;
  cantidad: number;
  precio_unitario: number;
  fuente?: PrecioFuente;
  lista_nombre?: string | null;
}

interface FacturarProductosDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  productos: Producto[];
  clientes: Array<{ id: string; nombre: string; nombre_fantasia?: string }>;
  onSuccess: () => void;
}

export function FacturarProductosDialog({
  open,
  onOpenChange,
  productos,
  clientes,
  onSuccess,
}: FacturarProductosDialogProps) {
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState<ProductoItem[]>([]);
  const [selectedProductoId, setSelectedProductoId] = useState<string>("");

  // Calculate default vencimiento (30 days from today)
  const getDefaultVencimiento = () => {
    const date = new Date();
    date.setDate(date.getDate() + 30);
    return date.toISOString().split("T")[0];
  };

  const [formData, setFormData] = useState({
    cliente_id: "",
    fecha_emision: new Date().toISOString().split("T")[0],
    fecha_vencimiento: getDefaultVencimiento(),
    tipo_factura: "B",
    aplicar_iva: true,
  });

  const handleAddItem = async () => {
    if (!selectedProductoId) return;

    const producto = productos.find((p) => p.id.toString() === selectedProductoId);
    if (!producto) return;

    // Check if already added
    if (items.some((item) => item.producto.id === producto.id)) {
      alert("Este producto ya fue agregado");
      return;
    }

    const fallback = Number((producto as any).precio_venta ?? (producto as any).precio ?? 0);
    setItems(prev => [
      ...prev,
      {
        producto,
        cantidad: 1,
        precio_unitario: fallback,
        fuente: 'producto_default',
        lista_nombre: null,
      },
    ]);
    setSelectedProductoId("");

    try {
      const params = new URLSearchParams();
      params.set('producto_ids', String(producto.id));
      if (formData.cliente_id) params.set('cliente_id', formData.cliente_id);
      const res = await fetch(`/api/precios/resolver?${params.toString()}`);
      if (!res.ok) return;
      const data = await res.json();
      const r = (data.results || [])[0];
      if (!r) return;
      const precio = Number(r.precio_venta) || fallback;
      setItems(prev => prev.map(it =>
        it.producto.id === producto.id
          ? { ...it, precio_unitario: precio, fuente: r.fuente as PrecioFuente, lista_nombre: r.lista_nombre || null }
          : it
      ));
    } catch {
      // ignore
    }
  };

  const handleRemoveItem = (productoId: string) => {
    setItems(items.filter((item) => item.producto.id !== productoId));
  };

  const handleUpdateItem = (
    productoId: string,
    field: "cantidad" | "precio_unitario",
    value: number
  ) => {
    setItems(
      items.map((item) =>
        item.producto.id === productoId
          ? { ...item, [field]: value, ...(field === 'precio_unitario' ? { fuente: 'manual' as PrecioFuente } : {}) }
          : item
      )
    );
  };

  const subtotal = items.reduce(
    (sum, item) => sum + item.cantidad * item.precio_unitario,
    0
  );
  const iva = formData.aplicar_iva ? subtotal * 0.21 : 0;
  const total = subtotal + iva;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    if (items.length === 0) {
      alert("Debe agregar al menos un producto");
      setLoading(false);
      return;
    }

    if (!formData.cliente_id) {
      alert("Debe seleccionar un cliente");
      setLoading(false);
      return;
    }

    try {
      // 1. Crear la factura
      const resFactura = await fetch("/api/facturas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cliente_id: formData.cliente_id,
          fecha_emision: formData.fecha_emision,
          fecha_vencimiento: formData.fecha_vencimiento,
          total: total,
          estado: "pendiente",
          tipo_factura: formData.tipo_factura,
          comentarios: [
            {
              texto: `Factura generada para venta de productos`,
              fecha: new Date().toISOString(),
            },
          ],
        }),
      });

      if (!resFactura.ok) {
        const data = await resFactura.json();
        throw new Error(data.error || "Error al crear factura");
      }

      const factura = await resFactura.json();

      // 2. Crear items de factura para cada producto
      for (const item of items) {
        const resItem = await fetch("/api/facturas-items", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            factura_id: factura.id,
            producto_id: item.producto.id,
            descripcion: `${item.producto.codigo} - ${item.producto.nombre}`,
            cantidad: item.cantidad,
            precio_unitario: item.precio_unitario,
            subtotal: item.cantidad * item.precio_unitario,
          }),
        });

        if (!resItem.ok) {
          throw new Error("Error al crear item de factura");
        }
      }

      onSuccess();
      onOpenChange(false);

      // Reset form
      setItems([]);
      setFormData({
        cliente_id: "",
        fecha_emision: new Date().toISOString().split("T")[0],
        fecha_vencimiento: getDefaultVencimiento(),
        tipo_factura: "B",
        aplicar_iva: true,
      });
    } catch (error: any) {
      alert(error.message || "Error al facturar productos");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Facturar Productos</DialogTitle>
          <DialogDescription>
            Genera una factura para la venta de productos
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Cliente y datos básicos */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2 col-span-2">
              <Label htmlFor="cliente_id">Cliente *</Label>
              <Select
                value={formData.cliente_id}
                onValueChange={(value) =>
                  setFormData({ ...formData, cliente_id: value })
                }
                required
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar cliente" />
                </SelectTrigger>
                <SelectContent>
                  {clientes.map((cliente) => (
                    <SelectItem key={cliente.id} value={cliente.id}>
                      {cliente.nombre_fantasia || cliente.nombre}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="fecha_emision">Fecha de Emisión *</Label>
              <Input
                id="fecha_emision"
                type="date"
                value={formData.fecha_emision}
                onChange={(e) =>
                  setFormData({ ...formData, fecha_emision: e.target.value })
                }
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="fecha_vencimiento">Vencimiento *</Label>
              <Input
                id="fecha_vencimiento"
                type="date"
                value={formData.fecha_vencimiento}
                onChange={(e) =>
                  setFormData({ ...formData, fecha_vencimiento: e.target.value })
                }
                required
                min={formData.fecha_emision}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="tipo_factura">Tipo de Factura *</Label>
              <Select
                value={formData.tipo_factura}
                onValueChange={(value) =>
                  setFormData({ ...formData, tipo_factura: value })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="A">A</SelectItem>
                  <SelectItem value="B">B</SelectItem>
                  <SelectItem value="C">C</SelectItem>
                  <SelectItem value="E">E</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="aplicar_iva">IVA</Label>
              <Select
                value={formData.aplicar_iva ? "si" : "no"}
                onValueChange={(value) =>
                  setFormData({ ...formData, aplicar_iva: value === "si" })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="si">Sí (21%)</SelectItem>
                  <SelectItem value="no">No</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Agregar productos */}
          <div className="border rounded-lg p-4 space-y-3">
            <Label className="flex items-center gap-2">
              <Package className="h-4 w-4" />
              Productos
            </Label>

            <div className="flex gap-2">
              <Select value={selectedProductoId} onValueChange={setSelectedProductoId}>
                <SelectTrigger className="flex-1">
                  <SelectValue placeholder="Seleccionar producto" />
                </SelectTrigger>
                <SelectContent>
                  {productos.map((producto) => (
                    <SelectItem key={producto.id} value={producto.id.toString()}>
                      {producto.codigo} - {producto.nombre}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button type="button" onClick={handleAddItem} size="sm">
                <Plus className="h-4 w-4" />
              </Button>
            </div>

            {/* Lista de items */}
            {items.length > 0 && (
              <div className="space-y-2 mt-4">
                {items.map((item) => (
                  <div
                    key={item.producto.id}
                    className="flex items-center gap-2 p-3 bg-muted/50 rounded"
                  >
                    <div className="flex-1">
                      <p className="font-medium text-sm">
                        {item.producto.codigo} - {item.producto.nombre}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Input
                        type="number"
                        min="1"
                        value={item.cantidad}
                        onChange={(e) =>
                          handleUpdateItem(
                            item.producto.id,
                            "cantidad",
                            parseInt(e.target.value) || 1
                          )
                        }
                        className="w-20"
                        placeholder="Cant."
                      />
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        value={item.precio_unitario}
                        onChange={(e) =>
                          handleUpdateItem(
                            item.producto.id,
                            "precio_unitario",
                            parseFloat(e.target.value) || 0
                          )
                        }
                        className="w-32"
                        placeholder="Precio"
                      />
                      <span className="text-sm font-medium w-28 text-right">
                        {formatCurrency(item.cantidad * item.precio_unitario)}
                      </span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemoveItem(item.producto.id)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Resumen de totales */}
          {items.length > 0 && (
            <div className="bg-muted/50 p-4 rounded-lg space-y-2">
              <div className="flex items-center gap-2 text-sm font-medium mb-2">
                <DollarSign className="h-4 w-4" />
                <span>Resumen</span>
              </div>
              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Subtotal:</span>
                  <span className="font-semibold">{formatCurrency(subtotal)}</span>
                </div>
                {formData.aplicar_iva && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">IVA (21%):</span>
                    <span className="font-medium">{formatCurrency(iva)}</span>
                  </div>
                )}
                <div className="border-t pt-1 mt-1 flex justify-between text-base">
                  <span className="font-semibold">Total:</span>
                  <span className="font-bold text-green-600">
                    {formatCurrency(total)}
                  </span>
                </div>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={loading || items.length === 0}>
              {loading ? "Generando..." : "Generar Factura"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
