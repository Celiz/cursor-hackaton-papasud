"use client";

import React, { useState, useEffect, useMemo } from "react";
import { formatCurrency } from "@/lib/format-currency";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SearchableCombobox } from "@/components/ui/searchable-combobox";
import { searchClientes } from "@/hooks/use-client-search";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { DollarSign, Building2, AlertTriangle, Plus, X, Check, ListPlus, Calendar, FileText, Package, Receipt, Hash } from "lucide-react";
import { Factura, Cliente } from "@/lib/types";
import useSWR from "swr";
import { Checkbox } from "@/components/ui/checkbox";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface FacturaFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  factura?: Factura | null;
  defaultClienteId?: string;
  onSuccess: () => void;
}

type PrecioFuente = 'override_fijo' | 'override_margen' | 'lista_margen' | 'producto_default' | 'manual';

interface FacturaItem {
  id: string;
  producto_id?: string;
  codigo?: string;
  descripcion: string;
  cantidad: number;
  precio_unitario: number;
  alicuota_iva: number;
  subtotal: number;
  fuente?: PrecioFuente;
  lista_nombre?: string | null;
}

const fetcher = async (url: string) => {
  const res = await fetch(url);
  const data = await res.json();
  if (!res.ok || data.error) {
    console.error('Error fetching:', url, data);
    return [];
  }
  return Array.isArray(data) ? data : [];
};

// Mapeo de condición IVA a etiqueta legible
const CONDICION_IVA_LABELS: Record<string, string> = {
  responsable_inscripto: "Responsable Inscripto",
  monotributista: "Monotributista",
  exento: "Exento",
  consumidor_final: "Consumidor Final",
};

// Tipos de factura disponibles según condición IVA del cliente
// NOTA: IVR (remitos internos) se manejan desde /dashboard/ivr, no desde facturas
const getTiposFacturaDisponibles = (condicionIva?: string) => {
  // Si no hay condición IVA o es responsable inscripto, puede recibir factura A
  if (!condicionIva || condicionIva === 'responsable_inscripto') {
    return [
      { value: "A", label: "Factura A", disabled: false },
      { value: "B", label: "Factura B", disabled: false },
      { value: "C", label: "Factura C", disabled: false },
      { value: "E", label: "Factura E (Exportación)", disabled: false },
    ];
  }

  // Para monotributistas, exentos o consumidor final, no puede recibir factura A
  return [
    { value: "A", label: "Factura A", disabled: true, reason: `El cliente es ${CONDICION_IVA_LABELS[condicionIva] || condicionIva}` },
    { value: "B", label: "Factura B", disabled: false },
    { value: "C", label: "Factura C", disabled: false },
    { value: "E", label: "Factura E (Exportación)", disabled: false },
  ];
};

// Alícuotas IVA según ARCA
const ALICUOTAS_IVA = [
  { value: 0, label: "0%", codigo: 3 },
  { value: 2.5, label: "2.5%", codigo: 9 },
  { value: 5, label: "5%", codigo: 8 },
  { value: 10.5, label: "10.5%", codigo: 4 },
  { value: 21, label: "21%", codigo: 5 },
  { value: 27, label: "27%", codigo: 6 },
];

export function FacturaFormDialog({
  open,
  onOpenChange,
  factura,
  defaultClienteId,
  onSuccess,
}: FacturaFormDialogProps) {
  const { data: clientes } = useSWR<Cliente[]>('/api/clientes?view=principal', fetcher);
  const [loading, setLoading] = useState(false);
  const [aplicarSaldoAFavor, setAplicarSaldoAFavor] = useState(false);
  const [items, setItems] = useState<FacturaItem[]>([]);
  const [productos, setProductos] = useState<any[]>([]);
  const [searchingProducts, setSearchingProducts] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [popoverOpen, setPopoverOpen] = useState(false);

  const [formData, setFormData] = useState({
    cliente_id: "",
    fecha_emision: new Date().toISOString().split("T")[0],
    total: "",
    estado: "pendiente" as "pendiente" | "pagada" | "vencida" | "parcial" | "anulada",
    tipo_factura: "B",
    comentarios: "",
  });

  // Obtener información del cliente seleccionado
  const clienteSeleccionado = useMemo(() => {
    if (!clientes || !Array.isArray(clientes)) return undefined;
    return clientes.find(c => c.id === formData.cliente_id);
  }, [clientes, formData.cliente_id]);

  const saldoAFavorCliente = clienteSeleccionado?.saldo_a_favor || 0;

  // Calcular totales desde los items
  const { subtotal, totalIva, totalCalculado } = useMemo(() => {
    const subtotal = items.reduce((sum, item) => sum + item.subtotal, 0);
    const totalIva = items.reduce((sum, item) => sum + (item.subtotal * item.alicuota_iva / 100), 0);
    return {
      subtotal,
      totalIva,
      totalCalculado: subtotal + totalIva
    };
  }, [items]);

  // Total de la factura (desde items o input manual)
  const totalFactura = items.length > 0 ? totalCalculado : (parseFloat(formData.total) || 0);
  const saldoAplicado = aplicarSaldoAFavor ? Math.min(saldoAFavorCliente, totalFactura) : 0;
  const totalConDescuento = Math.max(0, totalFactura - saldoAplicado);

  // Tipos de factura disponibles según el cliente
  const tiposFactura = useMemo(() => {
    return getTiposFacturaDisponibles(clienteSeleccionado?.condicion_iva);
  }, [clienteSeleccionado?.condicion_iva]);

  // Verificar si el tipo actual es válido
  useEffect(() => {
    if (clienteSeleccionado) {
      const tipoActual = tiposFactura.find(t => t.value === formData.tipo_factura);
      if (tipoActual?.disabled) {
        // Si el tipo actual está deshabilitado, cambiar a B
        setFormData(prev => ({ ...prev, tipo_factura: "B" }));
        toast.info(`Tipo de factura cambiado a B porque el cliente es ${CONDICION_IVA_LABELS[clienteSeleccionado.condicion_iva || ''] || 'no Responsable Inscripto'}`);
      }
    }
  }, [clienteSeleccionado, tiposFactura, formData.tipo_factura]);

  useEffect(() => {
    setAplicarSaldoAFavor(false);
    setItems([]);
    if (factura) {
      setFormData({
        cliente_id: factura.cliente_id || "",
        fecha_emision: factura.fecha_emision || new Date().toISOString().split("T")[0],
        total: factura.total?.toString() || "",
        estado: factura.estado || "pendiente",
        tipo_factura: factura.tipo_factura || "B",
        comentarios: "",
      });
      // TODO: Cargar items si existen
    } else {
      setFormData({
        cliente_id: defaultClienteId || "",
        fecha_emision: new Date().toISOString().split("T")[0],
        total: "",
        estado: "pendiente",
        tipo_factura: "B",
        comentarios: "",
      });
    }
  }, [factura, open, defaultClienteId]);

  // Buscar productos
  const searchProducts = async (term: string) => {
    if (!term || term.length < 2) {
      setProductos([]);
      return;
    }

    setSearchingProducts(true);
    try {
      const res = await fetch(`/api/productos?search=${encodeURIComponent(term)}&pageSize=50`);
      if (!res.ok) throw new Error('Error al buscar productos');

      const result = await res.json();
      // La API devuelve { data: [], pagination: {} }
      const products = result.data || result || [];
      setProductos(Array.isArray(products) ? products : []);
    } catch (error) {
      console.error('Error searching products:', error);
      toast.error('Error al buscar productos');
      setProductos([]);
    } finally {
      setSearchingProducts(false);
    }
  };

  // Agregar item desde producto
  const handleAddProducto = async (producto: any) => {
    const existente = items.find(i => i.producto_id === producto.id);

    if (existente) {
      setItems(items.map(i =>
        i.producto_id === producto.id
          ? { ...i, cantidad: i.cantidad + 1, subtotal: (i.cantidad + 1) * i.precio_unitario }
          : i
      ));
      return;
    }

    const fallback = Number(producto.precio_venta ?? producto.precio ?? 0);
    const tempId = crypto.randomUUID();
    setItems(prev => [
      ...prev,
      {
        id: tempId,
        producto_id: producto.id,
        codigo: producto.codigo,
        descripcion: producto.nombre,
        cantidad: 1,
        precio_unitario: fallback,
        alicuota_iva: 21,
        subtotal: fallback,
        fuente: 'producto_default',
        lista_nombre: null,
      }
    ]);
    toast.success(`${producto.nombre} agregado`);

    try {
      const params = new URLSearchParams();
      params.set('producto_ids', producto.id);
      if (formData.cliente_id) params.set('cliente_id', formData.cliente_id);
      const res = await fetch(`/api/precios/resolver?${params.toString()}`);
      if (!res.ok) return;
      const data = await res.json();
      const r = (data.results || [])[0];
      if (!r) return;
      const precio = Number(r.precio_venta) || fallback;
      setItems(prev => prev.map(i =>
        i.id === tempId
          ? {
              ...i,
              precio_unitario: precio,
              subtotal: i.cantidad * precio,
              fuente: r.fuente as PrecioFuente,
              lista_nombre: r.lista_nombre || null,
            }
          : i
      ));
    } catch {
      // ignore — fallback price stays
    }
  };

  // Agregar item manual
  const handleAddItemManual = () => {
    setItems([
      ...items,
      {
        id: crypto.randomUUID(),
        descripcion: "",
        cantidad: 1,
        precio_unitario: 0,
        alicuota_iva: 21,
        subtotal: 0,
      }
    ]);
  };

  // Actualizar item
  const handleUpdateItem = (id: string, field: keyof FacturaItem, value: any) => {
    setItems(items.map(item => {
      if (item.id !== id) return item;

      const updated = { ...item, [field]: value };

      // Recalcular subtotal
      if (field === 'cantidad' || field === 'precio_unitario') {
        updated.subtotal = updated.cantidad * updated.precio_unitario;
      }
      if (field === 'precio_unitario') updated.fuente = 'manual';

      return updated;
    }));
  };

  // Eliminar item
  const handleRemoveItem = (id: string) => {
    setItems(items.filter(i => i.id !== id));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Validar que hay items o total manual
      if (items.length === 0 && !formData.total) {
        throw new Error("Agrega al menos un item o ingresa el total manualmente");
      }

      // Crear comentario sobre saldo aplicado
      const comentarios: { texto: string; fecha: string }[] = [];
      if (formData.comentarios) {
        comentarios.push({ texto: formData.comentarios, fecha: new Date().toISOString() });
      }
      if (aplicarSaldoAFavor && saldoAplicado > 0) {
        comentarios.push({
          texto: `Saldo a favor aplicado: ${formatCurrency(saldoAplicado)}`,
          fecha: new Date().toISOString()
        });
      }

      const body = {
        ...formData,
        total: totalFactura,
        subtotal: items.length > 0 ? subtotal : undefined,
        total_iva: items.length > 0 ? totalIva : undefined,
        items: items.length > 0 ? items : undefined,
        comentarios,
        saldo_aplicado: aplicarSaldoAFavor ? saldoAplicado : 0,
        // Datos del cliente para ARCA
        cliente_cuit: clienteSeleccionado?.cuit,
        cliente_condicion_iva: clienteSeleccionado?.condicion_iva,
        cliente_nombre: clienteSeleccionado?.nombre,
      };

      const url = factura ? `/api/facturas` : `/api/facturas`;
      const method = factura ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(factura ? { ...body, id: factura.id } : body),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Error al guardar factura");
      }

      const facturaCreada = await res.json();

      // Si se aplicó saldo a favor, descontar del cliente
      if (aplicarSaldoAFavor && saldoAplicado > 0 && formData.cliente_id) {
        const nuevoSaldo = saldoAFavorCliente - saldoAplicado;
        await fetch(`/api/clientes/${formData.cliente_id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ saldo_a_favor: nuevoSaldo }),
        });
      }

      // Solicitar CAE automáticamente para facturas A, B, C (no IVR ni E)
      const tiposConCAE = ['A', 'B', 'C'];
      if (!factura && tiposConCAE.includes(formData.tipo_factura) && facturaCreada?.id) {
        toast.success("Factura creada. Solicitando CAE a ARCA...");

        try {
          const caeRes = await fetch('/api/arca/facturar', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ factura_id: facturaCreada.id }),
          });

          const caeData = await caeRes.json();

          if (caeData.success) {
            if (caeData.ya_autorizada) {
              toast.info(`Factura ya tenía CAE: ${caeData.cae}`);
            } else {
              toast.success(`CAE obtenido: ${caeData.cae}`, {
                description: `Vence: ${caeData.cae_vto}`,
                duration: 5000,
              });
            }
          } else if (caeData.es_temporal) {
            // ARCA no disponible temporalmente
            toast.warning("ARCA no disponible", {
              description: "La factura se guardó. Podrás solicitar el CAE más tarde.",
              duration: 6000,
            });
          } else {
            // Error al obtener CAE
            const errorMsg = caeData.errores?.[0]?.descripcion || caeData.error || "Error al obtener CAE";
            toast.error("Error al obtener CAE", {
              description: errorMsg,
              duration: 8000,
            });
          }
        } catch (caeError) {
          console.error("Error al solicitar CAE:", caeError);
          toast.warning("No se pudo solicitar CAE", {
            description: "La factura se guardó. Podrás solicitar el CAE manualmente.",
            duration: 6000,
          });
        }
      } else {
        toast.success(factura ? "Factura actualizada" : "Factura creada");
      }

      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      toast.error(error.message || "Error al guardar factura");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col p-0">
        <DialogHeader className="px-6 pt-6 pb-4 border-b flex-shrink-0">
          <DialogTitle className="text-xl">
            {factura ? "Editar Factura" : "Nueva Factura"}
          </DialogTitle>
          <DialogDescription>
            {factura
              ? "Modifica los datos de la factura"
              : "Completa los datos para crear una nueva factura"}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col min-h-0 flex-1">
          <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6 min-h-0 bg-gradient-to-b from-gray-50/50 to-white dark:from-gray-900/50 dark:to-gray-950">
            {/* Sección 1: Cliente */}
            <div className="space-y-4 p-4 rounded-xl border border-blue-100 dark:border-blue-900/30 bg-gradient-to-br from-blue-50/50 to-white dark:from-blue-950/20 dark:to-gray-900">
              <div className="flex items-center gap-2 pb-2 border-b border-blue-100 dark:border-blue-900/30">
                <div className="p-1.5 rounded-lg bg-blue-100 dark:bg-blue-900/50">
                  <Building2 className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                </div>
                <h3 className="text-sm font-semibold text-blue-900 dark:text-blue-100 uppercase tracking-wide">
                  Cliente
                </h3>
              </div>

              <div className="space-y-2">
                <Label htmlFor="cliente_id" className="text-sm font-medium">Seleccionar Cliente *</Label>
                <SearchableCombobox
                  value={formData.cliente_id}
                  onValueChange={async (value) => {
                    const prevId = formData.cliente_id;
                    setFormData({ ...formData, cliente_id: value });
                    // If cliente changes and there are items already, re-resolve prices.
                    if (prevId !== value && items.length > 0) {
                      const productoIds = items.map(i => i.producto_id).filter(Boolean) as string[];
                      if (productoIds.length === 0) return;
                      try {
                        const params = new URLSearchParams();
                        params.set('producto_ids', productoIds.join(','));
                        if (value) params.set('cliente_id', value);
                        const res = await fetch(`/api/precios/resolver?${params.toString()}`);
                        if (!res.ok) return;
                        const data = await res.json();
                        const byId = new Map<string, any>((data.results || []).map((r: any) => [r.producto_id, r]));
                        setItems(prev => prev.map(it => {
                          if (!it.producto_id) return it;
                          if (it.fuente === 'manual') return it; // respect manual edits
                          const r = byId.get(it.producto_id);
                          if (!r) return it;
                          const precio = Number(r.precio_venta) || it.precio_unitario;
                          return {
                            ...it,
                            precio_unitario: precio,
                            subtotal: it.cantidad * precio,
                            fuente: r.fuente as PrecioFuente,
                            lista_nombre: r.lista_nombre || null,
                          };
                        }));
                        toast.success('Precios actualizados segun la lista del cliente');
                      } catch {
                        // ignore
                      }
                    }
                  }}
                  searchFn={searchClientes}
                  placeholder="Buscar cliente por nombre, CUIT o ID..."
                  emptyMessage="No se encontraron clientes"
                />
              </div>

              {/* Datos del cliente seleccionado */}
              {clienteSeleccionado && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-muted/50 rounded-lg p-4 space-y-3"
                >
                  <div className="flex items-center gap-2 text-sm font-medium">
                    <Building2 className="h-4 w-4 text-muted-foreground" />
                    {clienteSeleccionado.nombre}
                  </div>

                  <div className="grid grid-cols-3 gap-4 text-sm">
                    <div>
                      <span className="text-muted-foreground">CUIT:</span>{" "}
                      <span className="font-medium">
                        {clienteSeleccionado.cuit || "No registrado"}
                      </span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Condición IVA:</span>{" "}
                      <Badge variant={clienteSeleccionado.condicion_iva === 'responsable_inscripto' ? 'default' : 'secondary'}>
                        {CONDICION_IVA_LABELS[clienteSeleccionado.condicion_iva || ''] || 'No especificada'}
                      </Badge>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Dirección:</span>{" "}
                      <span className="font-medium">
                        {clienteSeleccionado.direccion || "No registrada"}
                      </span>
                    </div>
                  </div>

                  {/* Alerta si el cliente no puede recibir Factura A */}
                  {clienteSeleccionado.condicion_iva && clienteSeleccionado.condicion_iva !== 'responsable_inscripto' && (
                    <div className="flex items-start gap-2 p-2 bg-amber-50 dark:bg-amber-950/30 rounded border border-amber-200 dark:border-amber-800">
                      <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5 flex-shrink-0" />
                      <p className="text-xs text-amber-700 dark:text-amber-400">
                        Este cliente es <strong>{CONDICION_IVA_LABELS[clienteSeleccionado.condicion_iva]}</strong>.
                        Solo puede recibir facturas tipo B, C o E.
                      </p>
                    </div>
                  )}

                  {/* Alerta si falta CUIT para Factura A */}
                  {!clienteSeleccionado.cuit && formData.tipo_factura === 'A' && (
                    <div className="flex items-start gap-2 p-2 bg-red-50 dark:bg-red-950/30 rounded border border-red-200 dark:border-red-800">
                      <AlertTriangle className="h-4 w-4 text-red-600 mt-0.5 flex-shrink-0" />
                      <p className="text-xs text-red-700 dark:text-red-400">
                        <strong>CUIT requerido:</strong> La Factura A requiere que el cliente tenga CUIT registrado.
                      </p>
                    </div>
                  )}
                </motion.div>
              )}
            </div>

            {/* Sección 2: Datos de la Factura */}
            <div className="space-y-4 p-4 rounded-xl border border-purple-100 dark:border-purple-900/30 bg-gradient-to-br from-purple-50/50 to-white dark:from-purple-950/20 dark:to-gray-900">
              <div className="flex items-center gap-2 pb-2 border-b border-purple-100 dark:border-purple-900/30">
                <div className="p-1.5 rounded-lg bg-purple-100 dark:bg-purple-900/50">
                  <Receipt className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                </div>
                <h3 className="text-sm font-semibold text-purple-900 dark:text-purple-100 uppercase tracking-wide">
                  Datos de la Factura
                </h3>
              </div>

              <div className="grid grid-cols-4 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="fecha_emision" className="text-sm font-medium flex items-center gap-1.5">
                    <Calendar className="h-3.5 w-3.5 text-purple-500" />
                    Fecha de Emisión *
                  </Label>
                  <Input
                    id="fecha_emision"
                    type="date"
                    value={formData.fecha_emision}
                    onChange={(e) =>
                      setFormData({ ...formData, fecha_emision: e.target.value })
                    }
                    required
                    className="h-10 bg-white dark:bg-gray-800 border-purple-200 dark:border-purple-800 focus:border-purple-400"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="tipo_factura" className="text-sm font-medium flex items-center gap-1.5">
                    <FileText className="h-3.5 w-3.5 text-purple-500" />
                    Tipo de Factura *
                  </Label>
                  <Select
                    value={formData.tipo_factura}
                    onValueChange={(value) =>
                      setFormData({ ...formData, tipo_factura: value })
                    }
                  >
                    <SelectTrigger className="h-10 bg-white dark:bg-gray-800 border-purple-200 dark:border-purple-800">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {tiposFactura.map((tipo) => (
                        <SelectItem
                          key={tipo.value}
                          value={tipo.value}
                          disabled={tipo.disabled}
                          className={tipo.disabled ? "text-muted-foreground" : ""}
                        >
                          {tipo.label}
                          {tipo.disabled && tipo.reason && (
                            <span className="ml-2 text-xs text-muted-foreground">
                              ({tipo.reason})
                            </span>
                          )}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="estado" className="text-sm font-medium flex items-center gap-1.5">
                    <Hash className="h-3.5 w-3.5 text-purple-500" />
                    Estado *
                  </Label>
                  <Select
                    value={formData.estado}
                    onValueChange={(value: "pendiente" | "pagada" | "vencida") =>
                      setFormData({ ...formData, estado: value })
                    }
                  >
                    <SelectTrigger className="h-10 bg-white dark:bg-gray-800 border-purple-200 dark:border-purple-800">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pendiente">Pendiente</SelectItem>
                      <SelectItem value="pagada">Pagada</SelectItem>
                      <SelectItem value="vencida">Vencida</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {items.length === 0 && (
                  <div className="space-y-2">
                    <Label htmlFor="total" className="text-sm font-medium flex items-center gap-1.5">
                      <DollarSign className="h-3.5 w-3.5 text-purple-500" />
                      Total Manual *
                    </Label>
                    <Input
                      id="total"
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder="0.00"
                      value={formData.total}
                      onChange={(e) =>
                        setFormData({ ...formData, total: e.target.value })
                      }
                      className="h-10 bg-white dark:bg-gray-800 border-purple-200 dark:border-purple-800"
                    />
                  </div>
                )}
              </div>
            </div>

            {/* Sección 3: Items */}
            <div className="space-y-4 p-4 rounded-xl border border-emerald-100 dark:border-emerald-900/30 bg-gradient-to-br from-emerald-50/50 to-white dark:from-emerald-950/20 dark:to-gray-900">
              <div className="flex items-center justify-between pb-2 border-b border-emerald-100 dark:border-emerald-900/30">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-emerald-100 dark:bg-emerald-900/50">
                    <Package className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                  </div>
                  <h3 className="text-sm font-semibold text-emerald-900 dark:text-emerald-100 uppercase tracking-wide">
                    Items de la Factura
                  </h3>
                </div>
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
                  <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
                    <PopoverTrigger asChild>
                      <Button htmlType="button" type="outline" size="small">
                        <ListPlus className="h-4 w-4 mr-1" />
                        Agregar Producto
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[500px] p-0" align="end">
                      <Command shouldFilter={false}>
                        <CommandInput
                          placeholder="Buscar producto por nombre o código..."
                          value={searchTerm}
                          onValueChange={(value) => {
                            setSearchTerm(value);
                            searchProducts(value);
                          }}
                        />
                        <CommandList className="max-h-[300px]">
                          <CommandEmpty>
                            {searchingProducts ? 'Buscando...' : 'No se encontraron productos'}
                          </CommandEmpty>
                          <CommandGroup>
                            {productos.map((producto) => (
                              <CommandItem
                                key={producto.id}
                                value={producto.id}
                                onSelect={() => {
                                  handleAddProducto(producto);
                                }}
                              >
                                <Check
                                  className={cn(
                                    "mr-2 h-4 w-4",
                                    items.some(i => i.producto_id === producto.id)
                                      ? "opacity-100"
                                      : "opacity-0"
                                  )}
                                />
                                <div className="flex items-center gap-2 flex-1">
                                  {producto.codigo && (
                                    <Badge variant="outline" className="text-xs">
                                      {producto.codigo}
                                    </Badge>
                                  )}
                                  <span className="flex-1">{producto.nombre}</span>
                                  <span className="text-sm text-muted-foreground">
                                    {formatCurrency(Number(producto.precio_venta ?? producto.precio ?? 0))}
                                  </span>
                                </div>
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                </div>
              </div>

              {/* Lista de items */}
              {items.length > 0 ? (
                <div className="space-y-3">
                  {/* Header */}
                  <div className="grid grid-cols-12 gap-2 text-xs font-semibold text-emerald-700 dark:text-emerald-300 px-3 py-2 bg-emerald-100/50 dark:bg-emerald-900/30 rounded-lg">
                    <div className="col-span-4">Descripción</div>
                    <div className="col-span-2 text-center">Cantidad</div>
                    <div className="col-span-2 text-right">Precio Unit.</div>
                    <div className="col-span-2 text-center">IVA</div>
                    <div className="col-span-1 text-right">Subtotal</div>
                    <div className="col-span-1"></div>
                  </div>

                  {/* Items */}
                  {items.map((item, index) => (
                    <motion.div
                      key={item.id}
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.05 }}
                      className="grid grid-cols-12 gap-2 items-center p-3 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm hover:shadow-md transition-shadow"
                    >
                      <div className="col-span-4">
                        <Input
                          value={item.descripcion}
                          onChange={(e) => handleUpdateItem(item.id, 'descripcion', e.target.value)}
                          placeholder="Descripción del item"
                          className="h-8 text-sm"
                        />
                        {item.fuente && item.fuente !== 'producto_default' && (
                          <span
                            className={cn(
                              'mt-1 inline-flex items-center px-1.5 py-0 rounded text-[10px] font-medium',
                              item.fuente === 'override_fijo' && 'bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300',
                              item.fuente === 'override_margen' && 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300',
                              item.fuente === 'lista_margen' && 'bg-purple-50 text-purple-700 dark:bg-purple-950/40 dark:text-purple-300',
                              item.fuente === 'manual' && 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300',
                            )}
                            title={item.lista_nombre ? `Lista: ${item.lista_nombre}` : undefined}
                          >
                            {item.fuente === 'override_fijo' && 'precio fijo'}
                            {item.fuente === 'override_margen' && 'override %'}
                            {item.fuente === 'lista_margen' && (item.lista_nombre || 'lista')}
                            {item.fuente === 'manual' && 'manual'}
                          </span>
                        )}
                      </div>
                      <div className="col-span-2">
                        <Input
                          type="number"
                          min="1"
                          value={item.cantidad}
                          onChange={(e) => handleUpdateItem(item.id, 'cantidad', parseInt(e.target.value) || 1)}
                          className="h-8 text-sm text-center"
                        />
                      </div>
                      <div className="col-span-2">
                        <Input
                          type="number"
                          step="0.01"
                          min="0"
                          value={item.precio_unitario}
                          onChange={(e) => handleUpdateItem(item.id, 'precio_unitario', parseFloat(e.target.value) || 0)}
                          className="h-8 text-sm text-right"
                        />
                      </div>
                      <div className="col-span-2">
                        <Select
                          value={item.alicuota_iva.toString()}
                          onValueChange={(value) => handleUpdateItem(item.id, 'alicuota_iva', parseFloat(value))}
                        >
                          <SelectTrigger className="h-8 text-sm">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {ALICUOTAS_IVA.map((ali) => (
                              <SelectItem key={ali.value} value={ali.value.toString()}>
                                {ali.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="col-span-1 text-right text-sm font-medium">
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
                    </motion.div>
                  ))}

                  {/* Totales */}
                  <div className="mt-4 p-4 bg-gradient-to-r from-emerald-100 to-teal-100 dark:from-emerald-900/40 dark:to-teal-900/40 rounded-xl border border-emerald-200 dark:border-emerald-800 space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-emerald-700 dark:text-emerald-300">Subtotal:</span>
                      <span className="font-medium text-emerald-900 dark:text-emerald-100">{formatCurrency(subtotal)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-emerald-700 dark:text-emerald-300">IVA:</span>
                      <span className="font-medium text-emerald-900 dark:text-emerald-100">{formatCurrency(totalIva)}</span>
                    </div>
                    <div className="flex justify-between text-lg font-bold pt-2 border-t border-emerald-300 dark:border-emerald-700">
                      <span className="text-emerald-800 dark:text-emerald-200">Total:</span>
                      <span className="text-emerald-900 dark:text-emerald-100">{formatCurrency(totalCalculado)}</span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-10 text-sm text-emerald-600 dark:text-emerald-400 border-2 border-dashed border-emerald-200 dark:border-emerald-800 rounded-xl bg-emerald-50/50 dark:bg-emerald-950/20">
                  <Package className="h-10 w-10 mx-auto mb-3 text-emerald-400 dark:text-emerald-600" />
                  <p className="font-medium">No hay items agregados</p>
                  <p className="text-xs text-emerald-500 dark:text-emerald-500 mt-1">
                    Agrega productos o items manuales, o ingresa un total manual arriba
                  </p>
                </div>
              )}
            </div>

            {/* Saldo a favor del cliente */}
            {saldoAFavorCliente > 0 && (
              <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="border border-emerald-200 dark:border-emerald-800/50 rounded-lg p-4 bg-emerald-50/50 dark:bg-emerald-950/20 space-y-3"
                >
                  <div className="flex items-center gap-2">
                    <DollarSign className="h-5 w-5 text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                        Este cliente tiene saldo a favor
                      </p>
                      <p className="text-xs text-gray-600 dark:text-gray-400">
                        Disponible: {formatCurrency(saldoAFavorCliente)}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="aplicar_saldo"
                      checked={aplicarSaldoAFavor}
                      onCheckedChange={(checked) => setAplicarSaldoAFavor(checked === true)}
                      className="h-4 w-4"
                    />
                    <label
                      htmlFor="aplicar_saldo"
                      className="text-sm font-medium leading-none cursor-pointer text-gray-900 dark:text-gray-100"
                    >
                      Aplicar saldo a favor a esta factura
                    </label>
                  </div>

                  {aplicarSaldoAFavor && saldoAplicado > 0 && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="bg-white dark:bg-gray-900 p-3 rounded-lg border border-emerald-300 dark:border-emerald-700 space-y-2"
                    >
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600 dark:text-gray-400">Total factura:</span>
                        <span className="font-medium">{formatCurrency(totalFactura)}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-emerald-600 dark:text-emerald-400">Saldo aplicado:</span>
                        <span className="font-medium text-emerald-600 dark:text-emerald-400">-{formatCurrency(saldoAplicado)}</span>
                      </div>
                      <div className="flex justify-between text-sm pt-2 border-t">
                        <span className="font-semibold">Total a pagar:</span>
                        <span className="font-bold text-lg">{formatCurrency(totalConDescuento)}</span>
                      </div>
                    </motion.div>
                  )}
                </motion.div>
            )}

            {/* Comentarios */}
            <div className="space-y-3 p-4 rounded-xl border border-gray-200 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-900/50">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-gray-200 dark:bg-gray-800">
                  <FileText className="h-4 w-4 text-gray-600 dark:text-gray-400" />
                </div>
                <Label htmlFor="comentarios" className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                  Comentarios (opcional)
                </Label>
              </div>
              <Textarea
                id="comentarios"
                placeholder="Agregar notas o comentarios sobre esta factura..."
                value={formData.comentarios}
                onChange={(e) =>
                  setFormData({ ...formData, comentarios: e.target.value })
                }
                rows={3}
                className="resize-none bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-700"
              />
            </div>
          </div>

          <DialogFooter className="px-6 py-4 border-t bg-gradient-to-r from-gray-50 to-purple-50 dark:from-gray-900 dark:to-purple-950/30 flex-shrink-0">
            <div className="flex items-center gap-3 w-full justify-between">
              <div className="text-sm text-muted-foreground">
                {items.length > 0 && (
                  <span className="font-medium text-emerald-600 dark:text-emerald-400">
                    Total: {formatCurrency(totalCalculado)}
                  </span>
                )}
              </div>
              <div className="flex gap-3">
                <Button
                  htmlType="button"
                  type="outline"
                  onClick={() => onOpenChange(false)}
                  disabled={loading}
                  className="px-6"
                >
                  Cancelar
                </Button>
                <Button
                  htmlType="submit"
                  type="primary"
                  disabled={loading || (!formData.cliente_id)}
                  loading={loading}
                  className="px-6"
                >
                  <Receipt className="h-4 w-4 mr-2" />
                  {factura ? "Guardar Cambios" : "Crear Factura"}
                </Button>
              </div>
            </div>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
