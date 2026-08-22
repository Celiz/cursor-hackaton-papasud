"use client";

import { useState, useEffect } from "react";
import { OrdenCompra, Proveedor, Producto } from "@/lib/types";
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
  ClipboardList,
  Building2,
  Loader2,
  Plus,
  Trash2,
  Search,
} from "lucide-react";
import { toast } from "sonner";
import useSWR from "swr";
import { useFormatCurrency } from "@/lib/hooks/use-format-currency";

interface CreateOrdenCompraDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  orden?: OrdenCompra | null;
  proveedores: Proveedor[];
  onSuccess?: () => void;
}

interface ItemForm {
  id?: string;
  producto_id?: string;
  producto_nombre?: string;
  cantidad: number;
  precio_unitario: number;
  lote?: string;
  vencimiento?: string;
}

const initialFormData = {
  proveedor_id: "",
  estado: "pendiente" as string,
  comentarios: "",
};

const estadoOptions = [
  { value: "borrador", label: "Borrador" },
  { value: "pendiente", label: "Pendiente" },
  { value: "enviada", label: "Enviada" },
  { value: "parcial", label: "Parcial" },
  { value: "recibida", label: "Recibida" },
  { value: "cancelada", label: "Cancelada" },
];

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export function CreateOrdenCompraDialog({
  open,
  onOpenChange,
  orden,
  proveedores,
  onSuccess,
}: CreateOrdenCompraDialogProps) {
  const [formData, setFormData] = useState(initialFormData);
  const [items, setItems] = useState<ItemForm[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const { data: productosResp } = useSWR<{ data: Producto[] } | Producto[]>(
    open ? "/api/productos?pageSize=1000" : null,
    fetcher
  );
  const productos = Array.isArray(productosResp) ? productosResp : (productosResp?.data ?? []);

  const isEditing = !!orden;

  // Cargar datos de la orden si estamos editando
  useEffect(() => {
    if (orden && open) {
      setFormData({
        proveedor_id: orden.proveedor_id || "",
        estado: orden.estado || "pendiente",
        comentarios: orden.comentarios || "",
      });
      if (orden.items) {
        setItems(
          orden.items.map((item) => ({
            id: item.id,
            producto_id: item.producto_id,
            producto_nombre: item.producto?.nombre || "",
            cantidad: item.cantidad || 0,
            precio_unitario: item.precio_unitario || 0,
            lote: item.lote || "",
            vencimiento: item.vencimiento?.split("T")[0] || "",
          }))
        );
      }
    } else if (!open) {
      setFormData(initialFormData);
      setItems([]);
    }
  }, [orden, open]);

  const handleClose = () => {
    setFormData(initialFormData);
    setItems([]);
    setSearchQuery("");
    onOpenChange(false);
  };

  const addItem = () => {
    setItems([...items, { cantidad: 1, precio_unitario: 0 }]);
  };

  const removeItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const updateItem = (index: number, field: keyof ItemForm, value: any) => {
    const newItems = [...items];
    newItems[index] = { ...newItems[index], [field]: value };

    // Si seleccionamos un producto, llenar el precio
    if (field === "producto_id" && productos) {
      const producto = productos.find((p) => p.id === value);
      if (producto) {
        newItems[index].producto_nombre = producto.nombre;
        newItems[index].precio_unitario = producto.precio_venta || producto.precio_compra || 0;
      }
    }

    setItems(newItems);
  };

  const calcularTotal = () => {
    return items.reduce(
      (sum, item) => sum + item.cantidad * item.precio_unitario,
      0
    );
  };

  const handleSubmit = async () => {
    if (!formData.proveedor_id) {
      toast.error("El proveedor es requerido");
      return;
    }

    if (items.length === 0) {
      toast.error("Debe agregar al menos un item");
      return;
    }

    // Validar que todos los items tengan producto
    const itemsInvalidos = items.some((item) => !item.producto_id);
    if (itemsInvalidos) {
      toast.error("Todos los items deben tener un producto seleccionado");
      return;
    }

    setLoading(true);
    try {
      const url = isEditing ? `/api/ordenes-compra/${orden.id}` : "/api/ordenes-compra";
      const method = isEditing ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...formData, items }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Error al guardar orden");
      }

      toast.success(isEditing ? "Orden actualizada" : "Orden creada");
      handleClose();
      onSuccess?.();
    } catch (error: any) {
      toast.error(error.message || "Error al guardar orden");
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = useFormatCurrency()

  // Filtrar productos para búsqueda
  const productosFiltrados = productos?.filter((p) =>
    p.nombre?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.codigo?.toLowerCase().includes(searchQuery.toLowerCase())
  ) || [];

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[900px] max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ClipboardList className="h-5 w-5 text-blue-600" />
            {isEditing ? "Editar Orden de Compra" : "Nueva Orden de Compra"}
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="max-h-[60vh] pr-4">
          <div className="space-y-6 py-4">
            {/* Datos principales */}
            <div className="grid grid-cols-2 gap-4">
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
                <Label htmlFor="estado">Estado</Label>
                <Select
                  value={formData.estado}
                  onValueChange={(value: any) => setFormData({ ...formData, estado: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {estadoOptions.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Items */}
            <div className="space-y-3 pt-4 border-t">
              <div className="flex items-center justify-between">
                <Label className="text-base font-semibold">Items de la Orden</Label>
                <Button type="button" variant="outline" size="sm" onClick={addItem}>
                  <Plus className="h-4 w-4 mr-1" />
                  Agregar Item
                </Button>
              </div>

              {items.length > 0 ? (
                <div className="space-y-3">
                  {/* Header */}
                  <div className="grid grid-cols-12 gap-2 px-3 text-xs font-medium text-muted-foreground">
                    <div className="col-span-4">Producto</div>
                    <div className="col-span-2">Cantidad</div>
                    <div className="col-span-2">Precio Unit.</div>
                    <div className="col-span-2">Lote / Vto</div>
                    <div className="col-span-1 text-right">Subtotal</div>
                    <div className="col-span-1"></div>
                  </div>

                  {items.map((item, index) => (
                    <div
                      key={index}
                      className="grid grid-cols-12 gap-2 p-3 border rounded-lg bg-gray-50 dark:bg-gray-900"
                    >
                      <div className="col-span-4">
                        <Select
                          value={item.producto_id || ""}
                          onValueChange={(value) => updateItem(index, "producto_id", value)}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Seleccionar producto..." />
                          </SelectTrigger>
                          <SelectContent>
                            <div className="p-2">
                              <Input
                                placeholder="Buscar producto..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="h-8"
                              />
                            </div>
                            <ScrollArea className="h-[200px]">
                              {productosFiltrados.slice(0, 50).map((p) => (
                                <SelectItem key={p.id} value={p.id}>
                                  <div className="flex flex-col">
                                    <span className="font-medium">{p.nombre}</span>
                                    {p.codigo && (
                                      <span className="text-xs text-muted-foreground">
                                        {p.codigo}
                                      </span>
                                    )}
                                  </div>
                                </SelectItem>
                              ))}
                            </ScrollArea>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="col-span-2">
                        <Input
                          type="number"
                          placeholder="Cantidad"
                          value={item.cantidad || ""}
                          onChange={(e) => updateItem(index, "cantidad", parseFloat(e.target.value) || 0)}
                        />
                      </div>
                      <div className="col-span-2">
                        <Input
                          type="number"
                          placeholder="Precio"
                          value={item.precio_unitario || ""}
                          onChange={(e) =>
                            updateItem(index, "precio_unitario", parseFloat(e.target.value) || 0)
                          }
                        />
                      </div>
                      <div className="col-span-2 flex gap-1">
                        <Input
                          placeholder="Lote"
                          value={item.lote || ""}
                          onChange={(e) => updateItem(index, "lote", e.target.value)}
                          className="w-1/2"
                        />
                        <Input
                          type="date"
                          value={item.vencimiento || ""}
                          onChange={(e) => updateItem(index, "vencimiento", e.target.value)}
                          className="w-1/2"
                        />
                      </div>
                      <div className="col-span-1 flex items-center justify-end text-sm font-medium">
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

                  {/* Total */}
                  <div className="flex justify-end pt-3 border-t">
                    <div className="text-right">
                      <div className="text-sm text-muted-foreground">Total estimado:</div>
                      <div className="text-xl font-bold text-blue-600">
                        {formatCurrency(calcularTotal())}
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground border rounded-lg border-dashed">
                  <ClipboardList className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No hay items. Click en "Agregar Item" para comenzar.</p>
                </div>
              )}
            </div>

            {/* Comentarios */}
            <div className="space-y-2 pt-4 border-t">
              <Label htmlFor="comentarios">Comentarios</Label>
              <Textarea
                id="comentarios"
                value={formData.comentarios}
                onChange={(e) => setFormData({ ...formData, comentarios: e.target.value })}
                placeholder="Notas adicionales, instrucciones de entrega, etc..."
                rows={3}
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
            {isEditing ? "Guardar Cambios" : "Crear Orden"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
