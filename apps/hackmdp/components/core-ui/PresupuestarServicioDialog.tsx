"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  DollarSign,
  Plus,
  X,
  ListPlus,
  Loader2,
  FileText,
  Wrench,
  Search,
  Hash,
  Check,
  PackagePlus,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { ProductoFormDialog } from "./ProductoFormDialog";
import { Servicio } from "@/lib/types";
import { toast } from "sonner";
import { formatCurrency } from "@/lib/format-currency";

interface PresupuestoItem {
  id: string;
  producto_id?: string;
  codigo?: string;
  descripcion: string;
  cantidad: number;
  precio_unitario: number;
  subtotal: number;
}

interface PresupuestarServicioDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  servicio: Servicio | null;
  onSuccess: () => void;
}

export function PresupuestarServicioDialog({
  open,
  onOpenChange,
  servicio,
  onSuccess,
}: PresupuestarServicioDialogProps) {
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState<PresupuestoItem[]>([]);

  // Búsqueda de productos — panel inline con tabs (Todo / Código / Nombre)
  const [productos, setProductos] = useState<any[]>([]);
  const [searchingProducts, setSearchingProducts] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [searchPanelOpen, setSearchPanelOpen] = useState(false);
  const [searchMode, setSearchMode] = useState<"all" | "codigo" | "nombre">("all");
  const [createProductoOpen, setCreateProductoOpen] = useState(false);

  const [formData, setFormData] = useState({
    validez_dias: 15,
    observaciones: "",
    condiciones_pago: "",
  });

  // Reset al abrir
  useEffect(() => {
    if (!open || !servicio) return;
    setFormData({
      validez_dias: 15,
      observaciones: "",
      condiciones_pago: "",
    });

    // Pre-cargar item con info del equipo
    const equipoNested = (servicio as any).equipo_id?.equipo_id;
    const equipoUnidad = (servicio as any).equipo_unidad_id?.equipos;
    const marca = equipoNested?.marca || equipoUnidad?.marca || "";
    const modelo = equipoNested?.modelo || equipoUnidad?.modelo || servicio.equipo_modelo || "";
    const serie = (servicio as any).equipo_id?.numero_serie || (servicio as any).equipo_unidad_id?.numero_serie || "";

    const equipoInfo = [marca, modelo, serie ? `S/N ${serie}` : null]
      .filter(Boolean)
      .join(" ");

    const fallaInfo = (servicio as { falla_declarada?: string; descripcion?: string }).falla_declarada
      || (servicio as { descripcion?: string }).descripcion
      || "";

    const baseDescripcion = [
      `Reparación ${equipoInfo || "equipo"}`,
      fallaInfo ? `— ${fallaInfo}` : null,
    ]
      .filter(Boolean)
      .join(" ");

    // Pre-cargar precio desde monto_servicio si José ya lo cargó al marcar "precio listo"
    const precioInicial = Number((servicio as any).monto_servicio) || 0;

    setItems([
      {
        id: crypto.randomUUID(),
        descripcion: baseDescripcion,
        cantidad: 1,
        precio_unitario: precioInicial,
        subtotal: precioInicial,
      },
    ]);
  }, [open, servicio]);

  // Total
  const total = useMemo(
    () => items.reduce((sum, i) => sum + (i.subtotal || 0), 0),
    [items]
  );

  // Búsqueda productos con filtro Todo/Código/Nombre
  const searchProducts = async (term: string, mode: "all" | "codigo" | "nombre" = "all") => {
    if (!term || term.length < 2) {
      setProductos([]);
      return;
    }
    setSearchingProducts(true);
    try {
      const params = new URLSearchParams({ search: term, pageSize: "30" });
      if (mode !== "all") params.append("search_field", mode);
      const res = await fetch(`/api/productos?${params.toString()}`);
      const data = await res.json();
      setProductos(Array.isArray(data?.data) ? data.data : Array.isArray(data) ? data : []);
    } catch {
      setProductos([]);
    } finally {
      setSearchingProducts(false);
    }
  };

  const handleAddProducto = (producto: any) => {
    setItems(prev => [
      ...prev,
      {
        id: crypto.randomUUID(),
        producto_id: producto.id,
        codigo: producto.codigo,
        descripcion: producto.nombre,
        cantidad: 1,
        precio_unitario: parseFloat(producto.precio_venta || producto.precio || 0),
        subtotal: parseFloat(producto.precio_venta || producto.precio || 0),
      },
    ]);
    setSearchTerm("");
    setProductos([]);
  };

  const handleAddItemManual = () => {
    setItems(prev => [
      ...prev,
      {
        id: crypto.randomUUID(),
        descripcion: "",
        cantidad: 1,
        precio_unitario: 0,
        subtotal: 0,
      },
    ]);
  };

  const handleUpdateItem = (id: string, field: keyof PresupuestoItem, value: any) => {
    setItems(prev =>
      prev.map(item => {
        if (item.id !== id) return item;
        const updated = { ...item, [field]: value };
        if (field === "cantidad" || field === "precio_unitario") {
          const cantidad = field === "cantidad" ? parseFloat(value) || 0 : item.cantidad;
          const precio = field === "precio_unitario" ? parseFloat(value) || 0 : item.precio_unitario;
          updated.subtotal = cantidad * precio;
        }
        return updated;
      })
    );
  };

  const handleRemoveItem = (id: string) => {
    setItems(prev => prev.filter(item => item.id !== id));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!servicio) return;

    if (items.length === 0) {
      toast.error("Agregá al menos un item al presupuesto");
      return;
    }

    if (items.some(i => !i.descripcion.trim())) {
      toast.error("Todos los items deben tener descripción");
      return;
    }

    setLoading(true);
    try {
      const payload = {
        servicio_id: servicio.id,
        cliente_id: clienteId,
        estado: "borrador",
        subtotal: total,
        total,
        validez_dias: formData.validez_dias,
        observaciones: formData.observaciones || null,
        condiciones_pago: formData.condiciones_pago || null,
        notas: formData.observaciones || null,
        lineas: items.map(i => ({
          producto_id: i.producto_id || null,
          descripcion: i.descripcion,
          cantidad: i.cantidad,
          precio_unitario: i.precio_unitario,
          subtotal: i.subtotal,
        })),
      };

      const res = await fetch("/api/presupuestos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Error al crear presupuesto");
      }

      toast.success("Presupuesto creado");
      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      toast.error(error.message || "Error al crear presupuesto");
    } finally {
      setLoading(false);
    }
  };

  if (!servicio) return null;

  const clienteObj = (servicio as any).cliente_id;
  const clienteId = typeof clienteObj === "string" ? clienteObj : clienteObj?.id || null;
  const clienteNombre =
    servicio.clientes?.nombre_fantasia
    || servicio.clientes?.nombre
    || (typeof clienteObj === "object" ? clienteObj?.nombre_fantasia || clienteObj?.nombre : null)
    || "Sin cliente";

  const equipoNested = (servicio as any).equipo_id?.equipo_id;
  const equipoUnidad = (servicio as any).equipo_unidad_id?.equipos;
  const equipoTexto = [
    equipoNested?.marca || equipoUnidad?.marca,
    equipoNested?.modelo || equipoUnidad?.modelo || servicio.equipo_modelo,
  ].filter(Boolean).join(" ");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-4xl max-h-[90vh] flex flex-col p-0">
        <form onSubmit={handleSubmit} className="flex flex-col min-h-0 flex-1">
          <DialogHeader className="px-6 pt-6 pb-4 border-b flex-shrink-0 bg-purple-50/50 dark:bg-purple-950/20">
            <div className="flex items-center gap-2">
              <Wrench className="h-5 w-5 text-purple-600" />
              <DialogTitle className="text-xl">Presupuestar Reparación</DialogTitle>
              <Badge variant="outline" className="border-purple-400 text-purple-700">
                <FileText className="h-3 w-3 mr-1" />
                Servicio {servicio.numero_ticket || servicio.id?.slice(0, 8)}
              </Badge>
            </div>
            <DialogDescription className="text-sm">
              Cargá los items para presupuestar la reparación. El cliente puede aceptar o rechazar.
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto px-6 py-6 min-h-0 space-y-6">
            {/* Cliente + equipo (read-only) */}
            <div className="grid grid-cols-2 gap-4">
              <div className="p-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
                <p className="text-xs text-muted-foreground mb-1">Cliente</p>
                <p className="font-medium text-sm">{clienteNombre}</p>
              </div>
              <div className="p-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
                <p className="text-xs text-muted-foreground mb-1">Equipo</p>
                <p className="font-medium text-sm">{equipoTexto || "Sin equipo"}</p>
              </div>
            </div>

            {/* Items */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                  Items del Presupuesto
                </h3>
                <div className="flex gap-2">
                  <Button
                    htmlType="button"
                    type="outline"
                    size="small"
                    onClick={handleAddItemManual}
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    Item Manual
                  </Button>
                  <Button
                    htmlType="button"
                    type="outline"
                    size="small"
                    onClick={() => setSearchPanelOpen((v) => !v)}
                  >
                    <ListPlus className="h-4 w-4 mr-1" />
                    {searchPanelOpen ? "Cerrar búsqueda" : "Agregar Producto"}
                  </Button>
                </div>
              </div>

              {/* Panel de búsqueda de productos con tabs */}
              {searchPanelOpen && (
                <div className="rounded-xl border-2 border-dashed p-4 bg-purple-50/80 dark:bg-purple-950/30 border-purple-300 dark:border-purple-700 space-y-3">
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Filtrar:</span>
                    <div className="flex rounded-lg border-2 border-purple-200 dark:border-purple-800 bg-white dark:bg-gray-800 p-1 gap-1">
                      {(["all", "codigo", "nombre"] as const).map((m) => {
                        const label = m === "all" ? "Todo" : m === "codigo" ? "Código" : "Nombre";
                        const Icon = m === "codigo" ? Hash : m === "nombre" ? Search : null;
                        return (
                          <button
                            key={m}
                            type="button"
                            onClick={() => {
                              setSearchMode(m);
                              if (searchTerm) searchProducts(searchTerm, m);
                            }}
                            className={cn(
                              "px-3 py-1.5 text-xs font-semibold rounded-md transition-all flex items-center gap-1.5",
                              searchMode === m
                                ? "bg-purple-600 text-white shadow-sm"
                                : "text-gray-600 dark:text-gray-400 hover:bg-purple-50 dark:hover:bg-purple-900/30"
                            )}
                          >
                            {Icon && <Icon className="h-3.5 w-3.5" />}
                            {label}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder={
                        searchMode === "codigo"
                          ? "Buscar solo por código..."
                          : searchMode === "nombre"
                          ? "Buscar solo por nombre..."
                          : "Buscar por código o nombre..."
                      }
                      value={searchTerm}
                      onChange={(e) => {
                        setSearchTerm(e.target.value);
                        searchProducts(e.target.value, searchMode);
                      }}
                      className="pl-9 bg-white dark:bg-gray-800"
                    />
                    {searchingProducts && (
                      <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
                    )}
                  </div>

                  {productos.length > 0 && (
                    <ScrollArea className="rounded-lg border bg-white dark:bg-gray-800" style={{ height: 240 }}>
                      <div className="p-2 space-y-1">
                        {productos.map((producto) => {
                          const yaAgregado = items.some((i) => i.producto_id === producto.id);
                          return (
                            <button
                              key={producto.id}
                              type="button"
                              onClick={() => handleAddProducto(producto)}
                              className={cn(
                                "w-full flex items-center gap-3 p-2.5 rounded-lg text-left transition-colors",
                                yaAgregado
                                  ? "bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800"
                                  : "hover:bg-gray-50 dark:hover:bg-gray-700"
                              )}
                            >
                              <Badge variant="outline" className="shrink-0 font-mono">
                                {producto.codigo}
                              </Badge>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium truncate">{producto.nombre}</p>
                                <p className="text-xs text-muted-foreground">
                                  {formatCurrency(parseFloat(producto.precio_venta || producto.precio || 0))}
                                </p>
                              </div>
                              {yaAgregado ? (
                                <Badge variant="secondary" className="shrink-0">
                                  <Check className="h-3 w-3 mr-1" />
                                  Agregado
                                </Badge>
                              ) : (
                                <Plus className="h-4 w-4 text-muted-foreground shrink-0" />
                              )}
                            </button>
                          );
                        })}
                      </div>
                    </ScrollArea>
                  )}

                  {searchTerm.length >= 2 && productos.length === 0 && !searchingProducts && (
                    <div className="flex flex-col items-center gap-3 py-4 px-4 border border-dashed rounded-lg bg-white/60 dark:bg-gray-800/60">
                      <p className="text-sm text-muted-foreground text-center">
                        No se encontraron productos con &quot;{searchTerm}&quot;
                      </p>
                      <Button
                        htmlType="button"
                        type="outline"
                        size="small"
                        onClick={() => setCreateProductoOpen(true)}
                      >
                        <PackagePlus className="h-4 w-4 mr-1" />
                        Crear nuevo producto
                      </Button>
                    </div>
                  )}
                </div>
              )}

              {items.length > 0 ? (
                <div className="space-y-2">
                  <div className="grid grid-cols-12 gap-2 px-2 text-xs font-medium text-muted-foreground">
                    <div className="col-span-5">Descripción</div>
                    <div className="col-span-2 text-center">Cantidad</div>
                    <div className="col-span-2 text-right">Precio</div>
                    <div className="col-span-2 text-right">Subtotal</div>
                    <div className="col-span-1"></div>
                  </div>

                  {items.map((item) => (
                    <div
                      key={item.id}
                      className="grid grid-cols-12 gap-2 items-center p-2 rounded-lg border bg-card"
                    >
                      <div className="col-span-5">
                        <Input
                          value={item.descripcion}
                          onChange={(e) => handleUpdateItem(item.id, "descripcion", e.target.value)}
                          placeholder="Descripción"
                          className="h-8"
                        />
                      </div>
                      <div className="col-span-2">
                        <Input
                          type="number"
                          min="1"
                          value={item.cantidad}
                          onChange={(e) => handleUpdateItem(item.id, "cantidad", e.target.value)}
                          className="h-8 text-center"
                        />
                      </div>
                      <div className="col-span-2">
                        <Input
                          type="number"
                          min="0"
                          step="0.01"
                          value={item.precio_unitario}
                          onChange={(e) => handleUpdateItem(item.id, "precio_unitario", e.target.value)}
                          className="h-8 text-right"
                        />
                      </div>
                      <div className="col-span-2 text-right text-sm font-medium">
                        {formatCurrency(item.subtotal)}
                      </div>
                      <div className="col-span-1 flex justify-end">
                        <Button
                          htmlType="button"
                          type="text"
                          size="tiny"
                          className="h-7 w-7 p-0"
                          onClick={() => handleRemoveItem(item.id)}
                        >
                          <X className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </div>
                  ))}

                  <div className="flex justify-end pt-2 border-t">
                    <div className="text-right">
                      <div className="text-lg font-bold">Total: {formatCurrency(total)}</div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-8 border-2 border-dashed rounded-lg">
                  <DollarSign className="h-8 w-8 text-muted-foreground mb-2" />
                  <p className="text-sm text-muted-foreground">Agregá items al presupuesto</p>
                </div>
              )}
            </div>

            {/* Validez + condiciones */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="validez_dias">Validez (días)</Label>
                <Input
                  id="validez_dias"
                  type="number"
                  min="1"
                  value={formData.validez_dias}
                  onChange={(e) => setFormData({ ...formData, validez_dias: parseInt(e.target.value) || 15 })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="condiciones_pago">Condiciones de pago</Label>
                <Input
                  id="condiciones_pago"
                  value={formData.condiciones_pago}
                  onChange={(e) => setFormData({ ...formData, condiciones_pago: e.target.value })}
                  placeholder="Ej: 50% adelanto, 50% al retirar"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="observaciones">Observaciones (opcional)</Label>
              <Textarea
                id="observaciones"
                value={formData.observaciones}
                onChange={(e) => setFormData({ ...formData, observaciones: e.target.value })}
                placeholder="Notas adicionales..."
                rows={2}
                className="resize-none"
              />
            </div>
          </div>

          <DialogFooter className="px-6 py-4 border-t bg-muted/20 flex-shrink-0">
            <Button
              htmlType="button"
              type="default"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Cancelar
            </Button>
            <Button htmlType="submit" type="primary" disabled={loading || items.length === 0}>
              {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Crear Presupuesto
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
      <ProductoFormDialog
        open={createProductoOpen}
        onOpenChange={setCreateProductoOpen}
        initialNombre={searchTerm}
        onSuccess={(nuevo) => {
          if (nuevo?.id) {
            handleAddProducto(nuevo);
          }
        }}
      />
    </Dialog>
  );
}
