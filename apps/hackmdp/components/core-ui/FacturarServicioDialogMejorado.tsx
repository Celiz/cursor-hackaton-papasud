"use client";

import React, { useState, useEffect, useRef } from "react";
import { formatCurrency } from "@/lib/format-currency";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, Info, DollarSign, Plus, Trash2, Package, Eye, Mail, Check, Send } from "lucide-react";
import { Servicio } from "@/lib/types";
import { ExpandableEmailButton } from "./ExpandableEmailButton";
import { toast } from "sonner";
import { Separator } from "@/components/ui/separator";
import { motion } from "framer-motion";
import { dialogClasses } from "@/lib/design-system";
import { cn } from "@/lib/utils";
import { ProductoCombobox } from "@/components/ui/producto-combobox";
import { useSession } from "@/lib/hooks/use-session";
import { generateIVRPDF, generateFacturaCompletaPDF } from "@/lib/pdf-generator";
import { IvrHistorialPanel } from "./IvrHistorialPanel";
import type { RenglonIvr } from "@/lib/ivr-renglones";

interface FacturarServicioDialogMejoradoProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  servicio: Servicio | null;
  onSuccess: () => void;
  /** Si viene, pre-carga items desde el presupuesto en vez del monto del servicio. */
  presupuestoId?: string | null;
  /** Tipo inicial del comprobante (IVR, A, B, C, E). Default IVR. */
  initialTipoFactura?: string;
}

interface ItemFactura {
  id: string;
  descripcion: string;
  cantidad: number | string; // string temporalmente mientras se edita con punto/coma
  precio_unitario: number | string; // string temporalmente mientras se edita con punto/coma
  producto_id?: string | null; // ID del producto si se selecciona uno
}

// Helper para convertir valor a número
const toNumber = (value: number | string): number => {
  if (typeof value === 'string') {
    const num = parseFloat(value.replace(',', '.'));
    return isNaN(num) ? 0 : num;
  }
  return value;
};

export function FacturarServicioDialogMejorado({
  open,
  onOpenChange,
  servicio,
  onSuccess,
  presupuestoId,
  initialTipoFactura = "IVR",
}: FacturarServicioDialogMejoradoProps) {
  const [loading, setLoading] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [numeroFactura, setNumeroFactura] = useState<string>("00001-00000001");
  const [loadingNumero, setLoadingNumero] = useState(false);
  const [createdFacturaId, setCreatedFacturaId] = useState<string | null>(null);
  const { data: session } = useSession();
  const orgId = session?.user?.orgId ?? '';
  const successRef = useRef<HTMLDivElement | null>(null);

  // Al crear el comprobante, traer la sección de éxito (email) a la vista —
  // queda al final de un form largo y antes había que scrollear a mano.
  useEffect(() => {
    if (createdFacturaId && successRef.current) {
      successRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [createdFacturaId]);

  // Calculate default vencimiento (30 days from today)
  const getDefaultVencimiento = () => {
    const date = new Date();
    date.setDate(date.getDate() + 30);
    return date.toISOString().split("T")[0];
  };

  const [formData, setFormData] = useState({
    fecha_emision: new Date().toISOString().split("T")[0],
    fecha_vencimiento: getDefaultVencimiento(),
    tipo_factura: initialTipoFactura,
    forma_pago: "Contado",
    observaciones: "",
  });

  // Sync initialTipoFactura when dialog opens
  useEffect(() => {
    if (open) {
      setFormData((prev) => ({ ...prev, tipo_factura: initialTipoFactura }));
    }
  }, [open, initialTipoFactura]);

  const FORMAS_PAGO = [
    "Contado",
    "5 días FPF",
    "10 días",
    "15 días FPF",
    "30 días FPF",
    "60 días FF",
    "Cuenta corriente",
    "Cuenta corriente 30 días",
    "Cuenta corriente 60 días",
    "Otra",
  ];

  const [items, setItems] = useState<ItemFactura[]>([]);

  // Fetch next invoice number when dialog opens or tipo_factura changes
  useEffect(() => {
    const fetchNextNumber = async () => {
      if (!open) return;

      setLoadingNumero(true);
      try {
        const res = await fetch(`/api/facturas/next-number?tipo=${formData.tipo_factura}`);
        if (res.ok) {
          const data = await res.json();
          setNumeroFactura(data.numero);
        } else {
          console.error('Error fetching invoice number');
        }
      } catch (error) {
        console.error('Error fetching invoice number:', error);
      } finally {
        setLoadingNumero(false);
      }
    };

    fetchNextNumber();
  }, [open, formData.tipo_factura]);

  // Initialize items when dialog opens.
  // Si hay presupuesto vinculado, copia los items del presupuesto (con sus precios).
  // Si no, crea un único item "mano de obra" con el precio del servicio.
  useEffect(() => {
    if (!open || !servicio || items.length > 0) return;

    let cancelled = false;

    const buildManoObra = (): ItemFactura => ({
      id: crypto.randomUUID(),
      descripcion: `Servicio técnico - ${servicio.equipo_id?.equipo_id?.marca || ''} ${servicio.equipo_id?.equipo_id?.modelo || ''}`,
      cantidad: 1,
      precio_unitario: Number(servicio.precio ?? (servicio as any).monto_servicio) || 0,
      producto_id: null,
    });

    const loadFromPresupuesto = async () => {
      if (!presupuestoId) {
        setItems([buildManoObra()]);
        return;
      }
      try {
        const res = await fetch(`/api/presupuestos?id=${presupuestoId}`);
        if (!res.ok) throw new Error('No se pudo cargar el presupuesto');
        const pres = await res.json();
        const rawItems: any[] = Array.isArray(pres?.presupuestos_items)
          ? pres.presupuestos_items
          : [];
        if (cancelled) return;
        if (rawItems.length === 0) {
          setItems([buildManoObra()]);
          return;
        }
        setItems(
          rawItems.map((pi) => ({
            id: crypto.randomUUID(),
            descripcion: pi.descripcion || pi.producto_nombre || 'Item',
            cantidad: Number(pi.cantidad) || 1,
            precio_unitario: Number(pi.precio_unitario) || 0,
            producto_id: pi.producto_id || null,
          }))
        );
      } catch (err) {
        console.error('Error cargando presupuesto para prefill:', err);
        if (!cancelled) setItems([buildManoObra()]);
      }
    };

    loadFromPresupuesto();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, servicio, presupuestoId]);

  // Reset form when dialog closes
  useEffect(() => {
    if (!open) {
      setItems([]);
      setFormData({
        fecha_emision: new Date().toISOString().split("T")[0],
        fecha_vencimiento: getDefaultVencimiento(),
        tipo_factura: initialTipoFactura,
        forma_pago: "Contado",
        observaciones: "",
      });
      setNumeroFactura("00001-00000001");
      setShowPreview(false);
      setCreatedFacturaId(null);
    }
  }, [open, initialTipoFactura]);

  // Saldos a favor del cliente: saldo_a_favor (facturas A/B/C) y
  // saldo_a_favor_ivr (IVR). Se muestra el que corresponde según el tipo.
  const [clienteSaldos, setClienteSaldos] = useState<
    { saldo_a_favor: number; saldo_a_favor_ivr: number } | null
  >(null);

  useEffect(() => {
    const cid =
      typeof servicio?.cliente_id === 'string'
        ? servicio.cliente_id
        : (servicio?.cliente_id as any)?.id;
    if (!open || !cid) {
      setClienteSaldos(null);
      return;
    }
    fetch(`/api/clientes/${cid}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((c) => {
        if (c) {
          setClienteSaldos({
            saldo_a_favor: Number(c.saldo_a_favor) || 0,
            saldo_a_favor_ivr: Number(c.saldo_a_favor_ivr) || 0,
          });
        }
      })
      .catch(() => setClienteSaldos(null));
  }, [open, servicio]);

  if (!servicio) return null;

  const agregarItem = () => {
    const nuevoItem: ItemFactura = {
      id: crypto.randomUUID(),
      descripcion: "",
      cantidad: 1,
      precio_unitario: 0,
      producto_id: null,
    };
    setItems([...items, nuevoItem]);
  };

  // Panel lateral: copiar todos los renglones de un IVR anterior.
  const handleCopiarTodoDelPanel = (renglones: RenglonIvr[]) => {
    const nuevos: ItemFactura[] = renglones.map((r) => ({
      id: crypto.randomUUID(),
      descripcion: r.descripcion,
      cantidad: r.cantidad,
      precio_unitario: r.precio_unitario,
      producto_id: r.producto_id ?? null,
    }));
    if (items.length > 0) {
      const ok = window.confirm(
        "Ya hay items en esta factura. ¿Reemplazarlos por los del IVR anterior?"
      );
      if (!ok) return;
    }
    setItems(nuevos);
    toast.success(`${nuevos.length} items copiados`);
  };

  // Panel lateral: sumar un renglón suelto.
  const handleAgregarItemDelPanel = (r: RenglonIvr) => {
    setItems((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        descripcion: r.descripcion,
        cantidad: r.cantidad,
        precio_unitario: r.precio_unitario,
        producto_id: r.producto_id ?? null,
      },
    ]);
  };

  const eliminarItem = (id: string) => {
    if (items.length <= 1) {
      toast.error("Debe haber al menos un item en la factura");
      return;
    }
    setItems(items.filter((item) => item.id !== id));
  };

  const actualizarItem = (id: string, campo: keyof ItemFactura, valor: any) => {
    setItems(
      items.map((item) =>
        item.id === id ? { ...item, [campo]: valor } : item
      )
    );
  };

  // Calcular totales
  const subtotal = items.reduce(
    (acc, item) => acc + toNumber(item.cantidad) * toNumber(item.precio_unitario),
    0
  );

  // IVR no tiene IVA
  const aplicarIva = formData.tipo_factura !== "IVR";
  const iva = aplicarIva ? subtotal * 0.21 : 0;
  const total = subtotal + iva;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validar que todos los items tengan descripción
    const itemsInvalidos = items.filter(item => !item.descripcion.trim());
    if (itemsInvalidos.length > 0) {
      toast.error("Todos los items deben tener una descripción");
      return;
    }

    setLoading(true);

    try {
      // 1. Crear la factura
      const resFactura = await fetch('/api/facturas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cliente_id: servicio.cliente_id?.id || servicio.cliente_id,
          fecha_emision: formData.fecha_emision,
          fecha_vencimiento: formData.fecha_vencimiento,
          total: total,
          subtotal: subtotal,
          iva: iva,
          estado: 'pendiente',
          tipo_factura: formData.tipo_factura,
          nro_factura: numeroFactura,
          forma_pago: formData.forma_pago,
          comentarios: [
            {
              texto: `Factura generada desde servicio #${servicio.id?.slice(0, 8)}`,
              fecha: new Date().toISOString(),
            },
            ...(formData.observaciones.trim()
              ? [{ texto: formData.observaciones.trim(), fecha: new Date().toISOString() }]
              : []),
          ],
        }),
      });

      if (!resFactura.ok) {
        const data = await resFactura.json();
        throw new Error(data.error || 'Error al crear factura');
      }

      const factura = await resFactura.json();

      // 2. Crear todos los items de la factura
      for (const item of items) {
        const cantidad = toNumber(item.cantidad);
        const precioUnitario = toNumber(item.precio_unitario);
        const itemSubtotal = cantidad * precioUnitario;

        const resItem = await fetch('/api/facturas-items', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            factura_id: factura.id,
            servicio_id: servicio.id,
            producto_id: item.producto_id || null,
            descripcion: item.descripcion,
            cantidad: cantidad,
            precio_unitario: precioUnitario,
            subtotal: itemSubtotal,
          }),
        });

        if (!resItem.ok) {
          throw new Error('Error al crear items de factura');
        }
      }

      // 3. Actualizar el servicio como facturado
      const resServicio = await fetch(`/api/servicios/${servicio.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          facturado: true,
          factura_link: factura.id,
          estado_contable: 'Facturado',
        }),
      });

      if (!resServicio.ok) {
        console.error('Error al actualizar servicio, pero factura creada');
      }

      toast.success(formData.tipo_factura === 'IVR' ? 'IVR creado exitosamente' : 'Factura creada exitosamente');
      setCreatedFacturaId(factura.id);
      onSuccess();
    } catch (error: any) {
      toast.error(error.message || 'Error al facturar servicio');
    } finally {
      setLoading(false);
    }
  };

  const clienteNombre = servicio.cliente_id?.nombre_fantasia || servicio.cliente_id?.nombre || 'Cliente no especificado';

  const clienteIdPanel: string | null =
    (typeof servicio.cliente_id === 'string'
      ? servicio.cliente_id
      : (servicio.cliente_id as any)?.id) || null;

  const clienteEmails: string[] = React.useMemo(() => {
    const clienteData = servicio.cliente_id as any;
    const email = clienteData?.email || clienteData?.datos_contacto?.email;
    if (!email) return [];
    if (Array.isArray(email)) return email.filter(Boolean);
    if (typeof email === 'string') {
      const emailRegex = /[^\s@]+@[^\s@]+\.[^\s@]+/g;
      return email.match(emailRegex) || [];
    }
    return [];
  }, [servicio.cliente_id]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={cn(dialogClasses.content, `${showPreview ? 'sm:max-w-[95vw]' : 'sm:max-w-[1000px]'} max-h-[90vh] overflow-y-auto pb-10`)}>
        <DialogHeader className={cn(dialogClasses.header, "pr-10")}>
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle className={dialogClasses.title}>Facturar Servicio</DialogTitle>
              <DialogDescription className={dialogClasses.description}>
                Genera una factura personalizada con items editables
              </DialogDescription>
            </div>
            <button
              type="button"
              onClick={() => setShowPreview(!showPreview)}
              className="h-8 px-3 inline-flex items-center gap-1.5 text-xs font-medium border border-purple-300 dark:border-purple-700 text-purple-700 dark:text-purple-300 hover:bg-purple-50 dark:hover:bg-purple-900/20 rounded-lg transition-colors"
            >
              <Eye className="h-3.5 w-3.5" />
              <span>{showPreview ? "Ocultar" : "Vista Previa"}</span>
            </button>
          </div>
        </DialogHeader>

        <div className={`${showPreview ? 'grid grid-cols-2 gap-6' : 'flex min-h-0 gap-0'}`}>
          <motion.form
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2 }}
            onSubmit={handleSubmit}
            className="space-y-6 flex-1 min-w-0"
          >
          {/* Info del servicio */}
          <div className="border border-purple-200 dark:border-purple-800/50 rounded-lg p-4 bg-purple-50/50 dark:bg-purple-950/20">
            <div className="flex items-center gap-2">
              <Info className="h-4 w-4 text-purple-600 dark:text-purple-400 flex-shrink-0" />
              <span className="text-sm font-medium text-gray-900 dark:text-gray-100">Información del Servicio</span>
            </div>
            <div className="text-sm space-y-1 pl-6 mt-2">
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">Cliente:</span>
                <span className="font-medium text-gray-900 dark:text-gray-100">{clienteNombre}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">Servicio:</span>
                <span className="font-mono text-xs text-gray-900 dark:text-gray-100">#{servicio.id?.slice(0, 8)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">Equipo:</span>
                <span className="text-gray-900 dark:text-gray-100">{servicio.equipo_id?.equipo_id?.marca || ''} {servicio.equipo_id?.equipo_id?.modelo || ''}</span>
              </div>
              {(() => {
                const esIvr = formData.tipo_factura === 'IVR';
                const saldo = esIvr
                  ? (clienteSaldos?.saldo_a_favor_ivr ?? 0)
                  : (clienteSaldos?.saldo_a_favor ?? 0);
                return (
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">
                      Saldo a favor {esIvr ? '(IVR)' : '(facturas)'}:
                    </span>
                    <span className={cn(
                      "font-medium",
                      saldo > 0
                        ? "text-blue-600 dark:text-blue-400"
                        : "text-gray-900 dark:text-gray-100"
                    )}>
                      {formatCurrency(saldo)}
                    </span>
                  </div>
                );
              })()}
            </div>
          </div>

          {/* Fechas y tipo */}
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="fecha_emision" className="text-sm font-medium">Fecha de Emisión *</Label>
              <Input
                id="fecha_emision"
                type="date"
                value={formData.fecha_emision}
                onChange={(e) =>
                  setFormData({ ...formData, fecha_emision: e.target.value })
                }
                required
                className="h-9 text-sm"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="fecha_vencimiento" className="text-sm font-medium">Vencimiento *</Label>
              <Input
                id="fecha_vencimiento"
                type="date"
                value={formData.fecha_vencimiento}
                onChange={(e) =>
                  setFormData({ ...formData, fecha_vencimiento: e.target.value })
                }
                required
                min={formData.fecha_emision}
                className="h-9 text-sm"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="tipo_factura" className="text-sm font-medium">Tipo de Factura *</Label>
              <Select
                value={formData.tipo_factura}
                onValueChange={(value) =>
                  setFormData({ ...formData, tipo_factura: value })
                }
              >
                <SelectTrigger className="h-9 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="IVR" className="text-sm">IVR (sin IVA)</SelectItem>
                  <SelectItem value="A" className="text-sm">A (con IVA)</SelectItem>
                  <SelectItem value="B" className="text-sm">B (con IVA)</SelectItem>
                  <SelectItem value="C" className="text-sm">C (sin IVA)</SelectItem>
                  <SelectItem value="E" className="text-sm">E (exportación)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="forma_pago" className="text-sm font-medium">Forma de Pago *</Label>
              <Select
                value={formData.forma_pago}
                onValueChange={(value) => setFormData({ ...formData, forma_pago: value })}
              >
                <SelectTrigger className="h-9 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {FORMAS_PAGO.map((fp) => (
                    <SelectItem key={fp} value={fp} className="text-sm">{fp}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="observaciones" className="text-sm font-medium">Observaciones</Label>
              <Input
                id="observaciones"
                type="text"
                value={formData.observaciones}
                onChange={(e) => setFormData({ ...formData, observaciones: e.target.value })}
                placeholder="Notas adicionales (opcional)"
                className="h-9 text-sm"
              />
            </div>
          </div>

          <Separator />

          {/* Items de la factura */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Package className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                <Label className="text-sm font-semibold text-gray-900 dark:text-gray-100">Items de la Factura</Label>
              </div>
              <button
                type="button"
                onClick={agregarItem}
                className="h-8 px-3 inline-flex items-center gap-1.5 text-xs font-medium bg-purple-600 hover:bg-purple-700 text-white rounded-lg shadow-sm shadow-purple-500/25 transition-colors"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>Nuevo Item</span>
              </button>
            </div>

            <div className="space-y-3">
              {items.map((item, index) => {
                return (
                <div key={item.id} className="bg-purple-50/70 dark:bg-purple-950/20 p-4 rounded-xl space-y-3 border border-purple-200/60 dark:border-purple-800/40 shadow-sm">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-purple-900 dark:text-purple-100">
                      Item #{index + 1}
                    </span>
                    {items.length > 1 && (
                      <button
                        type="button"
                        onClick={() => eliminarItem(item.id)}
                        className="h-7 w-7 flex items-center justify-center rounded-md text-red-600 hover:text-red-700 hover:bg-red-100 dark:hover:bg-red-950/30 transition-colors"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor={`descripcion-${item.id}`}>Descripción *</Label>
                    <ProductoCombobox
                      value={item.descripcion}
                      productoId={item.producto_id}
                      onSelect={(producto, descripcion) => {
                        if (producto) {
                          // Producto seleccionado - actualizar descripción, precio y producto_id
                          setItems(items.map(i =>
                            i.id === item.id
                              ? {
                                  ...i,
                                  descripcion,
                                  precio_unitario: producto.precio_venta,
                                  producto_id: producto.id
                                }
                              : i
                          ));
                          toast.success(`Producto "${producto.nombre}" agregado`);
                        } else {
                          // Solo texto - actualizar descripción
                          actualizarItem(item.id, "descripcion", descripcion);
                          if (item.producto_id) {
                            actualizarItem(item.id, "producto_id", null);
                          }
                        }
                      }}
                      placeholder="Buscar producto o escribir descripción..."
                    />
                  </div>

                  <div className="grid grid-cols-3 gap-3">
                    <div className="space-y-2">
                      <Label htmlFor={`cantidad-${item.id}`}>Cantidad *</Label>
                      <Input
                        id={`cantidad-${item.id}`}
                        type="text"
                        inputMode="decimal"
                        value={item.cantidad === 0 ? "" : String(item.cantidad)}
                        onChange={(e) => {
                          const inputValue = e.target.value;

                          // Permitir vacío para poder borrar
                          if (inputValue === "") {
                            actualizarItem(item.id, "cantidad", 0);
                            return;
                          }

                          // Permitir solo números, punto/coma y hasta 2 decimales
                          const regex = /^\d*[.,]?\d{0,2}$/;
                          if (regex.test(inputValue)) {
                            // Si termina en punto o coma, guardar temporalmente el string
                            if (inputValue.endsWith('.') || inputValue.endsWith(',')) {
                              // Permitir escribir el punto/coma sin convertir aún
                              actualizarItem(item.id, "cantidad", inputValue);
                            } else {
                              // Convertir a número para guardarlo
                              const value = inputValue.replace(",", ".");
                              const numValue = parseFloat(value);
                              if (!isNaN(numValue) && numValue >= 0) {
                                actualizarItem(item.id, "cantidad", numValue);
                              }
                            }
                          }
                        }}
                        onBlur={(e) => {
                          // Al salir del campo, asegurar que sea un número válido
                          let value = String(e.target.value).replace(",", ".");
                          const numValue = parseFloat(value);
                          if (value === "" || isNaN(numValue) || numValue === 0) {
                            actualizarItem(item.id, "cantidad", 1);
                          } else {
                            // Guardar como número limpio
                            actualizarItem(item.id, "cantidad", numValue);
                          }
                        }}
                        placeholder="1.00"
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor={`precio-${item.id}`}>Precio Unit. *</Label>
                      <Input
                        id={`precio-${item.id}`}
                        type="text"
                        inputMode="decimal"
                        value={item.precio_unitario === 0 ? "" : String(item.precio_unitario)}
                        onChange={(e) => {
                          const inputValue = e.target.value;

                          // Permitir vacío para poder borrar
                          if (inputValue === "") {
                            actualizarItem(item.id, "precio_unitario", 0);
                            return;
                          }

                          // Permitir solo números, punto/coma y hasta 2 decimales
                          const regex = /^\d*[.,]?\d{0,2}$/;
                          if (regex.test(inputValue)) {
                            // Si termina en punto o coma, guardar temporalmente el string
                            if (inputValue.endsWith('.') || inputValue.endsWith(',')) {
                              // Permitir escribir el punto/coma sin convertir aún
                              actualizarItem(item.id, "precio_unitario", inputValue);
                            } else {
                              // Convertir a número para guardarlo
                              const value = inputValue.replace(",", ".");
                              const numValue = parseFloat(value);
                              if (!isNaN(numValue) && numValue >= 0) {
                                actualizarItem(item.id, "precio_unitario", numValue);
                              }
                            }
                          }
                        }}
                        onBlur={(e) => {
                          // Al salir del campo, formatear a 2 decimales
                          let value = String(e.target.value).replace(",", ".");
                          const numValue = parseFloat(value);
                          if (value === "" || isNaN(numValue)) {
                            actualizarItem(item.id, "precio_unitario", 0);
                          } else {
                            // Guardar formateado a 2 decimales
                            actualizarItem(item.id, "precio_unitario", parseFloat(numValue.toFixed(2)));
                          }
                        }}
                        placeholder="0.00"
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Subtotal</Label>
                      <div className="h-10 px-3 py-2 bg-muted rounded-md flex items-center font-semibold text-sm">
                        {formatCurrency(toNumber(item.cantidad) * toNumber(item.precio_unitario))}
                      </div>
                    </div>
                  </div>
                </div>
                );
              })}
            </div>
          </div>

          <Separator />

          {/* Totales */}
          <div className="border border-purple-200 dark:border-purple-700 rounded-lg p-3 bg-gradient-to-br from-purple-50/50 to-purple-100/50 dark:from-purple-950/30 dark:to-purple-900/30">
            <div className="flex items-center gap-2 mb-2">
              <DollarSign className="h-4 w-4 text-purple-600 dark:text-purple-400 flex-shrink-0" />
              <span className="text-sm font-medium text-gray-900 dark:text-gray-100">Resumen de Factura</span>
            </div>
            <div className="space-y-1 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">Subtotal:</span>
                <span className="font-semibold text-gray-900 dark:text-gray-100">{formatCurrency(subtotal)}</span>
              </div>
              {aplicarIva ? (
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">IVA (21%):</span>
                  <span className="font-medium text-gray-900 dark:text-gray-100">{formatCurrency(iva)}</span>
                </div>
              ) : (
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400 text-xs italic">
                    {formData.tipo_factura} no lleva IVA
                  </span>
                </div>
              )}
              <Separator className="my-2" />
              <div className="flex justify-between text-base pt-1">
                <span className="font-bold text-gray-900 dark:text-gray-100">Total:</span>
                <span className="font-bold text-emerald-600 dark:text-emerald-400 text-lg">{formatCurrency(total)}</span>
              </div>
            </div>
          </div>

          {createdFacturaId ? (
            <div ref={successRef} className="pt-4 border-t border-gray-200 dark:border-gray-700 space-y-3">
              <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-400">
                <Check className="h-5 w-5" />
                <span className="font-medium text-sm">
                  {formData.tipo_factura === 'IVR' ? 'IVR creado' : 'Factura creada'} correctamente
                </span>
              </div>
              <div className="flex items-center gap-2">
                <ExpandableEmailButton
                  emails={clienteEmails}
                  onSendEmail={async (email) => {
                    // Capturar los valores antes de cerrar (el reset on-close
                    // del dialog los limpia).
                    const facturaId = createdFacturaId;
                    const tipo = formData.tipo_factura;
                    const numero = numeroFactura;
                    const nombre = clienteNombre;
                    const org = orgId;
                    // Cerrar el modal ya — el envío sigue en background con el
                    // toast, así se puede seguir trabajando.
                    onOpenChange(false);
                    void (async () => {
                      const toastId = toast.loading(`Enviando a ${email}...`);
                      try {
                        // Adjuntar el PDF del comprobante (IVR/Factura), no el
                        // de la orden de servicio.
                        const facturaRes = await fetch(`/api/facturas/${facturaId}`);
                        if (!facturaRes.ok) throw new Error('Error al cargar el comprobante');
                        const facturaCompleta = await facturaRes.json();
                        const doc = tipo === 'IVR'
                          ? await generateIVRPDF(facturaCompleta, org)
                          : await generateFacturaCompletaPDF(facturaCompleta, org);
                        const blob = doc.output('blob');
                        const arrayBuffer = await blob.arrayBuffer();
                        const pdfBase64 = btoa(
                          new Uint8Array(arrayBuffer).reduce((data, byte) => data + String.fromCharCode(byte), '')
                        );
                        const res = await fetch('/api/org-email/send', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({
                            to: [email],
                            subject: `${tipo === 'IVR' ? 'IVR' : 'Factura'} ${numero} - ${nombre}`,
                            body: `Estimado/a ${nombre},\n\nAdjunto encontrará el comprobante correspondiente.\n\nSaludos cordiales.`,
                            attachmentBase64: pdfBase64,
                            attachmentName: `${tipo.toLowerCase()}-${numero}.pdf`,
                          }),
                        });
                        if (!res.ok) {
                          const data = await res.json();
                          throw new Error(data.error || 'Error al enviar');
                        }
                        toast.success(`Enviado a ${email}`, { id: toastId });
                      } catch (e: any) {
                        toast.error(e.message || 'Error al enviar email', { id: toastId });
                      }
                    })();
                  }}
                  label="Enviar por email"
                  alwaysExpand
                  className="flex-1"
                />
                <button
                  type="button"
                  onClick={() => onOpenChange(false)}
                  className="px-4 py-2 h-9 rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 font-medium text-sm hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                >
                  Cerrar
                </button>
              </div>
            </div>
          ) : (
          <DialogFooter className={cn(dialogClasses.footer, "gap-3 pt-4 border-t border-gray-200 dark:border-gray-700")}>
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              disabled={loading}
              className="px-4 py-2 h-9 rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 font-medium text-sm hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={(e) => {
                const form = e.currentTarget.closest('form');
                if (form) {
                  form.requestSubmit();
                }
              }}
              disabled={loading}
              className="px-5 py-2 h-9 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-medium text-sm shadow-md shadow-emerald-500/25 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
            >
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              {loading ? "Generando..." : formData.tipo_factura === 'IVR' ? "Crear IVR" : "Crear Factura"}
            </button>
          </DialogFooter>
          )}
        </motion.form>

        {/* Panel lateral: IVRs anteriores del cliente (solo en modo edición) */}
        {!showPreview && (
          <IvrHistorialPanel
            clienteId={clienteIdPanel}
            onCopiarTodo={handleCopiarTodoDelPanel}
            onAgregarItem={handleAgregarItemDelPanel}
            className="hidden lg:flex lg:flex-col w-80 shrink-0 border-l bg-muted/10 min-h-0 max-h-[80vh] overflow-hidden sticky top-0 self-start"
          />
        )}

        {/* Vista Previa */}
        {showPreview && (
          <div className="bg-gray-100 dark:bg-gray-900 border-2 border-rose-400 dark:border-rose-800 rounded-lg p-6 shadow-inner overflow-y-auto max-h-[70vh]">
            <div className="max-w-3xl mx-auto bg-white p-10 shadow-2xl rounded-lg" style={{ fontFamily: 'system-ui, -apple-system, sans-serif' }}>
              {/* Header con Logo y Info Empresa */}
              <div className="flex justify-between items-start mb-8">
                <div className="flex-1">
                  <div className="w-32 h-32 mb-3 flex items-center justify-center">
                    <img
                      src="/org-logos/uno.png"
                      alt="Uno Electromedicina"
                      className="w-full h-full object-contain"
                    />
                  </div>
                  <h2 className="text-gray-800 font-bold text-lg">Uno Electromedicina</h2>
                  <p className="text-gray-600 text-sm">CUIT: 20-20490460-0</p>
                  <p className="text-gray-600 text-sm">Chaco 801, Mar del Plata</p>
                </div>
                <div className="text-right flex-1">
                  <h1 className="text-4xl font-bold text-rose-800 mb-2">FACTURA {formData.tipo_factura}</h1>
                  <div className="text-sm text-gray-700 space-y-1">
                    <p><span className="font-semibold">N°:</span> {loadingNumero ? 'Generando...' : numeroFactura}</p>
                    <p><span className="font-semibold">Fecha:</span> {new Date(formData.fecha_emision).toLocaleDateString('es-AR')}</p>
                    <p><span className="font-semibold">Vencimiento:</span> {new Date(formData.fecha_vencimiento).toLocaleDateString('es-AR')}</p>
                    <p><span className="font-semibold">Forma de pago:</span> {formData.forma_pago}</p>
                  </div>
                </div>
              </div>

              <div className="border-t-2 border-rose-700 mb-6"></div>

              {/* Información del Cliente */}
              <div className="bg-red-80 rounded-lg p-5 mb-6">
                <h3 className="text-sm font-bold text-rose-900 uppercase mb-3 tracking-wide">Información del Cliente</h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-gray-600 font-medium">Razón Social</p>
                    <p className="text-gray-900 font-semibold text-base">{clienteNombre}</p>
                  </div>
                  <div>
                    <p className="text-gray-600 font-medium">Servicio Técnico</p>
                    <p className="text-gray-900 font-mono text-sm">#{servicio.id?.slice(0, 8)}</p>
                  </div>
                  <div className="col-span-2">
                    <p className="text-gray-600 font-medium">Equipo</p>
                    <p className="text-gray-900">
                      {servicio.equipo_id?.equipo_id?.marca} {servicio.equipo_id?.equipo_id?.modelo}
                      {servicio.equipo_id?.numero_serie && ` - S/N: ${servicio.equipo_id.numero_serie}`}
                    </p>
                  </div>
                </div>
              </div>

              {/* Tabla de Items */}
              <div className="mb-6">
                <table className="w-full text-sm border-collapse">
                  <thead>
                    <tr className="bg-gradient-to-r from-red-700 to-red-800 text-white">
                      <th className="py-3 px-4 text-left font-semibold">#</th>
                      <th className="py-3 px-4 text-left font-semibold">Descripción</th>
                      <th className="py-3 px-4 text-center font-semibold">Cantidad</th>
                      <th className="py-3 px-4 text-right font-semibold">Precio Unit.</th>
                      <th className="py-3 px-4 text-right font-semibold">Subtotal</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((item, index) => (
                      <tr key={item.id} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                        <td className="py-3 px-4 text-gray-600 border-b border-gray-200">{index + 1}</td>
                        <td className="py-3 px-4 text-gray-900 border-b border-gray-200">
                          {item.descripcion || "Sin descripción"}
                        </td>
                        <td className="py-3 px-4 text-center text-gray-900 border-b border-gray-200">
                          {toNumber(item.cantidad)}
                        </td>
                        <td className="py-3 px-4 text-right text-gray-900 border-b border-gray-200">
                          {formatCurrency(toNumber(item.precio_unitario))}
                        </td>
                        <td className="py-3 px-4 text-right font-semibold text-gray-900 border-b border-gray-200">
                          {formatCurrency(toNumber(item.cantidad) * toNumber(item.precio_unitario))}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Totales */}
              <div className="flex justify-end mb-6">
                <div className="w-80">
                  <div className="bg-red-80 rounded-lg p-5 space-y-2">
                    <div className="flex justify-between text-base">
                      <span className="text-gray-700 font-medium">Subtotal:</span>
                      <span className="font-semibold text-gray-900">{formatCurrency(subtotal)}</span>
                    </div>
                    {aplicarIva ? (
                      <div className="flex justify-between text-base">
                        <span className="text-gray-700 font-medium">IVA (21%):</span>
                        <span className="font-semibold text-gray-900">{formatCurrency(iva)}</span>
                      </div>
                    ) : (
                      <div className="flex justify-between">
                        <span className="text-gray-600 text-sm italic">
                          {formData.tipo_factura} - Sin IVA
                        </span>
                      </div>
                    )}
                    <div className="border-t-2 border-rose-700 pt-3 mt-2">
                      <div className="flex justify-between">
                        <span className="text-2xl font-bold text-rose-800">TOTAL:</span>
                        <span className="text-2xl font-bold text-rose-800">{formatCurrency(total)}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {formData.observaciones.trim() && (
                <div className="mb-6 border border-gray-200 rounded-lg p-4 bg-gray-50">
                  <p className="text-xs font-semibold text-gray-600 uppercase mb-1">Observaciones</p>
                  <p className="text-sm text-gray-800 whitespace-pre-wrap">{formData.observaciones}</p>
                </div>
              )}

              {/* Advertencia IVR */}
              {formData.tipo_factura === "IVR" && (
                <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-6">
                  <div className="flex items-start">
                    <div className="flex-shrink-0">
                      <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <div className="ml-3">
                      <h3 className="text-sm font-semibold text-yellow-800">Importante - Factura IVR</h3>
                      <div className="mt-2 text-sm text-yellow-700">
                        <ul className="list-disc pl-5 space-y-1">
                          <li>Esta factura es válida únicamente por <strong>15 días</strong> desde la fecha de emisión.</li>
                          <li>El pago debe realizarse en <strong>efectivo</strong> o mediante transferencia bancaria.</li>
                          <li>No se aceptan pagos con tarjeta de crédito o débito para facturas tipo IVR.</li>
                          <li>Pasado el plazo de validez, se deberá solicitar una nueva factura.</li>
                        </ul>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Footer Legal */}
              <div className="border-t-2 border-gray-300 pt-6 mt-8">
                <div className="text-center space-y-2">
                  <p className="text-xs text-gray-600 font-medium">
                    Uno Electromedicina - Dirección Fiscal: Chaco 801, Mar del Plata, Buenos Aires, Argentina
                  </p>
                  <p className="text-xs text-gray-600">
                    CUIT: 20-20490460-0 | IVA Responsable Inscripto
                  </p>
                  <p className="text-xs text-gray-600">
                    Email: contacto@papasud.com.ar
                  </p>
                  <div className="pt-4">
                    <p className="text-xs text-gray-500 italic">
                      Este es un documento preliminar. La factura oficial será generada al confirmar la operación.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
