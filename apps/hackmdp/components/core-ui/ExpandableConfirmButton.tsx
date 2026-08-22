"use client";

import React, { useRef, useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import {
  Copy,
  Loader2,
  Check,
  X,
  AlertTriangle,
  Trash2,
} from "lucide-react";
import { cn } from "@/lib/utils";

type ConfirmVariant = "default" | "danger" | "warning";

interface ExpandableConfirmButtonProps {
  /** Icono del botón */
  icon?: React.ReactNode;
  /** Label del botón (opcional) */
  label?: string;
  /** Título de la confirmación */
  confirmTitle: string;
  /** Descripción de la confirmación */
  confirmDescription?: string;
  /** Texto del botón de confirmar */
  confirmLabel?: string;
  /** Texto del botón de cancelar */
  cancelLabel?: string;
  /** Callback al confirmar */
  onConfirm: () => Promise<void>;
  /** Si está cargando */
  loading?: boolean;
  /** Variante visual */
  variant?: ConfirmVariant;
  /** Clase opcional */
  className?: string;
  /** Título del botón */
  title?: string;
}

const variantStyles: Record<ConfirmVariant, {
  border: string;
  confirmBtn: string;
  icon: string;
}> = {
  default: {
    border: "border-blue-300 dark:border-blue-700",
    confirmBtn: "bg-blue-500 hover:bg-blue-600 text-white",
    icon: "text-blue-500",
  },
  danger: {
    border: "border-red-300 dark:border-red-700",
    confirmBtn: "bg-red-500 hover:bg-red-600 text-white",
    icon: "text-red-500",
  },
  warning: {
    border: "border-amber-300 dark:border-amber-700",
    confirmBtn: "bg-amber-500 hover:bg-amber-600 text-white",
    icon: "text-amber-500",
  },
};

export function ExpandableConfirmButton({
  icon,
  label,
  confirmTitle,
  confirmDescription,
  confirmLabel = "Confirmar",
  cancelLabel = "Cancelar",
  onConfirm,
  loading = false,
  variant = "default",
  className,
  title,
}: ExpandableConfirmButtonProps) {
  const [expanded, setExpanded] = useState(false);
  const [internalLoading, setInternalLoading] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const isLoading = loading || internalLoading;
  const styles = variantStyles[variant];

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

  const handleConfirm = async () => {
    setInternalLoading(true);
    try {
      await onConfirm();
      setExpanded(false);
    } catch (error: any) {
      toast.error(error.message || "Error al procesar");
    } finally {
      setInternalLoading(false);
    }
  };

  const defaultIcon = variant === "danger" ? <Trash2 className="h-4 w-4" /> : <Copy className="h-4 w-4" />;

  return (
    <div ref={containerRef} className={cn("relative", className)}>
      {/* Botón principal */}
      <motion.button
        type="button"
        onClick={() => setExpanded(!expanded)}
        disabled={isLoading}
        className={cn(
          "flex items-center gap-1.5 px-2.5 py-1.5 text-sm font-medium rounded-md border transition-colors",
          expanded
            ? cn("bg-white dark:bg-zinc-900 shadow-sm", styles.border)
            : "bg-transparent border-zinc-200 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800",
          "text-zinc-700 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-zinc-100",
          isLoading && "opacity-50 cursor-not-allowed"
        )}
        title={title || confirmTitle}
        whileTap={{ scale: 0.98 }}
      >
        {isLoading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          icon || defaultIcon
        )}
        {label && <span>{label}</span>}
      </motion.button>

      {/* Dropdown de confirmación */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            className={cn(
              "absolute top-full right-0 mt-1 z-50 w-64 rounded-lg border bg-white dark:bg-zinc-900 shadow-lg overflow-hidden",
              styles.border
            )}
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            transition={{ type: "spring", stiffness: 400, damping: 30 }}
          >
            <div className="p-4 space-y-3">
              {/* Header con icono */}
              <div className="flex items-start gap-3">
                <div className={cn("mt-0.5", styles.icon)}>
                  {variant === "danger" ? (
                    <AlertTriangle className="h-5 w-5" />
                  ) : variant === "warning" ? (
                    <AlertTriangle className="h-5 w-5" />
                  ) : (
                    icon || <Copy className="h-5 w-5" />
                  )}
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                    {confirmTitle}
                  </p>
                  {confirmDescription && (
                    <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
                      {confirmDescription}
                    </p>
                  )}
                </div>
              </div>

              {/* Botones */}
              <div className="flex gap-2">
                <motion.button
                  type="button"
                  onClick={() => setExpanded(false)}
                  disabled={isLoading}
                  className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-sm font-medium rounded-md border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                  whileTap={{ scale: 0.98 }}
                >
                  <X className="h-3.5 w-3.5" />
                  {cancelLabel}
                </motion.button>
                <motion.button
                  type="button"
                  onClick={handleConfirm}
                  disabled={isLoading}
                  className={cn(
                    "flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-sm font-medium rounded-md transition-colors",
                    styles.confirmBtn
                  )}
                  whileTap={{ scale: 0.98 }}
                >
                  {isLoading ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Check className="h-3.5 w-3.5" />
                  )}
                  {confirmLabel}
                </motion.button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// Componente específico para Duplicar
export function ExpandableDuplicateButton({
  onDuplicate,
  withItems = true,
  loading,
  className,
}: {
  onDuplicate: (withItems: boolean) => Promise<void>;
  withItems?: boolean;
  loading?: boolean;
  className?: string;
}) {
  const [expanded, setExpanded] = useState(false);
  const [internalLoading, setInternalLoading] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const isLoading = loading || internalLoading;

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

  const handleDuplicate = async (includeItems: boolean) => {
    setInternalLoading(true);
    try {
      await onDuplicate(includeItems);
      setExpanded(false);
    } catch (error: any) {
      toast.error(error.message || "Error al duplicar");
    } finally {
      setInternalLoading(false);
    }
  };

  return (
    <div ref={containerRef} className={cn("relative", className)}>
      <motion.button
        type="button"
        onClick={() => setExpanded(!expanded)}
        disabled={isLoading}
        className={cn(
          "flex items-center gap-1.5 px-2.5 py-1.5 text-sm font-medium rounded-md border transition-colors",
          expanded
            ? "bg-white dark:bg-zinc-900 border-blue-300 dark:border-blue-700 shadow-sm"
            : "bg-transparent border-zinc-200 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800",
          "text-zinc-700 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-zinc-100",
          isLoading && "opacity-50 cursor-not-allowed"
        )}
        title="Duplicar"
        whileTap={{ scale: 0.98 }}
      >
        {isLoading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Copy className="h-4 w-4" />
        )}
      </motion.button>

      <AnimatePresence>
        {expanded && (
          <motion.div
            className="absolute top-full right-0 mt-1 z-50 w-56 rounded-lg border bg-white dark:bg-zinc-900 border-blue-300 dark:border-blue-700 shadow-lg overflow-hidden"
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            transition={{ type: "spring", stiffness: 400, damping: 30 }}
          >
            <div className="p-2 space-y-1">
              <div className="px-2 py-1">
                <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
                  Duplicar documento:
                </span>
              </div>
              <motion.button
                type="button"
                onClick={() => handleDuplicate(true)}
                disabled={isLoading}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-md text-left hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0 }}
                whileTap={{ scale: 0.98 }}
              >
                <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/40">
                  <Copy className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                    Con items
                  </p>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">
                    Copia completa con detalles
                  </p>
                </div>
              </motion.button>
              <motion.button
                type="button"
                onClick={() => handleDuplicate(false)}
                disabled={isLoading}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-md text-left hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.05 }}
                whileTap={{ scale: 0.98 }}
              >
                <div className="p-2 rounded-lg bg-zinc-100 dark:bg-zinc-800">
                  <Copy className="h-4 w-4 text-zinc-600 dark:text-zinc-400" />
                </div>
                <div>
                  <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                    Solo encabezado
                  </p>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">
                    Sin items ni detalles
                  </p>
                </div>
              </motion.button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// Componente específico para Eliminar
export function ExpandableDeleteButton({
  onDelete,
  itemName,
  loading,
  className,
}: {
  onDelete: () => Promise<void>;
  itemName?: string;
  loading?: boolean;
  className?: string;
}) {
  return (
    <ExpandableConfirmButton
      icon={<Trash2 className="h-4 w-4" />}
      confirmTitle={`¿Eliminar${itemName ? ` ${itemName}` : ""}?`}
      confirmDescription="Esta acción no se puede deshacer"
      confirmLabel="Eliminar"
      onConfirm={onDelete}
      variant="danger"
      loading={loading}
      className={className}
      title="Eliminar"
    />
  );
}
