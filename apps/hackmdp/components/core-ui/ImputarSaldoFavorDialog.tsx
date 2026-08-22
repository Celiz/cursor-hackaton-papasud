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
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Wallet, FileText, ArrowRight, Check } from "lucide-react";
import { Factura } from "@/lib/types";
import { toast } from "sonner";
import { cn, formatIvrNumber } from "@/lib/utils";

interface ImputarSaldoFavorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clienteId: string;
  clienteNombre: string;
  saldoFavorDisponible: number;
  ivrsPendientes: Factura[];
  onSuccess: () => void;
}

const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString("es-AR", {
    day: "numeric",
    month: "short",
  });
};

export function ImputarSaldoFavorDialog({
  open,
  onOpenChange,
  clienteId,
  clienteNombre,
  saldoFavorDisponible,
  ivrsPendientes,
  onSuccess,
}: ImputarSaldoFavorDialogProps) {
  const [loading, setLoading] = useState(false);
  const [selectedIvrs, setSelectedIvrs] = useState<Set<string>>(new Set());

  // Reset selection when dialog opens
  React.useEffect(() => {
    if (open) {
      setSelectedIvrs(new Set());
    }
  }, [open]);

  // Calcular imputación
  const imputacion = useMemo(() => {
    let saldoRestante = saldoFavorDisponible;
    const detalles: { ivrId: string; monto: number; saldoPendiente: number }[] = [];

    // Ordenar IVRs seleccionados por fecha (más antiguos primero)
    const ivrsSeleccionados = ivrsPendientes
      .filter(ivr => selectedIvrs.has(ivr.id))
      .sort((a, b) => new Date(a.fecha_emision).getTime() - new Date(b.fecha_emision).getTime());

    for (const ivr of ivrsSeleccionados) {
      if (saldoRestante <= 0) break;

      const saldoPendiente = ivr.saldo_pendiente ?? ivr.total ?? 0;
      const montoAImputar = Math.min(saldoRestante, saldoPendiente);

      if (montoAImputar > 0) {
        detalles.push({
          ivrId: ivr.id,
          monto: montoAImputar,
          saldoPendiente,
        });
        saldoRestante -= montoAImputar;
      }
    }

    return {
      detalles,
      totalImputado: saldoFavorDisponible - saldoRestante,
      saldoRestanteDespues: saldoRestante,
    };
  }, [selectedIvrs, ivrsPendientes, saldoFavorDisponible]);

  const toggleIvr = (ivrId: string) => {
    const newSet = new Set(selectedIvrs);
    if (newSet.has(ivrId)) {
      newSet.delete(ivrId);
    } else {
      newSet.add(ivrId);
    }
    setSelectedIvrs(newSet);
  };

  const selectAll = () => {
    setSelectedIvrs(new Set(ivrsPendientes.map(ivr => ivr.id)));
  };

  const handleImputar = async () => {
    if (imputacion.detalles.length === 0) {
      toast.error("Seleccione al menos un remito para imputar");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch('/api/pagos/imputar-saldo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cliente_id: clienteId,
          imputaciones: imputacion.detalles.map(d => ({
            factura_id: d.ivrId,
            monto: d.monto,
          })),
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Error al imputar saldo");
      }

      const result = await res.json();

      toast.success(
        `Saldo imputado: ${formatCurrency(imputacion.totalImputado)} a ${imputacion.detalles.length} remito(s)`
      );

      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      toast.error(error.message || "Error al imputar saldo");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[85vh] flex flex-col p-0">
        <DialogHeader className="px-6 pt-6 pb-4 border-b flex-shrink-0 bg-gradient-to-r from-green-50 to-white dark:from-green-950/20 dark:to-gray-950">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-green-100 dark:bg-green-900/40">
              <Wallet className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <DialogTitle className="text-lg">Imputar Saldo a Favor</DialogTitle>
              <DialogDescription className="text-sm">
                {clienteNombre}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-hidden flex flex-col min-h-0">
          {/* Saldo disponible */}
          <div className="px-6 py-4 border-b bg-green-50/50 dark:bg-green-950/10">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600 dark:text-gray-400">Saldo a favor disponible:</span>
              <span className="text-xl font-bold text-green-600">{formatCurrency(saldoFavorDisponible)}</span>
            </div>
          </div>

          {/* Lista de IVRs pendientes */}
          <div className="px-6 py-3 border-b flex items-center justify-between">
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Remitos pendientes ({ivrsPendientes.length})
            </span>
            <Button
              type="text"
              size="tiny"
              onClick={selectAll}
              disabled={selectedIvrs.size === ivrsPendientes.length}
            >
              Seleccionar todos
            </Button>
          </div>

          <ScrollArea className="flex-1 min-h-0">
            <div className="px-6 py-3 space-y-2">
              {ivrsPendientes.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <FileText className="h-10 w-10 mx-auto mb-2 opacity-40" />
                  <p className="text-sm">No hay remitos pendientes</p>
                </div>
              ) : (
                <AnimatePresence mode="popLayout">
                  {ivrsPendientes.map((ivr, index) => {
                    const isSelected = selectedIvrs.has(ivr.id);
                    const saldoPendiente = ivr.saldo_pendiente ?? ivr.total ?? 0;
                    const imputacionIvr = imputacion.detalles.find(d => d.ivrId === ivr.id);

                    return (
                      <motion.div
                        key={ivr.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.03 }}
                        className={cn(
                          "flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all",
                          isSelected
                            ? "border-green-300 bg-green-50 dark:border-green-700 dark:bg-green-950/30"
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
                        </div>

                        <div className="text-right">
                          <div className="text-sm font-semibold text-orange-600">
                            {formatCurrency(saldoPendiente)}
                          </div>
                          {imputacionIvr && (
                            <motion.div
                              initial={{ opacity: 0, scale: 0.9 }}
                              animate={{ opacity: 1, scale: 1 }}
                              className="flex items-center gap-1 text-xs text-green-600"
                            >
                              <ArrowRight className="h-3 w-3" />
                              <span>-{formatCurrency(imputacionIvr.monto)}</span>
                              {imputacionIvr.monto >= saldoPendiente && (
                                <Check className="h-3 w-3" />
                              )}
                            </motion.div>
                          )}
                        </div>
                      </motion.div>
                    );
                  })}
                </AnimatePresence>
              )}
            </div>
          </ScrollArea>

          {/* Resumen de imputación */}
          {imputacion.detalles.length > 0 && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              className="px-6 py-4 border-t bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-950/20 dark:to-emerald-950/20"
            >
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600 dark:text-gray-400">Remitos a imputar:</span>
                  <span className="font-medium">{imputacion.detalles.length}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600 dark:text-gray-400">Total a imputar:</span>
                  <span className="font-bold text-green-600">
                    {formatCurrency(imputacion.totalImputado)}
                  </span>
                </div>
                <div className="flex justify-between text-sm pt-2 border-t border-green-200 dark:border-green-800">
                  <span className="text-gray-600 dark:text-gray-400">Saldo restante:</span>
                  <span className="font-medium">
                    {formatCurrency(imputacion.saldoRestanteDespues)}
                  </span>
                </div>
              </div>
            </motion.div>
          )}
        </div>

        <DialogFooter className="px-6 py-4 border-t flex-shrink-0">
          <Button
            type="outline"
            onClick={() => onOpenChange(false)}
            disabled={loading}
          >
            Cancelar
          </Button>
          <Button
            type="primary"
            onClick={handleImputar}
            disabled={loading || imputacion.detalles.length === 0}
            loading={loading}
            className="bg-green-600 hover:bg-green-700"
          >
            <Wallet className="h-4 w-4 mr-2" />
            Imputar {imputacion.totalImputado > 0 && formatCurrency(imputacion.totalImputado)}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
