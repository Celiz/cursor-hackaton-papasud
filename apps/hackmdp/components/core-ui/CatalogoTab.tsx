"use client";

import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Package,
  Search,
  Upload,
  Plus,
  MoreHorizontal,
  Edit,
  ToggleLeft,
  ToggleRight,
  PackagePlus,
  ExternalLink,
  Tag,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";
import { CatalogoItem } from "@/lib/types";
import { ImportCatalogoDialog } from "./ImportCatalogoDialog";
import { PromoverProductoDialog } from "./PromoverProductoDialog";
import { CatalogoItemFormDialog } from "./CatalogoItemFormDialog";
import { cn } from "@/lib/utils";
import useSWR from "swr";
import { formatCurrency } from "@/lib/format-currency";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

interface CatalogoTabProps {
  proveedorId: string;
  proveedorNombre: string;
}

export function CatalogoTab({ proveedorId, proveedorNombre }: CatalogoTabProps) {
  const [search, setSearch] = useState("");
  const [importOpen, setImportOpen] = useState(false);
  const [promoverItem, setPromoverItem] = useState<CatalogoItem | null>(null);
  const [formItem, setFormItem] = useState<CatalogoItem | null | undefined>(undefined);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  const { data: items = [], mutate, isLoading } = useSWR<CatalogoItem[]>(
    `/api/catalogo-items?proveedor_id=${proveedorId}`,
    fetcher,
    { dedupingInterval: 30000 }
  );

  const filtered = useMemo(() => {
    if (!search.trim()) return items;
    const q = search.toLowerCase();
    return items.filter(
      (item) =>
        item.nombre.toLowerCase().includes(q) ||
        item.codigo_proveedor?.toLowerCase().includes(q) ||
        item.categoria?.toLowerCase().includes(q)
    );
  }, [items, search]);

  const categorias = useMemo(() => {
    const set = new Set(items.map((i) => i.categoria).filter(Boolean));
    return set.size;
  }, [items]);

  const handleToggleActivo = async (item: CatalogoItem) => {
    setTogglingId(item.id);
    try {
      const res = await fetch("/api/catalogo-items", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: item.id, activo: !item.activo }),
      });
      if (!res.ok) throw new Error("Error al actualizar");
      toast.success(item.activo ? "Item desactivado" : "Item activado");
      mutate();
    } catch {
      toast.error("No se pudo actualizar el item");
    } finally {
      setTogglingId(null);
    }
  };

  return (
    <div className="h-full flex flex-col">
      {/* Toolbar */}
      <div className="flex items-center gap-2 mb-3">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por nombre, código o categoría..."
            className="pl-8 h-8 text-sm"
          />
        </div>
        <Button
          variant="outline"
          size="sm"
          className="gap-1.5 h-8 shrink-0"
          onClick={() => setImportOpen(true)}
        >
          <Upload className="h-3.5 w-3.5" />
          Importar
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="gap-1.5 h-8 shrink-0"
          onClick={() => setFormItem(null)}
        >
          <Plus className="h-3.5 w-3.5" />
          Agregar
        </Button>
      </div>

      {/* Stats line */}
      {!isLoading && items.length > 0 && (
        <p className="text-xs text-muted-foreground mb-3">
          {items.length} item{items.length !== 1 ? "s" : ""}
          {categorias > 0 ? `, ${categorias} categoría${categorias !== 1 ? "s" : ""}` : ""}
          {filtered.length !== items.length && (
            <span className="ml-1 text-blue-600 dark:text-blue-400">
              · mostrando {filtered.length}
            </span>
          )}
        </p>
      )}

      {/* List */}
      {isLoading ? (
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : filtered.length > 0 ? (
        <div className="flex-1 overflow-y-auto pr-1 min-h-0">
          <div className="space-y-1.5 pb-4">
            <AnimatePresence mode="popLayout">
              {filtered.map((item, index) => (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.02 }}
                  className={cn(
                    "p-3 rounded-lg border bg-white dark:bg-gray-900 hover:shadow-sm transition-shadow",
                    item.activo
                      ? "border-gray-200 dark:border-gray-800"
                      : "border-gray-100 dark:border-gray-900 opacity-60"
                  )}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        {item.codigo_proveedor && (
                          <Badge variant="outline" className="text-xs font-mono shrink-0">
                            {item.codigo_proveedor}
                          </Badge>
                        )}
                        <span className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                          {item.nombre}
                        </span>
                        {item.producto_id && (
                          <Badge className="text-xs bg-emerald-100 text-emerald-700 border-emerald-200 shrink-0">
                            Producto
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-3 mt-1">
                        {item.categoria && (
                          <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                            <Tag className="h-3 w-3" />
                            {item.categoria}
                          </span>
                        )}
                        {item.precio_costo != null && item.precio_costo > 0 && (
                          <span className="text-xs text-gray-600 dark:text-gray-400">
                            Costo: {formatCurrency(item.precio_costo)}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Actions */}
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 shrink-0"
                          disabled={togglingId === item.id}
                        >
                          {togglingId === item.id ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <MoreHorizontal className="h-3.5 w-3.5" />
                          )}
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-48">
                        <DropdownMenuItem
                          onClick={() => setFormItem(item)}
                          className="gap-2"
                        >
                          <Edit className="h-3.5 w-3.5" />
                          Editar
                        </DropdownMenuItem>

                        <DropdownMenuItem
                          onClick={() => handleToggleActivo(item)}
                          className="gap-2"
                        >
                          {item.activo ? (
                            <>
                              <ToggleLeft className="h-3.5 w-3.5" />
                              Desactivar
                            </>
                          ) : (
                            <>
                              <ToggleRight className="h-3.5 w-3.5" />
                              Activar
                            </>
                          )}
                        </DropdownMenuItem>

                        {!item.producto_id && (
                          <>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onClick={() => setPromoverItem(item)}
                              className="gap-2 text-emerald-700 dark:text-emerald-400"
                            >
                              <PackagePlus className="h-3.5 w-3.5" />
                              Crear como producto
                            </DropdownMenuItem>
                          </>
                        )}

                        {item.url_referencia && (
                          <>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem asChild className="gap-2">
                              <a
                                href={item.url_referencia}
                                target="_blank"
                                rel="noopener noreferrer"
                              >
                                <ExternalLink className="h-3.5 w-3.5" />
                                Ver en web
                              </a>
                            </DropdownMenuItem>
                          </>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </div>
      ) : (
        <div className="flex-1 flex items-center justify-center text-center text-muted-foreground">
          <div>
            <Package className="h-12 w-12 mx-auto mb-3 opacity-30" />
            {search ? (
              <>
                <p className="text-sm font-medium">Sin resultados</p>
                <p className="text-xs mt-1">
                  No hay items que coincidan con &ldquo;{search}&rdquo;
                </p>
              </>
            ) : (
              <>
                <p className="text-sm font-medium">Sin items en el catálogo</p>
                <p className="text-xs mt-1">
                  Importá un Excel o agregá items manualmente
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-4 gap-1.5"
                  onClick={() => setImportOpen(true)}
                >
                  <Upload className="h-3.5 w-3.5" />
                  Importar catálogo
                </Button>
              </>
            )}
          </div>
        </div>
      )}

      {/* Dialogs */}
      <ImportCatalogoDialog
        open={importOpen}
        onOpenChange={setImportOpen}
        proveedorId={proveedorId}
        proveedorNombre={proveedorNombre}
        onSuccess={() => mutate()}
      />

      <PromoverProductoDialog
        open={!!promoverItem}
        onOpenChange={(v) => !v && setPromoverItem(null)}
        item={promoverItem}
        onSuccess={() => mutate()}
      />

      <CatalogoItemFormDialog
        open={formItem !== undefined}
        onOpenChange={(v) => !v && setFormItem(undefined)}
        proveedorId={proveedorId}
        item={formItem}
        onSuccess={() => mutate()}
      />
    </div>
  );
}
