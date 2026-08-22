"use client";

import React, { useRef, useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import {
  RefreshCw,
  Loader2,
  ChevronDown,
  Check,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface StatusOption {
  value: string;
  label: string;
  color?: string;
  description?: string;
}

interface ExpandableStatusButtonProps {
  /** Estado actual */
  currentStatus: string;
  /** Opciones de estado disponibles */
  options: StatusOption[];
  /** Callback al cambiar estado */
  onStatusChange: (newStatus: string) => Promise<void>;
  /** Si está cargando */
  loading?: boolean;
  /** Clase opcional */
  className?: string;
  /** Mostrar el estado actual en el botón */
  showCurrentStatus?: boolean;
  /** Color del botón según estado */
  variant?: "default" | "badge";
}

// Colores predefinidos para estados comunes
const statusColors: Record<string, string> = {
  pendiente: "bg-yellow-100 dark:bg-yellow-900/40 text-yellow-700 dark:text-yellow-300 border-yellow-300 dark:border-yellow-700",
  en_proceso: "bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 border-blue-300 dark:border-blue-700",
  completado: "bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300 border-green-300 dark:border-green-700",
  cancelado: "bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300 border-red-300 dark:border-red-700",
  pagada: "bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300 border-green-300 dark:border-green-700",
  cobrado: "bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300 border-green-300 dark:border-green-700",
  vencida: "bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300 border-red-300 dark:border-red-700",
  activo: "bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300 border-green-300 dark:border-green-700",
  inactivo: "bg-zinc-100 dark:bg-zinc-900/40 text-zinc-700 dark:text-zinc-300 border-zinc-300 dark:border-zinc-700",
};

const getStatusColor = (status: string, customColor?: string): string => {
  if (customColor) return customColor;
  const normalized = status.toLowerCase().replace(/\s+/g, "_");
  return statusColors[normalized] || "bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border-zinc-300 dark:border-zinc-700";
};

export function ExpandableStatusButton({
  currentStatus,
  options,
  onStatusChange,
  loading = false,
  className,
  showCurrentStatus = true,
  variant = "default",
}: ExpandableStatusButtonProps) {
  const [expanded, setExpanded] = useState(false);
  const [internalLoading, setInternalLoading] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const isLoading = loading || internalLoading;
  const currentOption = options.find((o) => o.value === currentStatus);
  const currentLabel = currentOption?.label || currentStatus;

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

  const handleButtonClick = () => {
    if (options.length <= 1) {
      toast.info("No hay otros estados disponibles");
      return;
    }
    setExpanded(!expanded);
  };

  const handleStatusSelect = async (newStatus: string) => {
    if (newStatus === currentStatus) {
      setExpanded(false);
      return;
    }

    setSelectedStatus(newStatus);
    setInternalLoading(true);
    setExpanded(false);

    try {
      await onStatusChange(newStatus);
    } catch (error: any) {
      toast.error(error.message || "Error al cambiar estado");
    } finally {
      setInternalLoading(false);
      setSelectedStatus(null);
    }
  };

  const buttonColorClass = variant === "badge"
    ? getStatusColor(currentStatus, currentOption?.color)
    : expanded
      ? "bg-white dark:bg-zinc-900 border-orange-300 dark:border-orange-700 shadow-sm"
      : "bg-transparent border-zinc-200 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800";

  return (
    <div ref={containerRef} className={cn("relative", className)}>
      {/* Botón principal */}
      <motion.button
        type="button"
        onClick={handleButtonClick}
        disabled={isLoading}
        className={cn(
          "flex items-center gap-1.5 px-2.5 py-1.5 text-sm font-medium rounded-md border transition-colors",
          buttonColorClass,
          variant === "default" && "text-zinc-700 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-zinc-100",
          isLoading && "opacity-50 cursor-not-allowed"
        )}
        title="Cambiar estado"
        whileTap={{ scale: 0.98 }}
      >
        {isLoading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <RefreshCw className="h-4 w-4" />
        )}
        {showCurrentStatus && (
          <span className="max-w-[100px] truncate">{currentLabel}</span>
        )}
        {options.length > 1 && (
          <motion.span
            animate={{ rotate: expanded ? 180 : 0 }}
            transition={{ duration: 0.2 }}
          >
            <ChevronDown className="h-3 w-3" />
          </motion.span>
        )}
      </motion.button>

      {/* Dropdown expandible */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            className="absolute top-full right-0 mt-1 z-50 w-64 rounded-lg border bg-white dark:bg-zinc-900 border-orange-300 dark:border-orange-700 shadow-lg overflow-hidden"
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            transition={{ type: "spring", stiffness: 400, damping: 30 }}
          >
            <div className="p-2 space-y-1">
              <div className="px-2 py-1 flex items-center justify-between">
                <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
                  Cambiar estado a:
                </span>
              </div>
              <div className="max-h-64 overflow-y-auto space-y-1">
                {options.map((option, idx) => {
                  const isCurrentStatus = option.value === currentStatus;
                  const isSelected = selectedStatus === option.value;
                  const colorClass = getStatusColor(option.value, option.color);

                  return (
                    <motion.button
                      key={option.value}
                      type="button"
                      onClick={() => handleStatusSelect(option.value)}
                      disabled={isLoading}
                      className={cn(
                        "w-full flex items-center gap-3 px-3 py-2.5 rounded-md text-left transition-colors",
                        isCurrentStatus
                          ? "bg-zinc-100 dark:bg-zinc-800"
                          : "hover:bg-zinc-50 dark:hover:bg-zinc-800/50"
                      )}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: idx * 0.03 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      <div className={cn(
                        "px-2.5 py-1 rounded-md text-xs font-medium border",
                        colorClass
                      )}>
                        {option.label}
                      </div>
                      <div className="flex-1 min-w-0">
                        {option.description && (
                          <p className="text-xs text-zinc-500 dark:text-zinc-400 truncate">
                            {option.description}
                          </p>
                        )}
                      </div>
                      {isCurrentStatus && (
                        <Check className="h-4 w-4 text-green-500 flex-shrink-0" />
                      )}
                      {isSelected && (
                        <Loader2 className="h-4 w-4 animate-spin text-orange-500 flex-shrink-0" />
                      )}
                    </motion.button>
                  );
                })}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
