"use client";

import React, { useRef, useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { formatCurrency } from "@/lib/format-currency";
import {
  DollarSign,
  Loader2,
  Check,
  ChevronDown,
  CreditCard,
  Banknote,
  Building2,
  Smartphone,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface ExpandablePagoButtonProps {
  /** ID de la factura/IVR a pagar */
  facturaId: string;
  /** Saldo pendiente de la factura */
  saldoPendiente: number;
  /** Función para registrar el pago */
  onRegistrarPago: (data: { monto: number; metodo_pago: string }) => Promise<void>;
  /** Si ya está procesando un pago */
  loading?: boolean;
  /** Clase opcional para el contenedor */
  className?: string;
  /** Label del botón */
  label?: string;
}

const metodosPago = [
  { id: "efectivo", label: "Efectivo", icon: Banknote },
  { id: "transferencia", label: "Transferencia", icon: Building2 },
  { id: "mercadopago_joaquin", label: "MP Joaquín", icon: Smartphone },
  { id: "mercadopago_karen", label: "MP Karen", icon: Smartphone },
  { id: "mercadopago_nahuel", label: "MP Nahuel", icon: Smartphone },
  { id: "debito", label: "Débito", icon: CreditCard },
  { id: "credito", label: "Crédito", icon: CreditCard },
];

export function ExpandablePagoButton({
  facturaId,
  saldoPendiente,
  onRegistrarPago,
  loading = false,
  className,
  label = "Cobro",
}: ExpandablePagoButtonProps) {
  const [expanded, setExpanded] = useState(false);
  const [selectedMetodo, setSelectedMetodo] = useState<string>("transferencia");
  const [monto, setMonto] = useState<string>("");
  const [internalLoading, setInternalLoading] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const isLoading = loading || internalLoading;

  // Click outside handler
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setExpanded(false);
      }
    };

    if (expanded) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [expanded]);

  // Focus input when expanded
  useEffect(() => {
    if (expanded) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [expanded]);

  const handleButtonClick = () => {
    if (saldoPendiente <= 0) {
      toast.info("No hay saldo pendiente");
      return;
    }
    setExpanded(!expanded);
    if (!expanded) {
      setMonto(saldoPendiente.toFixed(2));
    }
  };

  const handleSubmit = async () => {
    const montoNum = parseFloat(monto);
    if (!montoNum || montoNum <= 0) {
      toast.error("Ingrese un monto válido");
      return;
    }

    setInternalLoading(true);
    try {
      await onRegistrarPago({
        monto: montoNum,
        metodo_pago: selectedMetodo,
      });
      setExpanded(false);
      setMonto("");
    } catch (error: any) {
      toast.error(error.message || "Error al registrar pago");
    } finally {
      setInternalLoading(false);
    }
  };

  const handleUsarSaldoCompleto = () => {
    setMonto(saldoPendiente.toFixed(2));
    inputRef.current?.focus();
  };

  const montoNum = parseFloat(monto) || 0;
  const esMontoValido = montoNum > 0;
  const excedeSaldo = montoNum > saldoPendiente;

  return (
    <div ref={containerRef} className={cn("relative", className)}>
      {/* Botón principal */}
      <motion.button
        type="button"
        onClick={handleButtonClick}
        disabled={isLoading || saldoPendiente <= 0}
        className={cn(
          "flex items-center gap-1.5 px-2.5 py-1.5 text-sm font-medium rounded-md border transition-colors",
          expanded
            ? "bg-emerald-50 dark:bg-emerald-900/30 border-emerald-300 dark:border-emerald-700 shadow-sm"
            : "bg-emerald-600 hover:bg-emerald-700 border-emerald-600 text-white",
          saldoPendiente <= 0 && "opacity-50 cursor-not-allowed",
          isLoading && "opacity-50 cursor-not-allowed"
        )}
        whileTap={{ scale: 0.98 }}
      >
        {isLoading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <DollarSign className="h-4 w-4" />
        )}
        <span className={expanded ? "text-emerald-700 dark:text-emerald-300" : ""}>
          {label}
        </span>
        {saldoPendiente > 0 && (
          <motion.span
            animate={{ rotate: expanded ? 180 : 0 }}
            transition={{ duration: 0.2 }}
          >
            <ChevronDown className={cn(
              "h-3 w-3 ml-0.5",
              expanded ? "text-emerald-600 dark:text-emerald-400" : ""
            )} />
          </motion.span>
        )}
      </motion.button>

      {/* Dropdown expandible */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            className="absolute top-full right-0 mt-1 z-50 w-80 rounded-lg border bg-white dark:bg-zinc-900 border-emerald-300 dark:border-emerald-700 shadow-lg overflow-hidden"
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            transition={{ type: "spring", stiffness: 400, damping: 30 }}
          >
            <div className="p-3 space-y-3">
              {/* Header con saldo pendiente */}
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
                  Saldo pendiente:
                </span>
                <span className="text-sm font-bold text-orange-600 dark:text-orange-400">
                  {formatCurrency(saldoPendiente)}
                </span>
              </div>

              {/* Input de monto */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-medium text-zinc-600 dark:text-zinc-400">
                    Monto a cobrar
                  </label>
                  <button
                    type="button"
                    onClick={handleUsarSaldoCompleto}
                    className="text-xs text-emerald-600 dark:text-emerald-400 hover:underline"
                  >
                    Usar total
                  </button>
                </div>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 text-sm">
                    $
                  </span>
                  <input
                    ref={inputRef}
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0.00"
                    value={monto}
                    onChange={(e) => setMonto(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && esMontoValido) {
                        e.preventDefault();
                        handleSubmit();
                      }
                      if (e.key === "Escape") {
                        setExpanded(false);
                      }
                    }}
                    className="w-full pl-7 pr-8 py-2 text-sm rounded-md border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                  />
                  {monto && (
                    <button
                      type="button"
                      onClick={() => setMonto("")}
                      className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-400"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  )}
                </div>
                {excedeSaldo && (
                  <p className="text-xs text-amber-600 dark:text-amber-400">
                    Excede el saldo → genera saldo a favor
                  </p>
                )}
              </div>

              {/* Selector de método de pago */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-zinc-600 dark:text-zinc-400">
                  Método de pago
                </label>
                <div className="grid grid-cols-4 gap-1">
                  {metodosPago.slice(0, 4).map((metodo) => {
                    const Icon = metodo.icon;
                    const isSelected = selectedMetodo === metodo.id;
                    return (
                      <motion.button
                        key={metodo.id}
                        type="button"
                        onClick={() => setSelectedMetodo(metodo.id)}
                        className={cn(
                          "flex flex-col items-center gap-1 p-2 rounded-md text-xs transition-colors",
                          isSelected
                            ? "bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 ring-1 ring-emerald-300 dark:ring-emerald-600"
                            : "hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-600 dark:text-zinc-400"
                        )}
                        whileTap={{ scale: 0.95 }}
                      >
                        <Icon className="h-4 w-4" />
                        <span className="truncate w-full text-center text-[10px]">
                          {metodo.label}
                        </span>
                      </motion.button>
                    );
                  })}
                </div>
                {/* Segunda fila con más opciones */}
                <div className="grid grid-cols-3 gap-1">
                  {metodosPago.slice(4).map((metodo) => {
                    const Icon = metodo.icon;
                    const isSelected = selectedMetodo === metodo.id;
                    return (
                      <motion.button
                        key={metodo.id}
                        type="button"
                        onClick={() => setSelectedMetodo(metodo.id)}
                        className={cn(
                          "flex flex-col items-center gap-1 p-2 rounded-md text-xs transition-colors",
                          isSelected
                            ? "bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 ring-1 ring-emerald-300 dark:ring-emerald-600"
                            : "hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-600 dark:text-zinc-400"
                        )}
                        whileTap={{ scale: 0.95 }}
                      >
                        <Icon className="h-4 w-4" />
                        <span className="truncate w-full text-center text-[10px]">
                          {metodo.label}
                        </span>
                      </motion.button>
                    );
                  })}
                </div>
              </div>

              {/* Botón de confirmar */}
              <motion.button
                type="button"
                onClick={handleSubmit}
                disabled={!esMontoValido || isLoading}
                className={cn(
                  "w-full flex items-center justify-center gap-2 px-3 py-2.5 text-sm font-medium rounded-md transition-colors",
                  esMontoValido
                    ? "bg-emerald-500 text-white hover:bg-emerald-600"
                    : "bg-zinc-100 dark:bg-zinc-800 text-zinc-400 cursor-not-allowed"
                )}
                whileTap={esMontoValido ? { scale: 0.98 } : undefined}
              >
                {isLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Check className="h-4 w-4" />
                )}
                <span>
                  {esMontoValido
                    ? `Registrar ${formatCurrency(montoNum)}`
                    : "Ingrese un monto"}
                </span>
              </motion.button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
