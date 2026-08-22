"use client";

import React, { useRef, useState, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import {
  Download,
  Loader2,
  FileText,
  Printer,
  Send,
  ChevronDown,
} from "lucide-react";
import { cn } from "@/lib/utils";

type DownloadAction = "pdf" | "print" | "send" | "csv" | "txt";

interface DownloadOption {
  id: DownloadAction;
  label: string;
  icon: React.ElementType;
  description: string;
  color: string;
}

const downloadOptions: DownloadOption[] = [
  {
    id: "pdf",
    label: "Descargar PDF",
    icon: FileText,
    description: "Guardar en tu dispositivo",
    color: "text-red-600 dark:text-red-400 bg-red-100 dark:bg-red-900/40",
  },
  {
    id: "csv",
    label: "Exportar CSV",
    icon: FileText,
    description: "Tabla para Excel / Sheets",
    color: "text-emerald-600 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-900/40",
  },
  {
    id: "txt",
    label: "Exportar TXT",
    icon: FileText,
    description: "Texto plano legible",
    color: "text-amber-600 dark:text-amber-400 bg-amber-100 dark:bg-amber-900/40",
  },
  {
    id: "print",
    label: "Imprimir",
    icon: Printer,
    description: "Enviar a impresora",
    color: "text-zinc-600 dark:text-zinc-400 bg-zinc-100 dark:bg-zinc-800",
  },
  {
    id: "send",
    label: "Enviar por Email",
    icon: Send,
    description: "Compartir documento",
    color: "text-blue-600 dark:text-blue-400 bg-blue-100 dark:bg-blue-900/40",
  },
];

interface ExpandableDownloadButtonProps {
  /** Callback para descargar PDF */
  onDownloadPDF?: () => void | Promise<void>;
  /** Callback para imprimir */
  onPrint?: () => void | Promise<void>;
  /** Callback para enviar por email */
  onSendEmail?: () => void | Promise<void>;
  /** Callback para exportar CSV */
  onExportCSV?: () => void | Promise<void>;
  /** Callback para exportar TXT */
  onExportTXT?: () => void | Promise<void>;
  /** Si está cargando externamente */
  loading?: boolean;
  /** Clase opcional */
  className?: string;
  /** Mostrar label */
  showLabel?: boolean;
}

export function ExpandableDownloadButton({
  onDownloadPDF,
  onPrint,
  onSendEmail,
  onExportCSV,
  onExportTXT,
  loading = false,
  className,
  showLabel = false,
}: ExpandableDownloadButtonProps) {
  const [expanded, setExpanded] = useState(false);
  const [internalLoading, setInternalLoading] = useState<DownloadAction | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const [dropdownPos, setDropdownPos] = useState<{ top: number; left: number } | null>(null);

  const isLoading = loading || internalLoading !== null;

  // Calculate dropdown position when expanded
  const updateDropdownPos = useCallback(() => {
    if (buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      setDropdownPos({
        top: rect.bottom + 4,
        left: Math.max(0, rect.right - 208), // 208 = w-52 (13rem)
      });
    }
  }, []);

  // Filtrar opciones disponibles
  const availableOptions = downloadOptions.filter((opt) => {
    if (opt.id === "pdf" && onDownloadPDF) return true;
    if (opt.id === "csv" && onExportCSV) return true;
    if (opt.id === "txt" && onExportTXT) return true;
    if (opt.id === "print" && onPrint) return true;
    if (opt.id === "send" && onSendEmail) return true;
    return false;
  });

  // Click outside handler + scroll/resize reposition
  useEffect(() => {
    if (!expanded) return;

    updateDropdownPos();

    const handleClickOutside = (event: MouseEvent) => {
      if (
        containerRef.current && !containerRef.current.contains(event.target as Node) &&
        !(event.target as Element)?.closest?.('[data-download-portal]')
      ) {
        setExpanded(false);
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setExpanded(false);
      }
    };

    const handleScrollOrResize = () => {
      setExpanded(false);
    };

    document.addEventListener("mousedown", handleClickOutside, true);
    document.addEventListener("keydown", handleEscape);
    window.addEventListener("scroll", handleScrollOrResize, true);
    window.addEventListener("resize", handleScrollOrResize);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside, true);
      document.removeEventListener("keydown", handleEscape);
      window.removeEventListener("scroll", handleScrollOrResize, true);
      window.removeEventListener("resize", handleScrollOrResize);
    };
  }, [expanded, updateDropdownPos]);

  const handleButtonClick = () => {
    if (availableOptions.length === 0) {
      toast.info("No hay opciones disponibles");
      return;
    }

    // Si solo hay una opción, ejecutar directamente
    if (availableOptions.length === 1) {
      handleAction(availableOptions[0].id);
      return;
    }

    setExpanded(!expanded);
  };

  const handleAction = async (action: DownloadAction) => {
    setInternalLoading(action);
    setExpanded(false);

    try {
      if (action === "pdf" && onDownloadPDF) {
        await onDownloadPDF();
      } else if (action === "csv" && onExportCSV) {
        await onExportCSV();
      } else if (action === "txt" && onExportTXT) {
        await onExportTXT();
      } else if (action === "print" && onPrint) {
        await onPrint();
      } else if (action === "send" && onSendEmail) {
        await onSendEmail();
      }
    } catch (error: any) {
      toast.error(error.message || "Error al procesar");
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
        ref={buttonRef}
        type="button"
        onClick={handleButtonClick}
        disabled={isLoading}
        className={cn(
          "flex items-center gap-1.5 px-2.5 py-1.5 text-sm font-medium rounded-md border transition-colors",
          expanded
            ? "bg-white dark:bg-zinc-900 border-red-300 dark:border-red-700 shadow-sm"
            : "bg-transparent border-zinc-200 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800",
          "text-zinc-700 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-zinc-100",
          isLoading && "opacity-50 cursor-not-allowed"
        )}
        title="Descargar / Imprimir"
        whileTap={{ scale: 0.98 }}
      >
        {isLoading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Download className="h-4 w-4" />
        )}
        {showLabel && <span>PDF</span>}
        {availableOptions.length > 1 && (
          <motion.span
            animate={{ rotate: expanded ? 180 : 0 }}
            transition={{ duration: 0.2 }}
          >
            <ChevronDown className="h-3 w-3" />
          </motion.span>
        )}
      </motion.button>

      {/* Dropdown via portal to escape overflow-hidden parents */}
      {typeof document !== "undefined" &&
        createPortal(
          <AnimatePresence>
            {expanded && dropdownPos && (
              <motion.div
                data-download-portal
                className="fixed z-[9999] w-52 rounded-lg border bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-700 shadow-xl overflow-hidden pointer-events-auto"
                style={{ top: dropdownPos.top, left: dropdownPos.left }}
                initial={{ opacity: 0, y: -10, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -10, scale: 0.95 }}
                transition={{ type: "spring", stiffness: 400, damping: 30 }}
              >
                <div className="p-2 space-y-1">
                  {availableOptions.map((option, idx) => {
                    const Icon = option.icon;
                    const isCurrentLoading = internalLoading === option.id;
                    return (
                      <motion.button
                        key={option.id}
                        type="button"
                        onClick={() => handleAction(option.id)}
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
          </AnimatePresence>,
          document.body
        )}
    </div>
  );
}
