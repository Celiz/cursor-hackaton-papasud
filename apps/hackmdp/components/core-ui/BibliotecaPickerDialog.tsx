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
import { FileText, Link as LinkIcon, Loader2, Search, X } from "lucide-react";
import { BibliotecaRecurso } from "@/lib/types";
import { cn } from "@/lib/utils";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

interface BibliotecaPickerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** IDs ya seleccionados (para preselect). */
  selectedIds: string[];
  /** Se llama al confirmar con los IDs seleccionados (incluyendo los previos que el usuario mantuvo). */
  onConfirm: (recursos: BibliotecaRecurso[]) => void;
  /** Texto del header. */
  title?: string;
  /** Subtitulo opcional. */
  description?: string;
}

// Picker generico de recursos de la biblioteca: lista filtrable + multi-select.
// Pensado para integrarse en otros forms (e.g. adjuntar documentos a un presupuesto).
export function BibliotecaPickerDialog({
  open,
  onOpenChange,
  selectedIds,
  onConfirm,
  title = "Agregar de la biblioteca",
  description = "Elegí los documentos que querés adjuntar a este presupuesto.",
}: BibliotecaPickerDialogProps) {
  const [search, setSearch] = useState("");
  const [picked, setPicked] = useState<Set<string>>(new Set(selectedIds));

  useEffect(() => {
    if (open) setPicked(new Set(selectedIds));
  }, [open, selectedIds]);

  const queryUrl = useMemo(() => {
    const params = new URLSearchParams();
    if (search.trim()) params.set("search", search.trim());
    params.set("limit", "200");
    return `/api/biblioteca/recursos?${params.toString()}`;
  }, [search]);

  const { data: recursos = [], isLoading } = useSWR<BibliotecaRecurso[]>(
    open ? queryUrl : null,
    fetcher,
    { revalidateOnFocus: false }
  );

  const toggle = (id: string) => {
    setPicked((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleConfirm = () => {
    const seleccionados = recursos.filter((r) => picked.has(r.id));
    onConfirm(seleccionados);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por título o tag…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          <ScrollArea className="h-[420px] rounded-lg border">
            {isLoading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : recursos.length === 0 ? (
              <div className="text-center py-12 text-sm text-muted-foreground">
                <FileText className="h-10 w-10 mx-auto mb-2 opacity-40" />
                <p>{search ? "Sin resultados" : "No hay documentos en la biblioteca"}</p>
              </div>
            ) : (
              <div className="divide-y">
                {recursos.map((r) => {
                  const isPicked = picked.has(r.id);
                  return (
                    <label
                      key={r.id}
                      htmlFor={`recurso-${r.id}`}
                      className={cn(
                        "flex items-start gap-3 p-3 cursor-pointer hover:bg-accent/50 transition-colors",
                        isPicked && "bg-emerald-50/40 dark:bg-emerald-950/20"
                      )}
                    >
                      <Checkbox
                        id={`recurso-${r.id}`}
                        checked={isPicked}
                        onCheckedChange={() => toggle(r.id)}
                        className="mt-0.5"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          {r.archivo_url ? (
                            <FileText className="h-4 w-4 text-blue-500 shrink-0" />
                          ) : (
                            <LinkIcon className="h-4 w-4 text-purple-500 shrink-0" />
                          )}
                          <p className="text-sm font-medium truncate">{r.titulo}</p>
                        </div>
                        {r.descripcion && (
                          <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">
                            {r.descripcion}
                          </p>
                        )}
                        <div className="flex items-center flex-wrap gap-1.5 mt-1">
                          {r.categoria_nombre && (
                            <Badge variant="outline" className="text-[10px] h-4 px-1.5">
                              {r.categoria_nombre}
                            </Badge>
                          )}
                          {r.tipo && (
                            <Badge variant="outline" className="text-[10px] h-4 px-1.5">
                              {r.tipo}
                            </Badge>
                          )}
                          {r.formato && (
                            <span className="text-[10px] text-muted-foreground uppercase">
                              {r.formato}
                            </span>
                          )}
                        </div>
                      </div>
                    </label>
                  );
                })}
              </div>
            )}
          </ScrollArea>

          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>
              {picked.size} seleccionado{picked.size !== 1 ? "s" : ""}
            </span>
            <span>
              {recursos.length} total{recursos.length !== 1 ? "es" : ""}
            </span>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleConfirm}>
            Adjuntar {picked.size > 0 && `(${picked.size})`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
