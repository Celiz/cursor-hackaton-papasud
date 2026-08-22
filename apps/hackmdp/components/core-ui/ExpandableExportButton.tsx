"use client";

import React, { useRef, useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import {
  Download,
  Loader2,
  FileSpreadsheet,
  FileText,
  File,
  ChevronDown,
} from "lucide-react";
import { cn } from "@/lib/utils";

type ExportFormat = "excel" | "pdf" | "csv";

interface ExportOption {
  id: ExportFormat;
  label: string;
  icon: React.ElementType;
  description: string;
  color: string;
}

const exportOptions: ExportOption[] = [
  {
    id: "excel",
    label: "Excel",
    icon: FileSpreadsheet,
    description: "Hoja de cálculo .xlsx",
    color: "text-green-600 dark:text-green-400 bg-green-100 dark:bg-green-900/40",
  },
  {
    id: "pdf",
    label: "PDF",
    icon: FileText,
    description: "Documento .pdf",
    color: "text-red-600 dark:text-red-400 bg-red-100 dark:bg-red-900/40",
  },
  {
    id: "csv",
    label: "CSV",
    icon: File,
    description: "Datos separados .csv",
    color: "text-blue-600 dark:text-blue-400 bg-blue-100 dark:bg-blue-900/40",
  },
];

interface ExpandableExportButtonProps {
  /** Callbacks para cada formato de exportación */
  onExportExcel?: () => void | Promise<void>;
  onExportPDF?: () => void | Promise<void>;
  onExportCSV?: () => void | Promise<void>;
  /** Si está cargando externamente */
  loading?: boolean;
  /** Clase opcional */
  className?: string;
  /** Mostrar label en el botón */
  showLabel?: boolean;
}

export function ExpandableExportButton({
  onExportExcel,
  onExportPDF,
  onExportCSV,
  loading = false,
  className,
  showLabel = false,
}: ExpandableExportButtonProps) {
  const [expanded, setExpanded] = useState(false);
  const [internalLoading, setInternalLoading] = useState<ExportFormat | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const isLoading = loading || internalLoading !== null;

  // Filtrar opciones disponibles según las props
  const availableOptions = exportOptions.filter((opt) => {
    if (opt.id === "excel" && onExportExcel) return true;
    if (opt.id === "pdf" && onExportPDF) return true;
    if (opt.id === "csv" && onExportCSV) return true;
    return false;
  });

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
    if (availableOptions.length === 0) {
      toast.info("No hay opciones de exportación disponibles");
      return;
    }

    // Si solo hay una opción, ejecutar directamente
    if (availableOptions.length === 1) {
      handleExport(availableOptions[0].id);
      return;
    }

    setExpanded(!expanded);
  };

  const handleExport = async (format: ExportFormat) => {
    setInternalLoading(format);
    setExpanded(false);

    try {
      if (format === "excel" && onExportExcel) {
        await onExportExcel();
      } else if (format === "pdf" && onExportPDF) {
        await onExportPDF();
      } else if (format === "csv" && onExportCSV) {
        await onExportCSV();
      }
    } catch (error: any) {
      toast.error(error.message || `Error al exportar ${format.toUpperCase()}`);
    } finally {
      setInternalLoading(null);
    }
  };

  if (availableOptions.length === 0) {
    return null;
  }

  return (
    <div ref={containerRef} className={cn("relative", className)}>
      {/* Botón principal */}
      <motion.button
        type="button"
        onClick={handleButtonClick}
        disabled={isLoading}
        className={cn(
          "flex items-center gap-1.5 px-2.5 py-1.5 text-sm font-medium rounded-md border transition-colors",
          expanded
            ? "bg-white dark:bg-zinc-900 border-purple-300 dark:border-purple-700 shadow-sm"
            : "bg-transparent border-zinc-200 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800",
          "text-zinc-700 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-zinc-100",
          isLoading && "opacity-50 cursor-not-allowed"
        )}
        title="Exportar"
        whileTap={{ scale: 0.98 }}
      >
        {isLoading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Download className="h-4 w-4" />
        )}
        {showLabel && <span>Exportar</span>}
        {availableOptions.length > 1 && (
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
            className="absolute top-full right-0 mt-1 z-50 w-56 rounded-lg border bg-white dark:bg-zinc-900 border-purple-300 dark:border-purple-700 shadow-lg overflow-hidden"
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            transition={{ type: "spring", stiffness: 400, damping: 30 }}
          >
            <div className="p-2 space-y-1">
              <div className="px-2 py-1">
                <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
                  Exportar como:
                </span>
              </div>
              {availableOptions.map((option, idx) => {
                const Icon = option.icon;
                const isCurrentLoading = internalLoading === option.id;
                return (
                  <motion.button
                    key={option.id}
                    type="button"
                    onClick={() => handleExport(option.id)}
                    disabled={isLoading}
                    className={cn(
                      "w-full flex items-center gap-3 px-3 py-2.5 rounded-md text-left transition-colors",
                      "hover:bg-zinc-100 dark:hover:bg-zinc-800",
                      isCurrentLoading && "bg-zinc-100 dark:bg-zinc-800"
                    )}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: idx * 0.05 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <div className={cn("p-2 rounded-lg", option.color)}>
                      {isCurrentLoading ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Icon className="h-4 w-4" />
                      )}
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                        {option.label}
                      </p>
                      <p className="text-xs text-zinc-500 dark:text-zinc-400">
                        {option.description}
                      </p>
                    </div>
                  </motion.button>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
