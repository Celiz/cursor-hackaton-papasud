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
import { DollarSign, Building2, Plus, X, Check, AlertTriangle, Wallet, Pencil, RotateCcw } from "lucide-react";
import { ProductoSearchPanel, ProductoResult } from "./ProductoSearchPanel";

// Normaliza lo tipeado a `IVR-NNNNNN` (acepta dígitos sueltos o con prefijo).
// Espejo client-side de normalizeIvrNumber en lib/ivr.ts (server-only por pg).
function normalizeIvrNumber(raw: string): string | null {
  const digits = (raw || "").replace(/[^0-9]/g, "");
  if (!digits) return null;
  const n = parseInt(digits, 10);
  if (!Number.isFinite(n) || n <= 0) return null;
  return `IVR-${String(n).padStart(6, "0")}`;
}
import { Checkbox } from "@/components/ui/checkbox";
import { Factura, Cliente } from "@/lib/types";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { ExpandableEmailButton } from "./ExpandableEmailButton";
import { IvrHistorialPanel } from "./IvrHistorialPanel";
import type { RenglonIvr } from "@/lib/ivr-renglones";

interface IvrFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  ivr?: Factura | null;
  defaultClienteId?: string;
  onSuccess: () => void;
}

interface IvrItem {
  id: string;
  producto_id?: string;
  codigo?: string;
  descripcion: string;
  cantidad: number;
  precio_unitario: number;
  subtotal: number;
}

export function IvrFormDialog({
  open,
  onOpenChange,
  ivr,
  defaultClienteId,
  onSuccess,
}: IvrFormDialogProps) {
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState<IvrItem[]>([]);
  const [clienteSeleccionado, setClienteSeleccionado] = useState<Cliente | null>(null);

  // N° de IVR: próximo correlativo (preview) + override manual opcional.
  const [nextNumber, setNextNumber] = useState<string | null>(null);
  const [loadingNextNumber, setLoadingNextNumber] = useState(false);
  const [numeroManual, setNumeroManual] = useState(false);
  const [numeroOverride, setNumeroOverride] = useState("");
  // IVR recién creado: dispara la vista de éxito con opción de enviar por email.
  const [createdIvr, setCreatedIvr] = useState<{ id: string; nro_factura?: string } | null>(null);

  const [formData, setFormData] = useState({
    cliente_id: "",
    fecha_emision: new Date().toISOString().split("T")[0],
    total: "",
    estado: "pendiente" as "pendiente" | "pagada",
    comentarios: "",
  });
  const [aplicarSaldoFavor, setAplicarSaldoFavor] = useState(false);

  // Cargar información del cliente cuando se selecciona
  useEffect(() => {
    if (!formData.cliente_id) {
      setClienteSeleccionado(null);
      return;
    }

    fetch(`/api/clientes/${formData.cliente_id}`)
      .then(res => res.json())
      .then(data => {
        if (!data.error) {
          setClienteSeleccionado(data);
        }
      })
      .catch(() => setClienteSeleccionado(null));
  }, [formData.cliente_id]);

  // Saldo a favor del cliente — para IVR se usa saldo_a_favor_ivr
  // (el saldo_a_favor general es de facturas A/B/C).
  const saldoFavorCliente = useMemo(() => {
    return clienteSeleccionado?.saldo_a_favor_ivr || 0;
  }, [clienteSeleccionado]);

  // Reset aplicar saldo cuando cambia el cliente
  useEffect(() => {
    setAplicarSaldoFavor(false);
  }, [formData.cliente_id]);

  // Calcular totales desde los items
  const totalCalculado = useMemo(() => {
    return items.reduce((sum, item) => sum + item.subtotal, 0);
  }, [items]);

  // Total del remito (desde items o input manual)
  const totalIvr = items.length > 0 ? totalCalculado : (parseFloat(formData.total) || 0);

  // Override del N° de IVR: normalizado + validez de formato.
  const numeroOverrideNormalizado = useMemo(
    () => (numeroManual ? normalizeIvrNumber(numeroOverride) : null),
    [numeroManual, numeroOverride]
  );
  const numeroOverrideInvalido = numeroManual && numeroOverride.trim().length > 0 && !numeroOverrideNormalizado;

  // Calcular cuánto saldo a favor se puede aplicar (máximo el total del IVR)
  const saldoAplicable = useMemo(() => {
    if (!aplicarSaldoFavor || saldoFavorCliente <= 0) return 0;
    return Math.min(saldoFavorCliente, totalIvr);
  }, [aplicarSaldoFavor, saldoFavorCliente, totalIvr]);

  // Saldo pendiente después de aplicar el saldo a favor
  const saldoPendienteNuevo = useMemo(() => {
    return Math.max(0, totalIvr - saldoAplicable);
  }, [totalIvr, saldoAplicable]);

  // Cargar el próximo número correlativo al abrir un IVR nuevo (preview).
  useEffect(() => {
    if (!open || ivr) {
      setNextNumber(null);
      return;
    }
    setLoadingNextNumber(true);
    fetch("/api/ivr/next-number")
      .then((res) => res.json())
      .then((data) => setNextNumber(data?.next ?? null))
      .catch(() => setNextNumber(null))
      .finally(() => setLoadingNextNumber(false));
  }, [open, ivr]);

  useEffect(() => {
    setItems([]);
    setAplicarSaldoFavor(false);
    setCreatedIvr(null);
    setNumeroManual(false);
    setNumeroOverride("");
    if (ivr) {
      setFormData({
        cliente_id: ivr.cliente_id || "",
        fecha_emision: ivr.fecha_emision || new Date().toISOString().split("T")[0],
        total: ivr.total?.toString() || "",
        estado: (ivr.estado as "pendiente" | "pagada") || "pendiente",
        comentarios: "",
      });
    } else {
      setFormData({
        cliente_id: defaultClienteId || "",
        fecha_emision: new Date().toISOString().split("T")[0],
        total: "",
        estado: "pendiente",
        comentarios: "",
      });
    }
  }, [ivr, open, defaultClienteId]);

  // Agregar item desde producto (o sumar cantidad si ya está)
  const handleAddProducto = (producto: ProductoResult) => {
    setItems(prev => {
      const idx = prev.findIndex(
        (i) => i.producto_id != null && String(i.producto_id) === String(producto.id)
      );
      if (idx >= 0) {
        return prev.map((item, i) => {
          if (i !== idx) return item;
          const cantidad = (item.cantidad || 1) + 1;
          return { ...item, cantidad, subtotal: cantidad * item.precio_unitario };
        });
      }
      const precio = Number(producto.precio_venta ?? 0);
      return [
        ...prev,
        {
          id: crypto.randomUUID(),
          producto_id: String(producto.id),
          codigo: producto.codigo,
          descripcion: producto.nombre,
          cantidad: 1,
          precio_unitario: precio,
          subtotal: precio,
        },
      ];
    });
  };

  // Agregar item manual
  const handleAddItemManual = () => {
    const newItem: IvrItem = {
      id: crypto.randomUUID(),
      descripcion: "",
      cantidad: 1,
      precio_unitario: 0,
      subtotal: 0,
    };
    setItems(prev => [...prev, newItem]);
  };

  // Actualizar item
  const handleUpdateItem = (id: string, field: keyof IvrItem, value: any) => {
    setItems(prev => prev.map(item => {
      if (item.id !== id) return item;

      const updated = { ...item, [field]: value };

      // Recalcular subtotal
      if (field === 'cantidad' || field === 'precio_unitario') {
        const cantidad = field === 'cantidad' ? parseFloat(value) || 0 : item.cantidad;
        const precio = field === 'precio_unitario' ? parseFloat(value) || 0 : item.precio_unitario;
        updated.subtotal = cantidad * precio;
      }

      return updated;
    }));
  };

  // Eliminar item
  const handleRemoveItem = (id: string) => {
    setItems(prev => prev.filter(item => item.id !== id));
  };

  // Panel lateral: copiar todos los renglones de un IVR anterior.
  const handleCopiarTodoDelPanel = (renglones: RenglonIvr[]) => {
    const nuevos: IvrItem[] = renglones.map((r) => ({
      id: crypto.randomUUID(),
      producto_id: r.producto_id,
      descripcion: r.descripcion,
      cantidad: r.cantidad,
      precio_unitario: r.precio_unitario,
      subtotal: r.subtotal || r.cantidad * r.precio_unitario,
    }));
    if (items.length > 0) {
      const ok = window.confirm(
        "Ya cargaste items en este IVR. ¿Reemplazarlos por los del IVR anterior?"
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
        producto_id: r.producto_id,
        descripcion: r.descripcion,
        cantidad: r.cantidad,
        precio_unitario: r.precio_unitario,
        subtotal: r.subtotal || r.cantidad * r.precio_unitario,
      },
    ]);
  };

  // Emails del cliente para la vista de éxito (string, array o literal PG).
  const clienteEmails = useMemo<string[]>(() => {
    const raw = (clienteSeleccionado as any)?.email;
    if (!raw) return [];
    const arr = Array.isArray(raw) ? raw : [raw];
    const re = /[^\s@]+@[^\s@]+\.[^\s@]+/g;
    const out: string[] = [];
    for (const v of arr) {
      if (typeof v === 'string') out.push(...(v.match(re) || []));
    }
    return [...new Set(out)];
  }, [clienteSeleccionado]);

  // Envío del IVR recién creado vía /api/ivr/enviar (email propio de IVR + PDF).
  const enviarIvrCreado = async (emails: string[]) => {
    if (!createdIvr) return;
    const label = emails.length === 1 ? emails[0] : `${emails.length} destinatarios`;
    const toastId = toast.loading(`Enviando IVR a ${label}...`);
    try {
      const res = await fetch('/api/ivr/enviar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(
          emails.length === 1
            ? { ivr_id: createdIvr.id, email_destino: emails[0] }
            : { ivr_id: createdIvr.id, emails_destino: emails }
        ),
      });
      const raw = await res.text();
      let data: any = {};
      try { data = raw ? JSON.parse(raw) : {}; } catch { data = {}; }
      if (!res.ok) throw new Error(data.error || 'Error al enviar');
      toast.success(`IVR enviado a ${label}`, { id: toastId });
    } catch (e: any) {
      toast.error(e.message || 'Error al enviar email', { id: toastId });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Override de N° inválido: no enviar.
    if (numeroOverrideInvalido) {
      toast.error("El número de IVR ingresado no es válido.");
      return;
    }

    setLoading(true);

    // Solo enviamos override cuando es un IVR nuevo, con override activo y válido.
    const usarOverride = !ivr?.id && numeroManual && !!numeroOverrideNormalizado;

    try {
      const payload = {
        id: ivr?.id,
        ...(usarOverride
          ? { nro_factura: numeroOverrideNormalizado, nro_factura_manual: true }
          : {}),
        cliente_id: formData.cliente_id,
        fecha_emision: formData.fecha_emision,
        total: items.length > 0 ? totalCalculado : parseFloat(formData.total),
        subtotal: items.length > 0 ? totalCalculado : parseFloat(formData.total),
        estado: formData.estado,
        comentarios: formData.comentarios ? [{ texto: formData.comentarios, fecha: new Date().toISOString() }] : [],
        items: items.map(item => ({
          producto_id: item.producto_id,
          descripcion: item.descripcion,
          cantidad: item.cantidad,
          precio_unitario: item.precio_unitario,
          subtotal: item.subtotal,
        })),
        // Aplicar saldo a favor si está habilitado
        aplicar_saldo_favor: aplicarSaldoFavor && saldoAplicable > 0,
        monto_saldo_favor: saldoAplicable,
      };

      const res = await fetch('/api/ivr', {
        method: ivr?.id ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Error al guardar remito');
      }

      const saved = await res.json().catch(() => null);

      if (aplicarSaldoFavor && saldoAplicable > 0) {
        toast.success(`Remito creado. Se aplicó ${formatCurrency(saldoAplicable)} del saldo a favor.`);
      }

      onSuccess();

      if (ivr?.id) {
        // Edición: cerrar como siempre.
        onOpenChange(false);
      } else if (saved?.id) {
        // Creación: mostrar la vista de éxito con opción de enviar por email.
        setCreatedIvr({ id: saved.id, nro_factura: saved.nro_factura ?? undefined });
      } else {
        onOpenChange(false);
      }
    } catch (error: any) {
      toast.error(error.message || 'Error al guardar remito');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-6xl max-h-[90vh] flex flex-col p-0">
        {createdIvr ? (
          <div className="flex flex-col">
            <DialogHeader className="px-6 pt-6 pb-4 border-b flex-shrink-0 bg-gray-50 dark:bg-gray-900">
              <DialogTitle className="text-xl">IVR creado</DialogTitle>
              <DialogDescription className="text-sm">
                Podés enviarlo por email al cliente ahora, o cerrar.
              </DialogDescription>
            </DialogHeader>
            <div className="px-6 py-8 space-y-5">
              <div className="flex items-center gap-2 text-green-600 dark:text-green-400">
                <Check className="h-5 w-5" />
                <span className="font-medium text-sm">IVR creado correctamente</span>
              </div>
              <div className="flex items-center gap-2">
                <ExpandableEmailButton
                  emails={clienteEmails}
                  onSendEmail={(email) => enviarIvrCreado([email])}
                  onSendEmailMultiple={(emails) => enviarIvrCreado(emails)}
                  label="Enviar por email"
                  alwaysExpand
                />
                <Button
                  htmlType="button"
                  type="outline"
                  onClick={() => onOpenChange(false)}
                >
                  Cerrar
                </Button>
              </div>
            </div>
          </div>
        ) : (
        <div className="flex h-[80vh] max-h-[80vh]">
        <form onSubmit={handleSubmit} className="flex flex-col min-h-0 flex-1 border-r">
          <DialogHeader className="px-6 pt-6 pb-4 border-b flex-shrink-0 bg-gray-50 dark:bg-gray-900">
            <div className="flex items-center gap-2">
              <DialogTitle className="text-xl">
                {ivr ? "Editar IVR" : "Nuevo IVR"}
              </DialogTitle>
              <Badge variant="outline" className="text-gray-500 border-gray-400">
                <AlertTriangle className="h-3 w-3 mr-1" />
                Documento Interno
              </Badge>
            </div>
            <DialogDescription className="text-sm">
              Los remitos internos (IVR) no son comprobantes fiscales. Use facturas A/B/C para operaciones legales.
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto px-6 py-6 min-h-0 space-y-6">
            {/* Sección 1: Cliente y datos básicos */}
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2 space-y-2">
                <Label htmlFor="cliente">Cliente <span className="text-destructive">*</span></Label>
                <SearchableCombobox
                  value={formData.cliente_id}
                  onValueChange={(value) => setFormData({ ...formData, cliente_id: value })}
                  searchFn={searchClientes}
                  placeholder="Buscar cliente..."
                  emptyMessage="No se encontraron clientes"
                />
              </div>

              {/* Datos del cliente seleccionado */}
              {clienteSeleccionado && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  className="col-span-2 p-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900"
                >
                  <div className="flex items-center gap-2 mb-2">
                    <Building2 className="h-4 w-4 text-gray-500" />
                    <span className="font-medium text-sm">{clienteSeleccionado.nombre_fantasia || clienteSeleccionado.nombre}</span>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-xs text-muted-foreground">
                    {clienteSeleccionado.cuit && (
                      <div>CUIT: {clienteSeleccionado.cuit}</div>
                    )}
                    {clienteSeleccionado.direccion && (
                      <div className="col-span-2">{clienteSeleccionado.direccion}</div>
                    )}
                  </div>
                </motion.div>
              )}

              {/* Saldo a favor del cliente */}
              {clienteSeleccionado && saldoFavorCliente > 0 && !ivr && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  className="col-span-2 p-3 rounded-lg border border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-950/30"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Wallet className="h-4 w-4 text-green-600" />
                      <div>
                        <span className="font-medium text-sm text-green-700 dark:text-green-300">
                          Saldo a favor: {formatCurrency(saldoFavorCliente)}
                        </span>
                        <p className="text-xs text-green-600 dark:text-green-400">
                          Este cliente tiene saldo disponible de pagos anteriores
                        </p>
                      </div>
                    </div>
                  </div>

                  {totalIvr > 0 && (
                    <div className="mt-3 pt-3 border-t border-green-200 dark:border-green-800">
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="aplicar-saldo"
                          checked={aplicarSaldoFavor}
                          onCheckedChange={(checked) => setAplicarSaldoFavor(checked === true)}
                        />
                        <label
                          htmlFor="aplicar-saldo"
                          className="text-sm font-medium text-green-700 dark:text-green-300 cursor-pointer"
                        >
                          Aplicar saldo a favor a este remito
                        </label>
                      </div>

                      {aplicarSaldoFavor && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          className="mt-2 p-2 rounded bg-green-100 dark:bg-green-900/40"
                        >
                          <div className="flex justify-between text-xs">
                            <span className="text-green-700 dark:text-green-300">Total remito:</span>
                            <span className="font-medium">{formatCurrency(totalIvr)}</span>
                          </div>
                          <div className="flex justify-between text-xs">
                            <span className="text-green-700 dark:text-green-300">Saldo aplicado:</span>
                            <span className="font-medium text-green-600">-{formatCurrency(saldoAplicable)}</span>
                          </div>
                          <div className="flex justify-between text-sm font-semibold mt-1 pt-1 border-t border-green-200 dark:border-green-700">
                            <span className="text-green-800 dark:text-green-200">Pendiente a cobrar:</span>
                            <span>{formatCurrency(saldoPendienteNuevo)}</span>
                          </div>
                          {saldoFavorCliente > saldoAplicable && (
                            <p className="text-xs text-green-600 dark:text-green-400 mt-1">
                              Saldo restante después: {formatCurrency(saldoFavorCliente - saldoAplicable)}
                            </p>
                          )}
                        </motion.div>
                      )}
                    </div>
                  )}
                </motion.div>
              )}

              <div className="space-y-2">
                <Label htmlFor="fecha">Fecha</Label>
                <Input
                  id="fecha"
                  type="date"
                  value={formData.fecha_emision}
                  onChange={(e) => setFormData({ ...formData, fecha_emision: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label>N° de IVR</Label>
                {ivr?.id ? (
                  // Edición: el número no se cambia (el PUT no toca nro_factura).
                  <div className="h-9 flex items-center px-3 rounded-md border bg-muted text-sm font-mono">
                    {(ivr as any).nro_factura || "—"}
                  </div>
                ) : numeroManual ? (
                  // Override manual activado.
                  <div className="flex items-center gap-1.5">
                    <Input
                      autoFocus
                      value={numeroOverride}
                      onChange={(e) => setNumeroOverride(e.target.value)}
                      placeholder={nextNumber || "IVR-000001"}
                      className={cn(
                        "h-9 font-mono",
                        numeroOverrideInvalido && "border-destructive focus-visible:ring-destructive"
                      )}
                    />
                    <Button
                      htmlType="button"
                      type="text"
                      size="small"
                      className="h-9 w-9 p-0 shrink-0"
                      title="Volver al número automático"
                      onClick={() => {
                        setNumeroManual(false);
                        setNumeroOverride("");
                      }}
                    >
                      <RotateCcw className="h-4 w-4" />
                    </Button>
                  </div>
                ) : (
                  // Preview bloqueado del próximo correlativo + botón Cambiar.
                  <div className="flex items-center gap-1.5">
                    <div className="h-9 flex-1 flex items-center px-3 rounded-md border bg-muted text-sm font-mono text-muted-foreground">
                      {loadingNextNumber ? "Calculando…" : nextNumber || "Se asigna al guardar"}
                    </div>
                    <Button
                      htmlType="button"
                      type="text"
                      size="small"
                      className="h-9 w-9 p-0 shrink-0"
                      title="Cambiar número manualmente"
                      onClick={() => setNumeroManual(true)}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                  </div>
                )}
                {numeroManual && (
                  numeroOverrideInvalido ? (
                    <p className="text-xs text-destructive">Número inválido. Ej: IVR-001058 o 1058.</p>
                  ) : numeroOverrideNormalizado ? (
                    <p className="text-xs text-muted-foreground">Se guardará como <span className="font-mono">{numeroOverrideNormalizado}</span></p>
                  ) : (
                    <p className="text-xs text-muted-foreground">Dejalo vacío para usar el automático ({nextNumber || "…"}).</p>
                  )
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="estado">Estado</Label>
                <Select
                  value={formData.estado}
                  onValueChange={(value: "pendiente" | "pagada") => setFormData({ ...formData, estado: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pendiente">Pendiente</SelectItem>
                    <SelectItem value="pagada">Cobrado</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Sección 2: Items */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                  Items del Remito
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
                </div>
              </div>

              {/* Buscador de productos (código/nombre + insumo/equipo) */}
              <ProductoSearchPanel
                onSelect={handleAddProducto}
                selectedIds={items
                  .map((i) => i.producto_id)
                  .filter((id): id is string => id != null)}
              />

              {/* Lista de items */}
              {items.length > 0 ? (
                <div className="space-y-2">
                  {/* Header */}
                  <div className="grid grid-cols-12 gap-2 px-2 text-xs font-medium text-muted-foreground">
                    <div className="col-span-5">Descripción</div>
                    <div className="col-span-2 text-center">Cantidad</div>
                    <div className="col-span-2 text-right">Precio</div>
                    <div className="col-span-2 text-right">Subtotal</div>
                    <div className="col-span-1"></div>
                  </div>

                  {/* Items */}
                  {items.map((item, index) => (
                    <div
                      key={item.id}
                      className="grid grid-cols-12 gap-2 items-center p-2 rounded-lg border bg-card"
                    >
                      <div className="col-span-5">
                        <Input
                          value={item.descripcion}
                          onChange={(e) => handleUpdateItem(item.id, 'descripcion', e.target.value)}
                          placeholder="Descripción del item"
                          className="h-8"
                        />
                      </div>
                      <div className="col-span-2">
                        <Input
                          type="number"
                          min="1"
                          value={item.cantidad}
                          onChange={(e) => handleUpdateItem(item.id, 'cantidad', e.target.value)}
                          className="h-8 text-center"
                        />
                      </div>
                      <div className="col-span-2">
                        <Input
                          type="number"
                          min="0"
                          step="0.01"
                          value={item.precio_unitario}
                          onChange={(e) => handleUpdateItem(item.id, 'precio_unitario', e.target.value)}
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

                  {/* Total */}
                  <div className="flex justify-end pt-2 border-t">
                    <div className="text-right">
                      <div className="text-lg font-bold">
                        Total: {formatCurrency(totalCalculado)}
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-8 border-2 border-dashed rounded-lg">
                  <DollarSign className="h-8 w-8 text-muted-foreground mb-2" />
                  <p className="text-sm text-muted-foreground mb-2">No hay items agregados</p>
                  <p className="text-xs text-muted-foreground">Agregue productos o items manuales, o ingrese el total directamente</p>
                </div>
              )}
            </div>

            {/* Total manual (si no hay items) */}
            {items.length === 0 && (
              <div className="space-y-2">
                <Label htmlFor="total">Total del Remito</Label>
                <Input
                  id="total"
                  type="number"
                  step="0.01"
                  value={formData.total}
                  onChange={(e) => setFormData({ ...formData, total: e.target.value })}
                  placeholder="0.00"
                />
              </div>
            )}

            {/* Comentarios */}
            <div className="space-y-2">
              <Label htmlFor="comentarios">Comentarios (opcional)</Label>
              <Textarea
                id="comentarios"
                value={formData.comentarios}
                onChange={(e) => setFormData({ ...formData, comentarios: e.target.value })}
                placeholder="Notas adicionales..."
                rows={2}
                className="resize-none"
              />
            </div>
          </div>

          <DialogFooter className="px-6 py-4 border-t bg-muted/20 flex-shrink-0">
            <Button
              htmlType="button"
              type="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Cancelar
            </Button>
            <Button
              htmlType="submit"
              type="primary"
              disabled={loading || !formData.cliente_id || (items.length === 0 && !formData.total) || numeroOverrideInvalido}
              loading={loading}
              className="bg-gray-600 hover:bg-gray-700"
            >
              {ivr ? "Guardar Cambios" : "Crear IVR"}
            </Button>
          </DialogFooter>
        </form>
        <IvrHistorialPanel
          clienteId={formData.cliente_id || null}
          onCopiarTodo={handleCopiarTodoDelPanel}
          onAgregarItem={handleAgregarItemDelPanel}
          className="hidden md:flex md:flex-col w-80 shrink-0 bg-muted/10 min-h-0 overflow-hidden"
        />
        </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
