"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Label } from "@/components/ui/label";
import { Search, Hash, Loader2, Plus, Check, X, Package, PackagePlus } from "lucide-react";
import { cn } from "@/lib/utils";
import { ProductoFormDialog } from "./ProductoFormDialog";

export interface InsumoItem {
  fecha?: string;
  codigo?: string;
  nombre?: string;
  cantidad: number;
  producto_id?: number | string;
}

interface Producto {
  id: number | string;
  codigo: string;
  nombre: string;
}

interface Props {
  insumos: InsumoItem[];
  onChange: (insumos: InsumoItem[]) => void;
  disabled?: boolean;
  disabledReason?: string;
  /** Si se muestra dentro de un contenedor que ya tiene borde/fondo, pasar false */
  showWrapper?: boolean;
  /** Alto del scrollarea de resultados */
  resultsHeight?: number;
  /** Alto del scrollarea de la lista de agregados */
  listHeight?: number;
}

type SearchMode = "all" | "codigo" | "nombre";

export function InsumoSearchPanel({
  insumos,
  onChange,
  disabled = false,
  disabledReason,
  showWrapper = true,
  resultsHeight = 200,
  listHeight = 200,
}: Props) {
  const [searchMode, setSearchMode] = useState<SearchMode>("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [productos, setProductos] = useState<Producto[]>([]);
  const [searching, setSearching] = useState(false);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleProductoCreado = (nuevo: any) => {
    if (nuevo?.id) {
      handleAdd({
        id: nuevo.id,
        codigo: nuevo.codigo || "",
        nombre: nuevo.nombre || "Sin nombre",
      });
    }
  };

  useEffect(() => {
    return () => {
      if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    };
  }, []);

  const runSearch = useCallback((term: string, mode: SearchMode) => {
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);

    if (!term || term.length < 2) {
      setProductos([]);
      setSearching(false);
      return;
    }

    setSearching(true);
    searchTimeoutRef.current = setTimeout(async () => {
      try {
        const params = new URLSearchParams({ search: term, limit: "30" });
        if (mode !== "all") params.append("search_field", mode);
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
          }))
        );
      } catch {
        setProductos([]);
      } finally {
        setSearching(false);
      }
    }, 300);
  }, []);

  const handleAdd = (producto: Producto) => {
    const existente = insumos.find((i) => i.producto_id === producto.id);
    if (existente) {
      onChange(
        insumos.map((i) =>
          i.producto_id === producto.id ? { ...i, cantidad: (i.cantidad || 1) + 1 } : i
        )
      );
    } else {
      onChange([
        ...insumos,
        {
          fecha: new Date().toISOString(),
          codigo: producto.codigo,
          nombre: producto.nombre,
          cantidad: 1,
          producto_id: producto.id,
        },
      ]);
    }
    setSearchTerm("");
    setProductos([]);
    inputRef.current?.focus();
  };

  const handleRemove = (index: number) => {
    onChange(insumos.filter((_, i) => i !== index));
  };

  const handleQty = (index: number, cantidad: number) => {
    if (cantidad < 1) return;
    onChange(insumos.map((insumo, i) => (i === index ? { ...insumo, cantidad } : insumo)));
  };

  const handleNombre = (index: number, nombre: string) => {
    onChange(insumos.map((insumo, i) => (i === index ? { ...insumo, nombre } : insumo)));
  };

  const body = (
    <>
      {disabled && disabledReason && (
        <div className="mb-3 flex items-center gap-2 p-3 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-lg text-sm text-amber-700 dark:text-amber-400">
          {disabledReason}
        </div>
      )}

      <div className="space-y-3">
        {/* Filtro Todo / Código / Nombre */}
        <div className="flex items-center gap-3">
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Filtrar:</span>
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
                    if (searchTerm) runSearch(searchTerm, m);
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
              runSearch(e.target.value, searchMode);
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
                const yaAgregado = insumos.some((i) => i.producto_id === producto.id);
                return (
                  <button
                    key={producto.id}
                    type="button"
                    disabled={disabled}
                    onClick={() => handleAdd(producto)}
                    className={cn(
                      "w-full flex items-center gap-3 p-2.5 rounded-lg text-left transition-colors disabled:opacity-50",
                      yaAgregado
                        ? "bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800"
                        : "hover:bg-gray-50 dark:hover:bg-gray-700"
                    )}
                  >
                    <Badge variant="outline" className="shrink-0 font-mono">
                      {producto.codigo}
                    </Badge>
                    <span className="flex-1 text-sm truncate">{producto.nombre}</span>
                    {yaAgregado ? (
                      <Badge variant="secondary" className="shrink-0">
                        <Check className="h-3 w-3 mr-1" />
                        +1
                      </Badge>
                    ) : (
                      <Plus className="h-4 w-4 text-muted-foreground shrink-0" />
                    )}
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
              type="button"
              variant="outline"
              size="sm"
              disabled={disabled}
              onClick={() => setCreateDialogOpen(true)}
              className="gap-2"
            >
              <PackagePlus className="h-4 w-4" />
              Crear nuevo producto
            </Button>
          </div>
        )}
      </div>

      {/* Lista de insumos agregados */}
      {insumos.length > 0 && (
        <div className="mt-5 space-y-2">
          <div className="flex items-center justify-between mb-2">
            <Label className="text-sm font-medium">Productos agregados</Label>
            <span className="text-xs text-muted-foreground">
              {insumos.length} producto{insumos.length !== 1 ? "s" : ""}
            </span>
          </div>
          <ScrollArea style={{ height: listHeight }}>
            <div className="space-y-2 pr-3">
              {insumos.map((insumo, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-3 bg-white dark:bg-gray-800 rounded-lg border"
                >
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    {insumo.codigo && (
                      <Badge variant="secondary" className="shrink-0 font-mono">
                        {insumo.codigo}
                      </Badge>
                    )}
                    <Input
                      disabled={disabled}
                      value={insumo.nombre || ""}
                      onChange={(e) => handleNombre(index, e.target.value)}
                      placeholder="Nombre del insumo"
                      className="h-8 border-transparent bg-transparent shadow-none px-2 text-sm focus-visible:border-purple-300 focus-visible:bg-white dark:focus-visible:bg-gray-900 hover:bg-gray-50 dark:hover:bg-gray-700/50"
                    />
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <div className="flex items-center gap-1 bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
                      <Button
                        type="default"
                        variant="ghost"
                        size="icon"
                        disabled={disabled}
                        className="h-7 w-7"
                        onClick={() => handleQty(index, (insumo.cantidad || 1) - 1)}
                      >
                        -
                      </Button>
                      <span className="text-sm font-medium w-8 text-center">
                        {insumo.cantidad || 1}
                      </span>
                      <Button
                        type="default"
                        variant="ghost"
                        size="icon"
                        disabled={disabled}
                        className="h-7 w-7"
                        onClick={() => handleQty(index, (insumo.cantidad || 1) + 1)}
                      >
                        +
                      </Button>
                    </div>
                    <Button
                      type="default"
                      variant="ghost"
                      size="icon"
                      disabled={disabled}
                      className="h-7 w-7 text-red-500 hover:text-red-600 hover:bg-red-50"
                      onClick={() => handleRemove(index)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        </div>
      )}

      {insumos.length === 0 && (
        <div className="mt-5 p-6 border-2 border-dashed border-gray-200 dark:border-gray-800 rounded-xl text-center">
          <Package className="h-10 w-10 mx-auto mb-2 text-gray-300 dark:text-gray-700" />
          <p className="text-sm text-muted-foreground">No hay insumos agregados</p>
          <p className="text-xs text-muted-foreground mt-1">
            Usa el buscador para agregar productos
          </p>
        </div>
      )}
    </>
  );

  const dialog = (
    <ProductoFormDialog
      open={createDialogOpen}
      onOpenChange={setCreateDialogOpen}
      initialNombre={searchTerm}
      onSuccess={handleProductoCreado}
    />
  );

  if (!showWrapper)
    return (
      <div>
        {body}
        {dialog}
      </div>
    );

  return (
    <div className="rounded-xl border-2 border-dashed p-5 bg-purple-50/80 dark:bg-purple-950/30 border-purple-300 dark:border-purple-700">
      {body}
      {dialog}
    </div>
  );
}
