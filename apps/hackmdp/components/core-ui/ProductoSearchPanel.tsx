"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Search, Hash, Loader2, Plus, Package, PackagePlus, Wrench } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatCurrency } from "@/lib/format-currency";
import { ProductoFormDialog } from "./ProductoFormDialog";

export interface ProductoResult {
  id: number | string;
  codigo: string;
  nombre: string;
  precio_venta: number;
  categoria?: string | null;
}

interface Props {
  onSelect: (producto: ProductoResult) => void;
  disabled?: boolean;
  /** ids de productos ya agregados, para marcarlos en los resultados */
  selectedIds?: Array<number | string>;
  /** Alto del scrollarea de resultados */
  resultsHeight?: number;
}

type SearchMode = "all" | "codigo" | "nombre";
type TipoFiltro = "todos" | "insumo" | "equipo";

export function ProductoSearchPanel({
  onSelect,
  disabled = false,
  selectedIds = [],
  resultsHeight = 220,
}: Props) {
  const [searchMode, setSearchMode] = useState<SearchMode>("all");
  const [tipo, setTipo] = useState<TipoFiltro>("todos");
  const [searchTerm, setSearchTerm] = useState("");
  const [productos, setProductos] = useState<ProductoResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    return () => {
      if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    };
  }, []);

  const runSearch = useCallback((term: string, mode: SearchMode, tipoFiltro: TipoFiltro) => {
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);

    if (!term || term.length < 2) {
      setProductos([]);
      setSearching(false);
      return;
    }

    setSearching(true);
    searchTimeoutRef.current = setTimeout(async () => {
      try {
        const params = new URLSearchParams({ search: term, pageSize: "30" });
        if (mode !== "all") params.append("search_field", mode);
        if (tipoFiltro !== "todos") params.append("tipo", tipoFiltro);
        const res = await fetch(`/api/productos?${params.toString()}`);
        const data = await res.json();
        if (!res.ok || data.error) {
          setProductos([]);
          return;
        }
        const arr = Array.isArray(data) ? data : data.data || [];
        setProductos(
          arr.map((p: any) => ({
            id: p.id,
            codigo: p.codigo || "",
            nombre: p.nombre || "Sin nombre",
            precio_venta: Number(p.precio_venta ?? p.precio ?? 0),
            categoria: p.categoria_nombre ?? p.categoria ?? null,
          }))
        );
      } catch {
        setProductos([]);
      } finally {
        setSearching(false);
      }
    }, 300);
  }, []);

  const handleProductoCreado = (nuevo: any) => {
    if (nuevo?.id) {
      onSelect({
        id: nuevo.id,
        codigo: nuevo.codigo || "",
        nombre: nuevo.nombre || "Sin nombre",
        precio_venta: Number(nuevo.precio_venta ?? nuevo.precio ?? 0),
        categoria: nuevo.categoria ?? null,
      });
    }
  };

  const handlePick = (producto: ProductoResult) => {
    onSelect(producto);
    setSearchTerm("");
    setProductos([]);
    inputRef.current?.focus();
  };

  return (
    <div className="rounded-xl border-2 border-dashed p-5 bg-purple-50/80 dark:bg-purple-950/30 border-purple-300 dark:border-purple-700">
      <div className="space-y-3">
        {/* Filtro Todo / Código / Nombre */}
        <div className="flex items-center gap-3 flex-wrap">
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300 w-12">Filtrar:</span>
          <div className="flex rounded-lg border-2 border-purple-200 dark:border-purple-800 bg-white dark:bg-gray-800 p-1 gap-1">
            {(["all", "codigo", "nombre"] as const).map((m) => {
              const label = m === "all" ? "Todo" : m === "codigo" ? "Código" : "Nombre";
              const Icon = m === "codigo" ? Hash : m === "nombre" ? Search : null;
              return (
                <button
                  key={m}
                  type="button"
                  disabled={disabled}
                  onClick={() => {
                    setSearchMode(m);
                    if (searchTerm) runSearch(searchTerm, m, tipo);
                  }}
                  className={cn(
                    "px-3 py-1.5 text-xs font-semibold rounded-md transition-all flex items-center gap-1.5 disabled:opacity-50",
                    searchMode === m
                      ? "bg-purple-600 text-white shadow-sm"
                      : "text-gray-600 dark:text-gray-400 hover:bg-purple-50 dark:hover:bg-purple-900/30"
                  )}
                >
                  {Icon && <Icon className="h-3.5 w-3.5" />}
                  {label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Filtro Tipo: Todos / Insumo / Equipo */}
        <div className="flex items-center gap-3 flex-wrap">
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300 w-12">Tipo:</span>
          <div className="flex rounded-lg border-2 border-purple-200 dark:border-purple-800 bg-white dark:bg-gray-800 p-1 gap-1">
            {(["todos", "insumo", "equipo"] as const).map((t) => {
              const label = t === "todos" ? "Todos" : t === "insumo" ? "Insumo" : "Equipo";
              const Icon = t === "insumo" ? Package : t === "equipo" ? Wrench : null;
              return (
                <button
                  key={t}
                  type="button"
                  disabled={disabled}
                  onClick={() => {
                    setTipo(t);
                    if (searchTerm) runSearch(searchTerm, searchMode, t);
                  }}
                  className={cn(
                    "px-3 py-1.5 text-xs font-semibold rounded-md transition-all flex items-center gap-1.5 disabled:opacity-50",
                    tipo === t
                      ? "bg-purple-600 text-white shadow-sm"
                      : "text-gray-600 dark:text-gray-400 hover:bg-purple-50 dark:hover:bg-purple-900/30"
                  )}
                >
                  {Icon && <Icon className="h-3.5 w-3.5" />}
                  {label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Input de búsqueda */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            ref={inputRef}
            disabled={disabled}
            placeholder={
              searchMode === "codigo"
                ? "Buscar solo por código (PRD-001, LBCX...)..."
                : searchMode === "nombre"
                ? "Buscar solo por nombre del producto..."
                : "Buscar por código o nombre..."
            }
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              runSearch(e.target.value, searchMode, tipo);
            }}
            className="pl-9 bg-white dark:bg-gray-800"
          />
          {searching && (
            <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
          )}
        </div>

        {/* Resultados */}
        {productos.length > 0 && (
          <ScrollArea
            className="rounded-lg border bg-white dark:bg-gray-800"
            style={{ height: resultsHeight }}
          >
            <div className="p-2 space-y-1">
              {productos.map((producto) => {
                const yaAgregado = selectedIds.some((id) => id === producto.id);
                return (
                  <button
                    key={producto.id}
                    type="button"
                    disabled={disabled}
                    onClick={() => handlePick(producto)}
                    className={cn(
                      "w-full flex items-center gap-3 p-2.5 rounded-lg text-left transition-colors disabled:opacity-50",
                      yaAgregado
                        ? "bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800"
                        : "hover:bg-gray-50 dark:hover:bg-gray-700"
                    )}
                  >
                    <Badge variant="outline" className="shrink-0 font-mono">
                      {producto.codigo || "—"}
                    </Badge>
                    <span className="flex-1 text-sm truncate">{producto.nombre}</span>
                    <span className="shrink-0 text-sm font-medium tabular-nums">
                      {formatCurrency(producto.precio_venta)}
                    </span>
                    <Plus className="h-4 w-4 text-muted-foreground shrink-0" />
                  </button>
                );
              })}
            </div>
          </ScrollArea>
        )}

        {searchTerm.length >= 2 && productos.length === 0 && !searching && (
          <div className="flex flex-col items-center gap-3 py-6 px-4 border border-dashed rounded-lg bg-white/60 dark:bg-gray-800/60">
            <p className="text-sm text-muted-foreground text-center">
              No se encontraron productos con &quot;{searchTerm}&quot;
            </p>
            <Button
              type="outline"
              size="small"
              htmlType="button"
              disabled={disabled}
              onClick={() => setCreateDialogOpen(true)}
              className="gap-2"
            >
              <PackagePlus className="h-4 w-4" />
              Crear nuevo producto
            </Button>
          </div>
        )}

        {searchTerm.length < 2 && (
          <p className="text-xs text-muted-foreground px-1">
            Escribí al menos 2 caracteres para buscar.
          </p>
        )}
      </div>

      <ProductoFormDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        initialNombre={searchTerm}
        onSuccess={handleProductoCreado}
      />
    </div>
  );
}
