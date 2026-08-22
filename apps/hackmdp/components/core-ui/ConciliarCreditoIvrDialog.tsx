"use client";

import React, { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
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
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Wallet, FileText, Link as LinkIcon, AlertTriangle } from "lucide-react";
import { Factura } from "@/lib/types";
import { toast } from "sonner";
import { cn, formatIvrNumber } from "@/lib/utils";

interface ConciliarCreditoIvrDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clienteId: string;
  clienteNombre: string;
  /** Crédito que entró y todavía no se imputó a ningún IVR (creditoSinImputar). */
  creditoDisponible: number;
  /** IVR pendientes con su saldo PROPIO (sin netear crédito). */
  ivrsPendientes: Factura[];
  onSuccess: () => void;
}

const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString("es-AR", {
    day: "numeric",
    month: "short",
  });
};

const round2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;
const pendienteDe = (ivr: Factura) => Number(ivr.saldo_pendiente ?? ivr.total) || 0;

/**
 * Conciliar = imputar crédito que YA entró (cobros sin asociar) a IVR abiertos.
 * NO pide monto/fecha/método: no entra plata nueva. Vos decidís cuánto crédito va a
 * cada IVR (editable), con dos repartos rápidos: en cascada (el más viejo primero) o
 * en partes iguales. Postea a /api/cobros-ivr con monto=0 — el backend no inserta
 * ningún cobro (efectivo=0) y sólo cuelga las aplicaciones del recibo que ya tenía el
 * excedente (imputarCredito). Distinto de "Registrar cobro", que es plata nueva.
 */
export function ConciliarCreditoIvrDialog({
  open,
  onOpenChange,
  clienteId,
  clienteNombre,
  creditoDisponible,
  ivrsPendientes,
  onSuccess,
}: ConciliarCreditoIvrDialogProps) {
  const [loading, setLoading] = useState(false);
  const [selectedIvrs, setSelectedIvrs] = useState<Set<string>>(new Set());
  // Cuánto crédito va a cada IVR (editable). Keyed por ivr.id.
  const [montos, setMontos] = useState<Record<string, number>>({});

  React.useEffect(() => {
    if (open) {
      setSelectedIvrs(new Set());
      setMontos({});
    }
  }, [open]);

  const seleccionadosViejoPrimero = (ids: Set<string>) =>
    ivrsPendientes
      .filter((ivr) => ids.has(ivr.id))
      .sort(
        (a, b) =>
          new Date(a.fecha_emision).getTime() - new Date(b.fecha_emision).getTime()
      );

  // Cascada: llena el más viejo primero, lo que sobra al siguiente.
  const repartoCascada = (ids: Set<string>): Record<string, number> => {
    let restante = creditoDisponible;
    const m: Record<string, number> = {};
    for (const ivr of seleccionadosViejoPrimero(ids)) {
      const monto = Math.max(0, Math.min(restante, pendienteDe(ivr)));
      m[ivr.id] = round2(monto);
      restante -= monto;
    }
    return m;
  };

  // Partes iguales: divide el crédito por igual, clampeado al pendiente de cada uno.
  const repartoIgual = (ids: Set<string>): Record<string, number> => {
    const sel = seleccionadosViejoPrimero(ids);
    const m: Record<string, number> = {};
    if (sel.length === 0) return m;
    const parte = creditoDisponible / sel.length;
    for (const ivr of sel) {
      m[ivr.id] = round2(Math.min(parte, pendienteDe(ivr)));
    }
    return m;
  };

  const toggleIvr = (ivrId: string) => {
    const next = new Set(selectedIvrs);
    if (next.has(ivrId)) next.delete(ivrId);
    else next.add(ivrId);
    setSelectedIvrs(next);
    // Al cambiar la selección, recalculo el reparto por cascada (default).
    setMontos(repartoCascada(next));
  };

  const selectAll = () => {
    const next = new Set(ivrsPendientes.map((ivr) => ivr.id));
    setSelectedIvrs(next);
    setMontos(repartoCascada(next));
  };

  const setMontoManual = (ivrId: string, valor: string, pendiente: number) => {
    const v = Math.max(0, Math.min(parseFloat(valor) || 0, pendiente));
    setMontos((prev) => ({ ...prev, [ivrId]: round2(v) }));
  };

  const resumen = useMemo(() => {
    const detalles = seleccionadosViejoPrimero(selectedIvrs)
      .map((ivr) => ({
        ivrId: ivr.id,
        monto: Number(montos[ivr.id]) || 0,
        saldoPendiente: pendienteDe(ivr),
      }))
      .filter((d) => d.monto > 0.005);
    const totalAplicar = round2(detalles.reduce((s, d) => s + d.monto, 0));
    const excede = totalAplicar > creditoDisponible + 0.005;
    return {
      detalles,
      totalAplicar,
      excede,
      quedaAFavor: round2(creditoDisponible - totalAplicar),
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedIvrs, montos, ivrsPendientes, creditoDisponible]);

  const handleConciliar = async () => {
    if (resumen.detalles.length === 0) {
      toast.error("Asigná crédito a al menos un IVR");
      return;
    }
    if (resumen.excede) {
      toast.error("Estás asignando más que el crédito disponible");
      return;
    }
    setLoading(true);
    try {
      // El backend consume el crédito en el orden de las aplicaciones: van viejo→nuevo.
      const aplicaciones = resumen.detalles.map((d) => ({
        factura_id: d.ivrId,
        monto_aplicado: d.monto,
      }));

      const res = await fetch("/api/cobros-ivr", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cliente_id: clienteId,
          monto: 0,
          usar_saldo_favor: true,
          fecha_pago: new Date().toISOString().slice(0, 10),
          metodo_pago: null,
          aplicaciones,
          // El usuario eligió a mano cuánto va a cada IVR: no molestamos con el aviso FIFO.
          confirmar_fifo: true,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Error al conciliar el crédito");

      toast.success(
        `Crédito imputado: ${formatCurrency(resumen.totalAplicar)} a ${resumen.detalles.length} IVR`
      );
      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      toast.error(error.message || "Error al conciliar el crédito");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[85vh] flex flex-col p-0">
        <DialogHeader className="px-6 pt-6 pb-4 border-b flex-shrink-0 bg-gradient-to-r from-purple-50 to-white dark:from-purple-950/20 dark:to-gray-950">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-purple-100 dark:bg-purple-900/40">
              <LinkIcon className="h-5 w-5 text-purple-600" />
            </div>
            <div>
              <DialogTitle className="text-lg">Conciliar saldo a favor</DialogTitle>
              <DialogDescription className="text-sm">
                {clienteNombre} · imputá crédito que ya entró, sin registrar un cobro nuevo
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-hidden flex flex-col min-h-0">
          {/* Crédito disponible */}
          <div className="px-6 py-4 border-b bg-purple-50/50 dark:bg-purple-950/10">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600 dark:text-gray-400 flex items-center gap-2">
                <Wallet className="h-4 w-4 text-purple-600" />
                Crédito disponible:
              </span>
              <span className="text-xl font-bold text-purple-600">
                {formatCurrency(creditoDisponible)}
              </span>
            </div>
          </div>

          {/* Encabezado lista + repartos rápidos */}
          <div className="px-6 py-3 border-b flex items-center justify-between gap-2 flex-wrap">
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
              IVR pendientes ({ivrsPendientes.length})
            </span>
            <div className="flex items-center gap-1">
              <Button
                type="text"
                size="tiny"
                onClick={() => setMontos(repartoCascada(selectedIvrs))}
                disabled={selectedIvrs.size === 0}
              >
                En cascada
              </Button>
              <Button
                type="text"
                size="tiny"
                onClick={() => setMontos(repartoIgual(selectedIvrs))}
                disabled={selectedIvrs.size === 0}
              >
                Partes iguales
              </Button>
              <Button
                type="text"
                size="tiny"
                onClick={selectAll}
                disabled={selectedIvrs.size === ivrsPendientes.length}
              >
                Seleccionar todos
              </Button>
            </div>
          </div>

          <ScrollArea className="flex-1 min-h-0">
            <div className="px-6 py-3 space-y-2">
              {ivrsPendientes.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <FileText className="h-10 w-10 mx-auto mb-2 opacity-40" />
                  <p className="text-sm">No hay IVR pendientes</p>
                </div>
              ) : (
                <AnimatePresence mode="popLayout">
                  {ivrsPendientes.map((ivr, index) => {
                    const isSelected = selectedIvrs.has(ivr.id);
                    const saldoPendiente = pendienteDe(ivr);

                    return (
                      <motion.div
                        key={ivr.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.03 }}
                        className={cn(
                          "flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all",
                          isSelected
                            ? "border-purple-300 bg-purple-50 dark:border-purple-700 dark:bg-purple-950/30"
                            : "border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900 hover:border-gray-300 dark:hover:border-gray-700"
                        )}
                        onClick={() => toggleIvr(ivr.id)}
                      >
                        <Checkbox
                          checked={isSelected}
                          onCheckedChange={() => toggleIvr(ivr.id)}
                          className="pointer-events-none"
                        />

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <FileText className="h-4 w-4 text-gray-400" />
                            <span className="text-sm font-medium">
                              {formatIvrNumber((ivr as any).nro_factura)}
                            </span>
                            <span className="text-xs text-gray-500">
                              {formatDate(ivr.fecha_emision)}
                            </span>
                          </div>
                          <div className="text-xs text-orange-600 mt-0.5">
                            Pendiente: {formatCurrency(saldoPendiente)}
                          </div>
                        </div>

                        {isSelected && (
                          <div
                            className="flex flex-col items-end gap-0.5"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <span className="text-[11px] text-muted-foreground">
                              aplicar crédito
                            </span>
                            <Input
                              type="number"
                              step="0.01"
                              min="0"
                              max={saldoPendiente}
                              inputMode="decimal"
                              value={montos[ivr.id] ?? 0}
                              onChange={(e) =>
                                setMontoManual(ivr.id, e.target.value, saldoPendiente)
                              }
                              className="h-8 w-32 text-right text-sm font-semibold"
                            />
                          </div>
                        )}
                      </motion.div>
                    );
                  })}
                </AnimatePresence>
              )}
            </div>
          </ScrollArea>

          {/* Resumen */}
          {selectedIvrs.size > 0 && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              className={cn(
                "px-6 py-4 border-t",
                resumen.excede
                  ? "bg-red-50 dark:bg-red-950/20"
                  : "bg-gradient-to-r from-purple-50 to-indigo-50 dark:from-purple-950/20 dark:to-indigo-950/20"
              )}
            >
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600 dark:text-gray-400">IVR a imputar:</span>
                  <span className="font-medium">{resumen.detalles.length}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600 dark:text-gray-400">Se aplica:</span>
                  <span
                    className={cn(
                      "font-bold",
                      resumen.excede ? "text-red-600" : "text-purple-600"
                    )}
                  >
                    {formatCurrency(resumen.totalAplicar)}
                  </span>
                </div>
                <div className="flex justify-between text-sm pt-2 border-t border-purple-200 dark:border-purple-800">
                  <span className="text-gray-600 dark:text-gray-400">Queda a favor:</span>
                  <span className="font-medium">
                    {formatCurrency(resumen.quedaAFavor)}
                  </span>
                </div>
                {resumen.excede && (
                  <div className="flex items-center gap-1.5 text-xs text-red-600 pt-1">
                    <AlertTriangle className="h-3.5 w-3.5" />
                    Estás asignando más que el crédito disponible.
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </div>

        <DialogFooter className="px-6 py-4 border-t flex-shrink-0">
          <Button type="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            Cancelar
          </Button>
          <Button
            type="primary"
            onClick={handleConciliar}
            loading={loading}
            disabled={loading || resumen.detalles.length === 0 || resumen.excede}
          >
            Conciliar {resumen.totalAplicar > 0 ? formatCurrency(resumen.totalAplicar) : ""}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
