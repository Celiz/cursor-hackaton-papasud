"use client";

import { useEffect, useMemo, useState } from "react";
import useSWR from "swr";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2, Package, Search, Wrench, X } from "lucide-react";
import { cn } from "@/lib/utils";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

interface Vinculacion {
  entidad_tipo: 'equipo' | 'producto';
  entidad_id: string;
}

interface VincularEntidadDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialVinculos: Vinculacion[];
  /** Devuelve el set completo de vinculaciones (la API hace replace, no merge). */
  onConfirm: (vinculaciones: Vinculacion[]) => Promise<void> | void;
}

type Tab = 'equipo' | 'producto';

// Picker dual de equipos y productos para vincular a un recurso de biblioteca.
// La API ya hace replace de todas las vinculaciones al PATCH — devolvemos el
// set completo, no un diff.
export function VincularEntidadDialog({
  open,
  onOpenChange,
  initialVinculos,
  onConfirm,
}: VincularEntidadDialogProps) {
  const [tab, setTab] = useState<Tab>('equipo');
  const [search, setSearch] = useState('');
  const [picked, setPicked] = useState<Vinculacion[]>(initialVinculos);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) setPicked(initialVinculos);
  }, [open, initialVinculos]);

  // Reset busqueda al cambiar tab para evitar confusion (no aplica a la otra lista).
  useEffect(() => {
    setSearch('');
  }, [tab]);

  const url = useMemo(() => {
    if (!open) return null;
    const path = tab === 'equipo' ? '/api/equipos' : '/api/productos';
    const params = new URLSearchParams();
    if (search.trim()) params.set('search', search.trim());
    if (tab === 'producto') params.set('pageSize', '100');
    const qs = params.toString();
    return qs ? `${path}?${qs}` : path;
  }, [open, tab, search]);

  const { data, isLoading } = useSWR<any>(url, fetcher, { revalidateOnFocus: false });
  const items: Array<{ id: string; label: string; sublabel?: string }> = useMemo(() => {
    if (!data) return [];
    // /api/equipos devuelve array; /api/productos devuelve { items, total, ... }
    const raw = Array.isArray(data) ? data : data.items || [];
    if (tab === 'equipo') {
      return raw.map((e: any) => ({
        id: e.id,
        label: `${e.marca || ''} ${e.modelo || ''}`.trim() || 'Sin nombre',
        sublabel: e.tipo,
      }));
    }
    return raw.map((p: any) => ({
      id: p.id,
      label: p.nombre || 'Sin nombre',
      sublabel: p.codigo || p.categoria,
    }));
  }, [data, tab]);

  const isPicked = (id: string) =>
    picked.some((v) => v.entidad_tipo === tab && v.entidad_id === id);

  const toggle = (id: string) => {
    setPicked((prev) => {
      const exists = prev.some((v) => v.entidad_tipo === tab && v.entidad_id === id);
      if (exists) {
        return prev.filter((v) => !(v.entidad_tipo === tab && v.entidad_id === id));
      }
      return [...prev, { entidad_tipo: tab, entidad_id: id }];
    });
  };

  const removePicked = (v: Vinculacion) => {
    setPicked((prev) =>
      prev.filter((x) => !(x.entidad_tipo === v.entidad_tipo && x.entidad_id === v.entidad_id))
    );
  };

  const handleConfirm = async () => {
    setSaving(true);
    try {
      await onConfirm(picked);
      onOpenChange(false);
    } finally {
      setSaving(false);
    }
  };

  const countEquipos = picked.filter((v) => v.entidad_tipo === 'equipo').length;
  const countProductos = picked.filter((v) => v.entidad_tipo === 'producto').length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Vincular a equipos o productos</DialogTitle>
          <DialogDescription>
            Un recurso puede asociarse a varios equipos y/o productos. Al guardar reemplaza el set completo.
          </DialogDescription>
        </DialogHeader>

        {picked.length > 0 && (
          <div className="flex flex-wrap gap-1.5 p-2 rounded-lg bg-blue-50/50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900/40">
            {picked.map((v) => (
              <Badge
                key={`${v.entidad_tipo}-${v.entidad_id}`}
                variant="outline"
                className="gap-1 bg-white dark:bg-gray-900"
              >
                {v.entidad_tipo === 'equipo' ? (
                  <Wrench className="h-3 w-3 text-blue-500" />
                ) : (
                  <Package className="h-3 w-3 text-emerald-500" />
                )}
                <span className="text-[10px] font-mono opacity-60">
                  {v.entidad_id.slice(0, 6)}
                </span>
                <button
                  type="button"
                  onClick={() => removePicked(v)}
                  className="text-muted-foreground hover:text-red-600 ml-0.5"
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            ))}
          </div>
        )}

        <div className="flex gap-1 border-b">
          <button
            type="button"
            onClick={() => setTab('equipo')}
            className={cn(
              'px-3 py-1.5 text-sm font-medium border-b-2 -mb-px transition-colors',
              tab === 'equipo'
                ? 'border-blue-500 text-blue-700 dark:text-blue-300'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            )}
          >
            <Wrench className="h-3.5 w-3.5 inline mr-1.5 -mt-0.5" />
            Equipos {countEquipos > 0 && <span className="text-[10px] opacity-70">({countEquipos})</span>}
          </button>
          <button
            type="button"
            onClick={() => setTab('producto')}
            className={cn(
              'px-3 py-1.5 text-sm font-medium border-b-2 -mb-px transition-colors',
              tab === 'producto'
                ? 'border-emerald-500 text-emerald-700 dark:text-emerald-300'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            )}
          >
            <Package className="h-3.5 w-3.5 inline mr-1.5 -mt-0.5" />
            Productos {countProductos > 0 && <span className="text-[10px] opacity-70">({countProductos})</span>}
          </button>
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={tab === 'equipo' ? 'Buscar por marca/modelo…' : 'Buscar producto…'}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>

        <ScrollArea className="h-[360px] rounded-lg border">
          {isLoading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : items.length === 0 ? (
            <div className="text-center py-12 text-sm text-muted-foreground">
              {search ? 'Sin resultados' : `No hay ${tab === 'equipo' ? 'equipos' : 'productos'}`}
            </div>
          ) : (
            <div className="divide-y">
              {items.map((it) => {
                const picked = isPicked(it.id);
                return (
                  <label
                    key={it.id}
                    className={cn(
                      'flex items-center gap-3 p-2.5 cursor-pointer hover:bg-accent/50 transition-colors',
                      picked && 'bg-blue-50/40 dark:bg-blue-950/20'
                    )}
                  >
                    <Checkbox
                      checked={picked}
                      onCheckedChange={() => toggle(it.id)}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{it.label}</p>
                      {it.sublabel && (
                        <p className="text-xs text-muted-foreground truncate">{it.sublabel}</p>
                      )}
                    </div>
                  </label>
                );
              })}
            </div>
          )}
        </ScrollArea>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancelar
          </Button>
          <Button onClick={handleConfirm} disabled={saving}>
            {saving && <Loader2 className="h-3.5 w-3.5 mr-2 animate-spin" />}
            Guardar ({picked.length})
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
