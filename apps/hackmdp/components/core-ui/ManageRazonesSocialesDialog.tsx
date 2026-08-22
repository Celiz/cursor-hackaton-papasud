"use client";

import { useState, useCallback } from "react";
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
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  SearchableCombobox,
  ComboboxOption,
} from "@/components/ui/searchable-combobox";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import {
  Building2,
  Briefcase,
  Star,
  StarOff,
  Trash2,
  Plus,
  Loader2,
  Check,
  X,
} from "lucide-react";

interface ManageRazonesSocialesDialogProps {
  laboratorioId: string;
  laboratorioNombre: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Callback cuando se hizo cualquier cambio. Se usa para refrescar el detail sheet padre. */
  onChange?: () => void;
}

/**
 * Row devuelto por GET /api/laboratorios/[id]/razones-sociales.
 * Es un join de laboratorio_razones_sociales + clientes con los campos relevantes.
 */
interface RazonSocialLink {
  link_id: string;
  cliente_id: string;
  nombre: string;
  cuit: string | null;
  condicion_iva: string | null;
  es_principal: boolean;
  activo: boolean;
  ambito: string | null;
  notas: string | null;
  created_at: string;
  updated_at: string;
}

interface ClienteLite {
  id: string;
  nombre: string;
  cuit?: string | null;
}

const fetcher = async (url: string) => {
  const res = await fetch(url);
  const data = await res.json();
  if (!res.ok || data.error) throw new Error(data.error || "Error al cargar");
  return data;
};

/**
 * Dialog que muestra la lista completa de razones sociales vinculadas a un
 * laboratorio y permite:
 *   - Agregar una razón social nueva (busca clientes existentes)
 *   - Marcar como principal (promote)
 *   - Editar el ámbito inline (texto libre: "reactivos", "equipos", etc)
 *   - Desvincular (soft delete)
 *
 * La lista se filtra automáticamente: sólo muestra las activas por default,
 * con botón para mostrar también las inactivas históricas.
 */
export function ManageRazonesSocialesDialog({
  laboratorioId,
  laboratorioNombre,
  open,
  onOpenChange,
  onChange,
}: ManageRazonesSocialesDialogProps) {
  const [showInactive, setShowInactive] = useState(false);
  const [selectedClienteId, setSelectedClienteId] = useState<string>("");
  const [nuevoAmbito, setNuevoAmbito] = useState<string>("");
  const [loading, setLoading] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<RazonSocialLink | null>(null);

  // Estado para edición inline del ámbito
  const [editingAmbitoFor, setEditingAmbitoFor] = useState<string | null>(null);
  const [editingAmbitoValue, setEditingAmbitoValue] = useState("");

  const {
    data: links,
    mutate,
    isLoading,
  } = useSWR<RazonSocialLink[]>(
    open ? `/api/laboratorios/${laboratorioId}/razones-sociales` : null,
    fetcher
  );

  // Búsqueda async de clientes para el combobox "agregar razón social".
  // Excluye los que ya están vinculados (activos o inactivos) para evitar duplicados.
  const searchClientes = useCallback(
    async (qs: string): Promise<ComboboxOption[]> => {
      const params = new URLSearchParams({ limit: "30" });
      if (qs.trim()) params.set("search", qs.trim());
      const res = await fetch(`/api/clientes?${params.toString()}`);
      if (!res.ok) return [];
      const data: ClienteLite[] = await res.json();
      const vinculadosIds = new Set((links || []).map((l) => l.cliente_id));
      return (Array.isArray(data) ? data : [])
        .filter((c) => !vinculadosIds.has(c.id))
        .map((c) => ({
          value: c.id,
          label: c.nombre + (c.cuit ? ` · ${c.cuit}` : ""),
        }));
    },
    [links]
  );

  const handleAdd = async () => {
    if (!selectedClienteId) {
      toast.error("Seleccioná una empresa");
      return;
    }
    setLoading("add");
    try {
      const res = await fetch(
        `/api/laboratorios/${laboratorioId}/razones-sociales`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            cliente_id: selectedClienteId,
            ambito: nuevoAmbito.trim() || null,
          }),
        }
      );
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.error || "Error al vincular");
      }
      toast.success("Razón social vinculada");
      setSelectedClienteId("");
      setNuevoAmbito("");
      mutate();
      onChange?.();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error al vincular");
    } finally {
      setLoading(null);
    }
  };

  const handleSetPrincipal = async (link: RazonSocialLink) => {
    setLoading(link.link_id);
    try {
      const res = await fetch(
        `/api/laboratorios/${laboratorioId}/razones-sociales/${link.cliente_id}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ es_principal: true }),
        }
      );
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.error || "Error al marcar principal");
      }
      toast.success(`${link.nombre} marcada como principal`);
      mutate();
      onChange?.();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error");
    } finally {
      setLoading(null);
    }
  };

  const handleToggleActivo = async (link: RazonSocialLink) => {
    setLoading(link.link_id);
    try {
      const res = await fetch(
        `/api/laboratorios/${laboratorioId}/razones-sociales/${link.cliente_id}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ activo: !link.activo }),
        }
      );
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.error || "Error");
      }
      toast.success(link.activo ? "Desactivada" : "Reactivada");
      mutate();
      onChange?.();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error");
    } finally {
      setLoading(null);
    }
  };

  const handleSaveAmbito = async (link: RazonSocialLink) => {
    setLoading(link.link_id);
    try {
      const res = await fetch(
        `/api/laboratorios/${laboratorioId}/razones-sociales/${link.cliente_id}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ambito: editingAmbitoValue.trim() || null }),
        }
      );
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.error || "Error");
      }
      toast.success("Ámbito actualizado");
      setEditingAmbitoFor(null);
      setEditingAmbitoValue("");
      mutate();
      onChange?.();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error");
    } finally {
      setLoading(null);
    }
  };

  const handleDelete = async () => {
    if (!confirmDelete) return;
    setLoading(confirmDelete.link_id);
    try {
      const res = await fetch(
        `/api/laboratorios/${laboratorioId}/razones-sociales/${confirmDelete.cliente_id}`,
        { method: "DELETE" }
      );
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.error || "Error al desvincular");
      }
      toast.success("Desvinculada");
      mutate();
      onChange?.();
      setConfirmDelete(null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error");
    } finally {
      setLoading(null);
    }
  };

  const visibleLinks = (links || []).filter((l) =>
    showInactive ? true : l.activo
  );
  const inactiveCount = (links || []).filter((l) => !l.activo).length;

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[640px] max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Briefcase className="h-5 w-5 text-blue-600" />
              Razones sociales del laboratorio
            </DialogTitle>
            <DialogDescription>
              {laboratorioNombre} — gestioná qué empresas pueden facturar a este
              laboratorio. Una queda marcada como principal (la default al
              generar comprobantes).
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* Agregar nueva */}
            <div className="p-4 bg-muted/30 rounded-lg border space-y-3">
              <Label className="text-xs font-semibold uppercase text-muted-foreground">
                Agregar razón social
              </Label>
              <div className="flex gap-2 items-end flex-wrap">
                <div className="flex-1 min-w-[220px]">
                  <SearchableCombobox
                    value={selectedClienteId || undefined}
                    onValueChange={(v) => setSelectedClienteId(v || "")}
                    searchFn={searchClientes}
                    placeholder="Buscar empresa..."
                    emptyMessage="No hay coincidencias"
                  />
                </div>
                <Input
                  value={nuevoAmbito}
                  onChange={(e) => setNuevoAmbito(e.target.value)}
                  placeholder="Ámbito (opcional)"
                  className="w-40"
                />
                <Button
                  onClick={handleAdd}
                  disabled={loading === "add" || !selectedClienteId}
                  className="gap-2"
                >
                  {loading === "add" ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Plus className="h-4 w-4" />
                  )}
                  Vincular
                </Button>
              </div>
              <p className="text-[11px] text-muted-foreground">
                Ámbito: texto libre que describe para qué usar esta razón social.
                Ej: "reactivos", "equipos", "garantías", "servicio técnico".
              </p>
            </div>

            {/* Lista actual */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-semibold uppercase text-muted-foreground">
                  Vinculadas ({visibleLinks.length})
                </Label>
                {inactiveCount > 0 && (
                  <button
                    type="button"
                    onClick={() => setShowInactive((s) => !s)}
                    className="text-[11px] text-blue-600 hover:underline"
                  >
                    {showInactive
                      ? "Ocultar inactivas"
                      : `Mostrar ${inactiveCount} inactivas`}
                  </button>
                )}
              </div>

              {isLoading && (
                <div className="text-sm text-muted-foreground text-center py-6">
                  Cargando...
                </div>
              )}

              {!isLoading && visibleLinks.length === 0 && (
                <div className="text-sm text-muted-foreground text-center py-6 border border-dashed rounded-lg">
                  No hay razones sociales vinculadas.
                </div>
              )}

              {visibleLinks.map((link) => {
                const isEditing = editingAmbitoFor === link.link_id;
                return (
                  <div
                    key={link.link_id}
                    className={`p-3 rounded-lg border transition ${
                      link.activo
                        ? "bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800"
                        : "bg-gray-50 dark:bg-gray-900/50 border-gray-200 opacity-60"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <Building2 className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                          <span className="text-sm font-medium truncate">
                            {link.nombre}
                          </span>
                          {link.es_principal && (
                            <Badge
                              variant="outline"
                              className="bg-amber-100 text-amber-800 border-amber-200 gap-1 text-[10px]"
                            >
                              <Star className="h-2.5 w-2.5 fill-current" />
                              Principal
                            </Badge>
                          )}
                          {!link.activo && (
                            <Badge
                              variant="outline"
                              className="bg-gray-100 text-gray-600 text-[10px]"
                            >
                              Inactiva
                            </Badge>
                          )}
                        </div>
                        {link.cuit && (
                          <p className="text-[11px] text-muted-foreground font-mono ml-6 mt-0.5">
                            CUIT: {link.cuit}
                          </p>
                        )}

                        {/* Ámbito: editable inline */}
                        <div className="ml-6 mt-2">
                          {isEditing ? (
                            <div className="flex items-center gap-1">
                              <Input
                                value={editingAmbitoValue}
                                onChange={(e) =>
                                  setEditingAmbitoValue(e.target.value)
                                }
                                placeholder="Ámbito..."
                                className="h-7 text-xs"
                                autoFocus
                                onKeyDown={(e) => {
                                  if (e.key === "Enter") handleSaveAmbito(link);
                                  if (e.key === "Escape") {
                                    setEditingAmbitoFor(null);
                                    setEditingAmbitoValue("");
                                  }
                                }}
                              />
                              <Button
                                type="text"
                                size="tiny"
                                onClick={() => handleSaveAmbito(link)}
                                disabled={loading === link.link_id}
                              >
                                <Check className="h-3 w-3" />
                              </Button>
                              <Button
                                type="text"
                                size="tiny"
                                onClick={() => {
                                  setEditingAmbitoFor(null);
                                  setEditingAmbitoValue("");
                                }}
                              >
                                <X className="h-3 w-3" />
                              </Button>
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() => {
                                setEditingAmbitoFor(link.link_id);
                                setEditingAmbitoValue(link.ambito || "");
                              }}
                              className="text-[11px] text-muted-foreground hover:text-foreground transition"
                            >
                              Ámbito:{" "}
                              <span className="underline decoration-dotted">
                                {link.ambito || "sin definir"}
                              </span>
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Acciones */}
                      <div className="flex items-center gap-1 flex-shrink-0">
                        {link.activo && !link.es_principal && (
                          <Button
                            type="text"
                            size="tiny"
                            onClick={() => handleSetPrincipal(link)}
                            disabled={loading === link.link_id}
                            title="Marcar como principal"
                          >
                            {loading === link.link_id ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                              <StarOff className="h-3.5 w-3.5" />
                            )}
                          </Button>
                        )}
                        {!link.activo && (
                          <Button
                            type="text"
                            size="tiny"
                            onClick={() => handleToggleActivo(link)}
                            disabled={loading === link.link_id}
                            title="Reactivar"
                          >
                            <Check className="h-3.5 w-3.5" />
                          </Button>
                        )}
                        <Button
                          type="text"
                          size="tiny"
                          onClick={() => setConfirmDelete(link)}
                          disabled={loading === link.link_id}
                          title={link.activo ? "Desvincular" : "Borrar definitivamente"}
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <DialogFooter>
            <Button type="outline" onClick={() => onOpenChange(false)}>
              Cerrar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirmación de borrado — la principal con otras vinculadas no se puede
          quitar, el backend devuelve 409 y mostramos el error. */}
      <AlertDialog open={!!confirmDelete} onOpenChange={(o) => !o && setConfirmDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Desvincular razón social?</AlertDialogTitle>
            <AlertDialogDescription>
              {confirmDelete?.activo ? (
                <>
                  Se marcará como inactiva la vinculación de{" "}
                  <strong>{confirmDelete?.nombre}</strong> con este laboratorio.
                  Las operaciones históricas permanecen intactas. Podés
                  reactivarla después.
                </>
              ) : (
                <>
                  Ya está inactiva. Cerrar este diálogo o eliminar definitivamente.
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-red-600 hover:bg-red-700"
            >
              {loading === confirmDelete?.link_id ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : null}
              Desvincular
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
