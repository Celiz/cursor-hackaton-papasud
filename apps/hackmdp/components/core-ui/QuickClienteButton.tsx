"use client";

import React, { useRef, useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import {
  Building2,
  Loader2,
  Search,
  X,
  CheckCircle2,
  MapPin,
  FileText,
  Plus,
  ChevronRight,
  Database,
  Globe,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Cliente } from "@/lib/types";
import { useDebounce } from "@/hooks/use-debounce";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface DatosContribuyenteArca {
  cuit: string;
  tipoPersona: string;
  nombre?: string;
  apellido?: string;
  razonSocial?: string;
  nombreCompleto: string;
  condicionIva: string;
  condicionIvaCodigo: number;
  condicionIvaInterno: string;
  domicilioFiscal?: {
    direccion?: string;
    localidad?: string;
    provincia?: string;
    codigoPostal?: string;
  };
  estadoCuit: string;
  actividadPrincipal?: {
    codigo: string;
    descripcion: string;
  };
  esMonotributista: boolean;
  esResponsableInscripto: boolean;
  esExento: boolean;
}

interface SearchResult {
  id: string;
  nombre: string;
  cuit: string;
  condicion_iva?: string;
  direccion?: string;
  localidad?: string;
  provincia?: string;
  estado?: string;
  source: "bd" | "afip";
  datosAfip?: DatosContribuyenteArca;
  cliente?: Cliente;
}

interface QuickClienteButtonProps {
  /** Called when a cliente is selected (existing) or created (from AFIP) */
  onClienteSelected: (cliente: Cliente) => void;
  /** Optional callback specifically for when a new cliente is created */
  onClienteCreated?: (cliente: Cliente) => void;
  /** Additional className for the container */
  className?: string;
  /** Button variant: icon only or with text */
  buttonVariant?: "icon" | "text";
  /** Placeholder text for the search input */
  placeholder?: string;
}

export function QuickClienteButton({
  onClienteSelected,
  onClienteCreated,
  className,
  buttonVariant = "icon",
  placeholder = "Buscar por nombre o CUIT...",
}: QuickClienteButtonProps) {
  const [expanded, setExpanded] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [selectedResult, setSelectedResult] = useState<SearchResult | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const debouncedQuery = useDebounce(query, 300);

  // Click outside handler
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setExpanded(false);
        setSelectedResult(null);
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        if (selectedResult) {
          setSelectedResult(null);
        } else {
          setExpanded(false);
        }
      }
    };

    if (expanded) {
      document.addEventListener("mousedown", handleClickOutside, true);
      document.addEventListener("keydown", handleEscape);
      return () => {
        document.removeEventListener("mousedown", handleClickOutside, true);
        document.removeEventListener("keydown", handleEscape);
      };
    }
  }, [expanded, selectedResult]);

  // Focus input when expanded
  useEffect(() => {
    if (expanded) {
      setTimeout(() => inputRef.current?.focus(), 100);
    } else {
      setQuery("");
      setResults([]);
      setSelectedResult(null);
    }
  }, [expanded]);

  // Search function
  const performSearch = useCallback(async (searchQuery: string) => {
    if (!searchQuery || searchQuery.length < 2) {
      setResults([]);
      return;
    }

    setIsSearching(true);
    const searchResults: SearchResult[] = [];

    try {
      // Check if query looks like a CUIT (only digits, 11 chars)
      const cleanedQuery = searchQuery.replace(/\D/g, "");
      const isCuitSearch = cleanedQuery.length >= 10;

      // Parallel search: BD + AFIP (if CUIT)
      const promises: Promise<void>[] = [];

      // Search in BD
      promises.push(
        fetch(`/api/clientes?search=${encodeURIComponent(searchQuery)}&limit=5&view=principal`)
          .then((res) => res.json())
          .then((data) => {
            if (Array.isArray(data)) {
              data.forEach((cliente: Cliente) => {
                searchResults.push({
                  id: cliente.id,
                  nombre: cliente.nombre,
                  cuit: cliente.cuit,
                  condicion_iva: cliente.condicion_iva,
                  direccion: cliente.direccion,
                  localidad: cliente.localidad,
                  provincia: cliente.provincia,
                  estado: cliente.estado,
                  source: "bd",
                  cliente,
                });
              });
            }
          })
          .catch(console.error)
      );

      // Search in AFIP if looks like CUIT
      if (isCuitSearch && cleanedQuery.length === 11) {
        promises.push(
          fetch("/api/arca/validar-cuit", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ cuit: cleanedQuery }),
          })
            .then((res) => res.json())
            .then((result) => {
              if (result.success && result.datos) {
                const datos = result.datos as DatosContribuyenteArca;
                // Check if already in BD results
                const existsInBd = searchResults.some(
                  (r) => r.cuit.replace(/\D/g, "") === datos.cuit.replace(/\D/g, "")
                );
                if (!existsInBd) {
                  searchResults.push({
                    id: `afip-${datos.cuit}`,
                    nombre: datos.nombreCompleto,
                    cuit: datos.cuit,
                    condicion_iva: datos.condicionIvaInterno,
                    direccion: datos.domicilioFiscal?.direccion,
                    localidad: datos.domicilioFiscal?.localidad,
                    provincia: datos.domicilioFiscal?.provincia,
                    estado: datos.estadoCuit,
                    source: "afip",
                    datosAfip: datos,
                  });
                }
              }
            })
            .catch(console.error)
        );
      }

      await Promise.all(promises);

      // Sort: BD first, then AFIP
      searchResults.sort((a, b) => {
        if (a.source === "bd" && b.source === "afip") return -1;
        if (a.source === "afip" && b.source === "bd") return 1;
        return 0;
      });

      setResults(searchResults.slice(0, 5));
    } catch (error) {
      console.error("Error searching:", error);
    } finally {
      setIsSearching(false);
    }
  }, []);

  // Trigger search on debounced query change
  useEffect(() => {
    performSearch(debouncedQuery);
  }, [debouncedQuery, performSearch]);

  // Handle selecting a result
  const handleSelectResult = (result: SearchResult) => {
    if (selectedResult?.id === result.id) {
      setSelectedResult(null);
    } else {
      setSelectedResult(result);
    }
  };

  // Handle using/creating the selected result
  const handleUseResult = async (result: SearchResult) => {
    if (result.source === "bd" && result.cliente) {
      // Existing cliente - just select it
      onClienteSelected(result.cliente);
      toast.success(`Cliente seleccionado: ${result.nombre}`);
      setExpanded(false);
    } else if (result.source === "afip" && result.datosAfip) {
      // Create from AFIP data
      setIsCreating(true);
      try {
        const datos = result.datosAfip;
        const newCliente: Partial<Cliente> = {
          nombre: datos.nombreCompleto,
          cuit: datos.cuit,
          condicion_iva: datos.condicionIvaInterno as Cliente["condicion_iva"],
          direccion: datos.domicilioFiscal?.direccion || "",
          localidad: datos.domicilioFiscal?.localidad || "",
          provincia: datos.domicilioFiscal?.provincia || "",
          estado: "Activo",
          division: "humanos",
          email: [],
          telefono: [],
        };

        const response = await fetch("/api/clientes", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(newCliente),
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error || "Error al crear cliente");
        }

        const createdCliente = await response.json();
        toast.success(`Cliente creado: ${createdCliente.nombre}`);
        onClienteSelected(createdCliente);
        onClienteCreated?.(createdCliente);
        setExpanded(false);
      } catch (error) {
        console.error("Error creating cliente:", error);
        toast.error(error instanceof Error ? error.message : "Error al crear cliente");
      } finally {
        setIsCreating(false);
      }
    }
  };

  // Handle creating new with just the query
  const handleCreateNew = () => {
    // For now, just show a message - could open full dialog
    toast.info(`Para crear "${query}" con más datos, usá el formulario completo`);
  };

  const formatCuit = (cuit: string) => {
    const clean = cuit.replace(/\D/g, "");
    if (clean.length === 11) {
      return `${clean.slice(0, 2)}-${clean.slice(2, 10)}-${clean.slice(10)}`;
    }
    return cuit;
  };

  return (
    <div ref={containerRef} className={cn("relative", className)}>
      {/* Trigger Button */}
      <Tooltip>
        <TooltipTrigger asChild>
          <motion.button
            type="button"
            onClick={() => setExpanded(!expanded)}
            className={cn(
              "flex items-center gap-1.5 px-2.5 py-1.5 text-sm font-medium rounded-md border transition-colors",
              expanded
                ? "bg-white dark:bg-zinc-900 border-purple-300 dark:border-purple-700 shadow-sm"
                : "bg-transparent border-zinc-200 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800",
              "text-zinc-700 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-zinc-100"
            )}
            whileTap={{ scale: 0.98 }}
          >
            <Building2 className="h-4 w-4" />
            {buttonVariant === "text" && <span>Nuevo cliente</span>}
          </motion.button>
        </TooltipTrigger>
        <TooltipContent>
          <p>Buscar o crear cliente rápido</p>
        </TooltipContent>
      </Tooltip>

      {/* Dropdown */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            className="absolute top-full left-0 mt-1 z-[100] w-80 rounded-lg border bg-white dark:bg-zinc-900 border-purple-200 dark:border-purple-800 shadow-xl overflow-hidden"
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            transition={{ type: "spring", stiffness: 400, damping: 30 }}
          >
            {/* Search Input */}
            <div className="p-2 border-b border-zinc-200 dark:border-zinc-700">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
                <input
                  ref={inputRef}
                  type="text"
                  placeholder={placeholder}
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  className="w-full pl-9 pr-8 py-2 text-sm rounded-md border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
                {isSearching && (
                  <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-purple-500" />
                )}
                {!isSearching && query && (
                  <button
                    type="button"
                    onClick={() => setQuery("")}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-0.5 rounded hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-400"
                  >
                    <X className="h-3 w-3" />
                  </button>
                )}
              </div>
            </div>

            {/* Results */}
            <div className="max-h-80 overflow-y-auto">
              <AnimatePresence mode="wait">
                {query.length < 2 ? (
                  // Idle state
                  <motion.div
                    key="idle"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="p-4 text-center text-sm text-zinc-500 dark:text-zinc-400"
                  >
                    Escribí al menos 2 caracteres para buscar
                  </motion.div>
                ) : isSearching && results.length === 0 ? (
                  // Searching state
                  <motion.div
                    key="searching"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="p-4 flex items-center justify-center gap-2 text-sm text-zinc-500 dark:text-zinc-400"
                  >
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Buscando...
                  </motion.div>
                ) : results.length > 0 ? (
                  // Results list
                  <motion.div
                    key="results"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="p-1"
                  >
                    {results.map((result, idx) => (
                      <motion.div
                        key={result.id}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: idx * 0.05 }}
                      >
                        <button
                          type="button"
                          onClick={() => handleSelectResult(result)}
                          className={cn(
                            "w-full text-left p-2 rounded-md transition-colors",
                            selectedResult?.id === result.id
                              ? "bg-purple-50 dark:bg-purple-900/30"
                              : "hover:bg-zinc-100 dark:hover:bg-zinc-800"
                          )}
                        >
                          <div className="flex items-start gap-2">
                            {/* Source badge */}
                            <span
                              className={cn(
                                "flex-shrink-0 mt-0.5 px-1.5 py-0.5 text-[10px] font-semibold rounded uppercase",
                                result.source === "bd"
                                  ? "bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300"
                                  : "bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300"
                              )}
                            >
                              {result.source === "bd" ? (
                                <Database className="h-3 w-3" />
                              ) : (
                                <Globe className="h-3 w-3" />
                              )}
                            </span>

                            {/* Info */}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="font-medium text-sm text-zinc-900 dark:text-zinc-100 truncate">
                                  {result.nombre}
                                </span>
                                <ChevronRight
                                  className={cn(
                                    "h-3 w-3 text-zinc-400 transition-transform",
                                    selectedResult?.id === result.id && "rotate-90"
                                  )}
                                />
                              </div>
                              <span className="text-xs text-zinc-500 dark:text-zinc-400">
                                {formatCuit(result.cuit)}
                              </span>
                            </div>
                          </div>
                        </button>

                        {/* Expanded preview */}
                        <AnimatePresence>
                          {selectedResult?.id === result.id && (
                            <motion.div
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: "auto", opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              transition={{ duration: 0.2 }}
                              className="overflow-hidden"
                            >
                              <div className="mx-2 mb-2 p-3 rounded-md bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700 space-y-2">
                                {/* Condición IVA */}
                                {result.condicion_iva && (
                                  <div className="flex items-center gap-2 text-xs">
                                    <FileText className="h-3 w-3 text-zinc-400" />
                                    <span className="text-zinc-600 dark:text-zinc-400">
                                      {result.condicion_iva.replace(/_/g, " ")}
                                    </span>
                                  </div>
                                )}

                                {/* Dirección */}
                                {(result.direccion || result.localidad) && (
                                  <div className="flex items-start gap-2 text-xs">
                                    <MapPin className="h-3 w-3 text-zinc-400 mt-0.5" />
                                    <span className="text-zinc-600 dark:text-zinc-400">
                                      {[result.direccion, result.localidad, result.provincia]
                                        .filter(Boolean)
                                        .join(", ")}
                                    </span>
                                  </div>
                                )}

                                {/* Estado CUIT (for AFIP) */}
                                {result.source === "afip" && result.estado && (
                                  <div className="flex items-center gap-2 text-xs">
                                    <CheckCircle2
                                      className={cn(
                                        "h-3 w-3",
                                        result.estado === "ACTIVO"
                                          ? "text-green-500"
                                          : "text-amber-500"
                                      )}
                                    />
                                    <span className="text-zinc-600 dark:text-zinc-400">
                                      CUIT {result.estado}
                                    </span>
                                  </div>
                                )}

                                {/* Action button */}
                                <button
                                  type="button"
                                  onClick={() => handleUseResult(result)}
                                  disabled={isCreating}
                                  className={cn(
                                    "w-full mt-2 flex items-center justify-center gap-1.5 px-3 py-2 text-sm font-medium rounded-md transition-colors",
                                    result.source === "bd"
                                      ? "bg-blue-500 hover:bg-blue-600 text-white"
                                      : "bg-green-500 hover:bg-green-600 text-white",
                                    isCreating && "opacity-50 cursor-not-allowed"
                                  )}
                                >
                                  {isCreating ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                  ) : result.source === "bd" ? (
                                    <>
                                      <CheckCircle2 className="h-4 w-4" />
                                      Usar este cliente
                                    </>
                                  ) : (
                                    <>
                                      <Plus className="h-4 w-4" />
                                      Agregar a mis clientes
                                    </>
                                  )}
                                </button>
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </motion.div>
                    ))}
                  </motion.div>
                ) : query.length >= 2 && !isSearching ? (
                  // No results
                  <motion.div
                    key="empty"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="p-4 space-y-3"
                  >
                    <p className="text-sm text-center text-zinc-500 dark:text-zinc-400">
                      No se encontraron resultados para "{query}"
                    </p>
                    <button
                      type="button"
                      onClick={handleCreateNew}
                      className="w-full flex items-center justify-center gap-1.5 px-3 py-2 text-sm font-medium rounded-md bg-purple-500 hover:bg-purple-600 text-white transition-colors"
                    >
                      <Plus className="h-4 w-4" />
                      Crear "{query}" manualmente
                    </button>
                  </motion.div>
                ) : null}
              </AnimatePresence>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
