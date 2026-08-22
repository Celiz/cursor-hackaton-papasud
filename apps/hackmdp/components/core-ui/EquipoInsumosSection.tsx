"use client";

import { useState } from "react";
import useSWR from "swr";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Search, Plus, X, Star, Loader2, Package } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { ProductosMultiPicker, type ProductoPick } from "./ProductosMultiPicker";

interface InsumoAsociado {
  id: string;
  producto_id: string;
  es_recomendado: boolean;
  es_compatible: boolean;
  nombre: string;
  codigo: string | null;
  precio_venta: number | null;
  stock_actual: number | null;
}

const fetcher = (url: string) => fetch(url).then((r) => r.json());

const fmtPrecio = (n: number | null) =>
  n != null
    ? new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS" }).format(Number(n))
    : "—";

export function EquipoInsumosSection({ equipoId }: { equipoId: string }) {
  const [busqueda, setBusqueda] = useState("");
  const [guardando, setGuardando] = useState(false);
  const [filtroAsoc, setFiltroAsoc] = useState("");
  const [multiOpen, setMultiOpen] = useState(false);

  // Límite + filtro server-side: algunos equipos (import viejo) tienen miles de insumos.
  const apiUrl = `/api/equipos-insumos?equipo_id=${equipoId}&limit=50${
    filtroAsoc.trim() ? `&q=${encodeURIComponent(filtroAsoc.trim())}` : ""
  }`;
  const { data, mutate, isLoading } = useSWR<{ insumos: InsumoAsociado[]; total: number }>(apiUrl, fetcher);
  const insumos = data?.insumos ?? [];
  const total = data?.total ?? 0;

  const { data: resultados } = useSWR<{ data: any[] }>(
    busqueda.trim().length >= 2
      ? `/api/productos?search=${encodeURIComponent(busqueda.trim())}&pageSize=8`
      : null,
    fetcher
  );

  const yaAsociados = new Set(insumos.map((i) => i.producto_id));

  async function upsert(productoId: string, esRecomendado: boolean) {
    const res = await fetch("/api/equipos-insumos", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ equipo_id: equipoId, producto_id: productoId, es_recomendado: esRecomendado }),
    });
    if (!res.ok) {
      const b = await res.json().catch(() => ({}));
      throw new Error(b.error || "No se pudo guardar");
    }
  }

  async function asociar(productoId: string) {
    setGuardando(true);
    try {
      await upsert(productoId, false);
      setBusqueda("");
      await mutate();
      toast.success("Insumo asociado");
    } catch (e: any) {
      toast.error(e.message || "Error al asociar");
    } finally {
      setGuardando(false);
    }
  }

  async function asociarVarios(productos: ProductoPick[]) {
    if (!productos.length) return;
    try {
      const res = await fetch("/api/equipos-insumos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ equipo_id: equipoId, producto_ids: productos.map((p) => p.id) }),
      });
      if (!res.ok) {
        const b = await res.json().catch(() => ({}));
        throw new Error(b.error || "No se pudieron asociar");
      }
      const b = await res.json();
      await mutate();
      toast.success(`${b.count ?? productos.length} insumo${(b.count ?? productos.length) !== 1 ? "s" : ""} asociado${(b.count ?? productos.length) !== 1 ? "s" : ""}`);
    } catch (e: any) {
      toast.error(e.message || "Error al asociar");
    }
  }

  async function toggleRecomendado(insumo: InsumoAsociado) {
    try {
      await upsert(insumo.producto_id, !insumo.es_recomendado);
      await mutate();
    } catch {
      toast.error("No se pudo actualizar");
    }
  }

  async function quitar(insumo: InsumoAsociado) {
    try {
      const res = await fetch(`/api/equipos-insumos?id=${insumo.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      await mutate();
      toast.success("Insumo quitado");
    } catch {
      toast.error("No se pudo quitar");
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-medium text-muted-foreground">Productos que usa este equipo</span>
        <Button
          htmlType="button"
          variant="outline"
          size="small"
          onClick={() => setMultiOpen(true)}
          className="h-8 gap-1.5"
        >
          <Plus className="h-4 w-4" /> Agregar varios
        </Button>
      </div>

      <ProductosMultiPicker
        open={multiOpen}
        onOpenChange={setMultiOpen}
        onConfirm={asociarVarios}
        excludeIds={new Set(insumos.map((i) => i.producto_id))}
        title="Agregar insumos al equipo"
      />

      {/* Buscador para asociar uno */}
      <div className="relative">
        <div className="flex items-center gap-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-3">
          <Search className="h-4 w-4 text-muted-foreground shrink-0" />
          <Input
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Buscar producto para asociar..."
            className="border-0 focus-visible:ring-0 shadow-none px-0 h-9"
          />
          {guardando && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground shrink-0" />}
        </div>

        {busqueda.trim().length >= 2 && resultados?.data && (
          <div className="absolute z-20 mt-1 w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 shadow-lg max-h-60 overflow-auto">
            {resultados.data.length === 0 ? (
              <div className="p-3 text-sm text-muted-foreground">Sin resultados</div>
            ) : (
              resultados.data.map((p: any) => {
                const asoc = yaAsociados.has(p.id);
                return (
                  <button
                    key={p.id}
                    type="button"
                    disabled={asoc || guardando}
                    onClick={() => asociar(p.id)}
                    className="flex w-full items-center justify-between gap-2 p-2 text-left hover:bg-accent disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <div className="min-w-0">
                      <div className="text-sm font-medium truncate">{p.nombre}</div>
                      <div className="text-xs text-muted-foreground truncate">
                        {p.codigo || "s/código"} · stock {Number(p.stock_actual || 0)}
                      </div>
                    </div>
                    {asoc ? (
                      <Badge variant="secondary" className="text-[10px] shrink-0">ya está</Badge>
                    ) : (
                      <Plus className="h-4 w-4 text-primary shrink-0" />
                    )}
                  </button>
                );
              })
            )}
          </div>
        )}
      </div>

      {/* Contador + filtro (para equipos con muchos insumos) */}
      {(total > 0 || filtroAsoc) && (
        <div className="flex items-center justify-between gap-2">
          <span className="text-xs text-muted-foreground">
            {total} insumo{total !== 1 ? "s" : ""} asociado{total !== 1 ? "s" : ""}
            {insumos.length < total && ` · mostrando ${insumos.length}`}
          </span>
          {(total > 10 || filtroAsoc) && (
            <Input
              value={filtroAsoc}
              onChange={(e) => setFiltroAsoc(e.target.value)}
              placeholder="Filtrar asociados..."
              className="h-8 max-w-[200px] text-sm"
            />
          )}
        </div>
      )}

      {/* Lista de insumos asociados */}
      {isLoading ? (
        <div className="flex items-center justify-center py-6 text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin mr-2" /> Cargando insumos...
        </div>
      ) : insumos.length === 0 ? (
        filtroAsoc ? (
          <div className="text-center py-4 text-sm text-muted-foreground">
            Ningún insumo asociado coincide con &ldquo;{filtroAsoc}&rdquo;.
          </div>
        ) : (
          <div className="text-center py-6 text-sm text-muted-foreground">
            <Package className="h-6 w-6 mx-auto mb-2 opacity-40" />
            Sin insumos asociados. Buscá un producto arriba para agregarlo.
          </div>
        )
      ) : (
        <div className="space-y-2">
          {insumos.map((i) => (
            <div key={i.id} className="flex items-center gap-3 p-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
              <div className="flex-1 min-w-0">
                <div className="font-medium truncate flex items-center gap-2">
                  {i.nombre}
                  {i.es_recomendado && (
                    <Badge variant="secondary" className="text-[10px] gap-1 shrink-0">
                      <Star className="h-3 w-3 fill-amber-400 text-amber-400" /> recomendado
                    </Badge>
                  )}
                </div>
                <div className="text-xs text-muted-foreground truncate">
                  {i.codigo || "s/código"} · {fmtPrecio(i.precio_venta)} · stock {Number(i.stock_actual || 0)}
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                title={i.es_recomendado ? "Quitar recomendado" : "Marcar recomendado"}
                onClick={() => toggleRecomendado(i)}
              >
                <Star className={cn("h-4 w-4", i.es_recomendado ? "fill-amber-400 text-amber-400" : "text-muted-foreground")} />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/30"
                title="Quitar insumo"
                onClick={() => quitar(i)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
