"use client";

import { useState } from "react";
import useSWR from "swr";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Search, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

export interface ProductoPick {
  id: string;
  nombre: string;
  codigo: string | null;
  precio_venta: number | null;
  precio_costo: number | null;
  stock_actual: number | null;
  marca_nombre?: string | null;
  moneda?: string | null;
}

const fetcher = (url: string) => fetch(url).then((r) => r.json());
const fmt = (n: number | null | undefined) =>
  n != null
    ? new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS" }).format(Number(n))
    : "—";

const pick = (p: any): ProductoPick => ({
  id: p.id,
  nombre: p.nombre,
  codigo: p.codigo ?? null,
  precio_venta: p.precio_venta ?? null,
  precio_costo: p.precio_costo ?? null,
  stock_actual: p.stock_actual ?? null,
  marca_nombre: p.marca_nombre ?? null,
  moneda: p.moneda ?? null,
});

/**
 * Diálogo reusable para seleccionar VARIOS productos de una.
 * Buscar por nombre/código + filtrar por marca + checkboxes + "Agregar (N)".
 */
export function ProductosMultiPicker({
  open,
  onOpenChange,
  onConfirm,
  excludeIds,
  title = "Agregar varios productos",
  confirmLabel = "Agregar",
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onConfirm: (productos: ProductoPick[]) => void;
  excludeIds?: Set<string>;
  title?: string;
  confirmLabel?: string;
}) {
  const [search, setSearch] = useState("");
  const [searchField, setSearchField] = useState<"all" | "codigo">("all");
  const [marca, setMarca] = useState("");
  const [sel, setSel] = useState<Record<string, ProductoPick>>({});

  const { data: marcas } = useSWR<any[]>(open ? "/api/marcas" : null, fetcher);

  const qs = new URLSearchParams({ pageSize: "40" });
  if (search.trim()) qs.set("search", search.trim());
  if (searchField === "codigo") qs.set("search_field", "codigo");
  if (marca) qs.set("marca", marca);
  const canQuery = open && (search.trim().length >= 2 || !!marca);
  const { data: resp, isLoading } = useSWR<{ data: any[] }>(
    canQuery ? `/api/productos?${qs.toString()}` : null,
    fetcher
  );
  const resultados: any[] = (resp?.data || []).filter((p) => !excludeIds?.has(p.id));

  const selCount = Object.keys(sel).length;
  const allSelected = resultados.length > 0 && resultados.every((p) => sel[p.id]);

  function toggle(p: any) {
    setSel((prev) => {
      const next = { ...prev };
      if (next[p.id]) delete next[p.id];
      else next[p.id] = pick(p);
      return next;
    });
  }

  function toggleTodos() {
    setSel((prev) => {
      const next = { ...prev };
      if (allSelected) resultados.forEach((p) => delete next[p.id]);
      else resultados.forEach((p) => { next[p.id] = pick(p); });
      return next;
    });
  }

  function cerrar(o: boolean) {
    if (!o) {
      setSel({});
      setSearch("");
      setMarca("");
      setSearchField("all");
    }
    onOpenChange(o);
  }

  function confirmar() {
    onConfirm(Object.values(sel));
    cerrar(false);
  }

  return (
    <Dialog open={open} onOpenChange={cerrar}>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>

        {/* Filtros */}
        <div className="space-y-2">
          <div className="flex flex-col sm:flex-row gap-2">
            <div className="flex items-center gap-2 flex-1 rounded-lg border border-gray-200 dark:border-gray-700 px-3">
              <Search className="h-4 w-4 text-muted-foreground shrink-0" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={searchField === "codigo" ? "Buscar por código..." : "Buscar por nombre o código..."}
                className="border-0 focus-visible:ring-0 shadow-none px-0 h-10"
                autoFocus
              />
            </div>
            <select
              value={marca}
              onChange={(e) => setMarca(e.target.value)}
              className="h-10 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-2 text-sm sm:max-w-[220px]"
            >
              <option value="">Todas las marcas</option>
              {(marcas || []).map((m: any) => (
                <option key={m.id || m.nombre} value={m.nombre}>
                  {m.nombre}
                </option>
              ))}
            </select>
          </div>
          {/* Modo de búsqueda: por nombre+código o exclusivo por código */}
          <div className="flex items-center gap-1.5 text-xs">
            <span className="text-muted-foreground">Buscar por:</span>
            <div className="inline-flex rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
              <button
                type="button"
                onClick={() => setSearchField("all")}
                className={cn("px-2.5 py-1", searchField === "all" ? "bg-primary text-primary-foreground" : "hover:bg-accent")}
              >
                Nombre y código
              </button>
              <button
                type="button"
                onClick={() => setSearchField("codigo")}
                className={cn("px-2.5 py-1 border-l border-gray-200 dark:border-gray-700", searchField === "codigo" ? "bg-primary text-primary-foreground" : "hover:bg-accent")}
              >
                Solo código
              </button>
            </div>
          </div>
        </div>

        {/* Contador + seleccionar todos */}
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>{selCount} seleccionado{selCount !== 1 ? "s" : ""}</span>
          {resultados.length > 0 && (
            <button type="button" onClick={toggleTodos} className="text-primary hover:underline">
              {allSelected ? "Quitar todos" : `Seleccionar todos (${resultados.length})`}
            </button>
          )}
        </div>

        {/* Resultados */}
        <div className="max-h-[60vh] min-h-[300px] overflow-auto rounded-lg border border-gray-200 dark:border-gray-700 divide-y divide-gray-100 dark:divide-gray-800">
          {!canQuery ? (
            <div className="p-6 text-center text-sm text-muted-foreground">
              Buscá por nombre/código o elegí una marca.
            </div>
          ) : isLoading ? (
            <div className="p-6 text-center">
              <Loader2 className="h-4 w-4 animate-spin mx-auto text-muted-foreground" />
            </div>
          ) : resultados.length === 0 ? (
            <div className="p-6 text-center text-sm text-muted-foreground">Sin resultados.</div>
          ) : (
            resultados.map((p) => (
              <label
                key={p.id}
                className={cn(
                  "flex items-center gap-3 p-3 cursor-pointer",
                  sel[p.id]
                    ? "bg-violet-50 dark:bg-violet-950/30"
                    : "hover:bg-gray-100 dark:hover:bg-gray-800/60"
                )}
              >
                <Checkbox checked={!!sel[p.id]} onCheckedChange={() => toggle(p)} />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium line-clamp-2">{p.nombre}</div>
                  <div className="text-xs text-muted-foreground truncate mt-0.5">
                    <span className="font-mono">{p.codigo || "s/código"}</span>
                    {p.marca_nombre ? ` · ${p.marca_nombre}` : ""} · stock {Number(p.stock_actual || 0)}
                  </div>
                </div>
                <div className="text-sm font-semibold shrink-0">{fmt(p.precio_venta)}</div>
              </label>
            ))
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => cerrar(false)}>Cancelar</Button>
          <Button disabled={selCount === 0} onClick={confirmar}>
            {confirmLabel} ({selCount})
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
