"use client";

import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { EspecificacionesEditor } from "@/components/core-ui/EspecificacionesEditor";
import { RotateCcw, AlertTriangle } from "lucide-react";
import { toast } from "sonner";

type EspecificacionesValue = Record<string, unknown> | string[];

export interface PresupuestoItemSpecs {
  id: string;
  equipo_id?: string | null;
  descripcion?: string | null;
  especificaciones?: EspecificacionesValue | null;
  especificaciones_personalizada?: boolean | null;
  equipo_especificaciones?: EspecificacionesValue | null;
  equipo_categoria?: string | null;
}

export interface EspecificacionesItemSaved {
  item_id: string;
  especificaciones: EspecificacionesValue | null;
  especificaciones_personalizada: boolean;
  /** Presente solo cuando se guardó en el catálogo: las nuevas specs del equipo,
   * para que el detail sheet refleje el cambio sin F5. */
  catalogo_especificaciones?: EspecificacionesValue | null;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item: PresupuestoItemSpecs | null;
  /** Se llama tras guardar con el resultado, para reflejarlo en el detail sheet
   * (override local) y/o refetchear. */
  onSaved: (result: EspecificacionesItemSaved) => void;
}

function resolverSeed(item: PresupuestoItemSpecs | null): EspecificacionesValue {
  if (!item) return {};
  const base = item.especificaciones_personalizada
    ? item.especificaciones
    : item.equipo_especificaciones;
  return (base ?? {}) as EspecificacionesValue;
}

export function EspecificacionesItemDialog({ open, onOpenChange, item, onSaved }: Props) {
  const [specs, setSpecs] = useState<EspecificacionesValue>({});
  const [saving, setSaving] = useState(false);
  const [confirmCatalogo, setConfirmCatalogo] = useState(false);

  // Sembrar el editor con las specs resueltas (override del presupuesto, o las
  // del catálogo del equipo si todavía no se personalizó) cada vez que se abre.
  useEffect(() => {
    if (open) {
      setSpecs(resolverSeed(item));
      setConfirmCatalogo(false);
    }
  }, [open, item?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const patch = async (payload: { especificaciones: EspecificacionesValue | null; personalizada: boolean }) => {
    if (!item) return;
    setSaving(true);
    try {
      const res = await fetch("/api/presupuestos-equipos/items", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          item_id: item.id,
          especificaciones: payload.especificaciones,
          especificaciones_personalizada: payload.personalizada,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || `HTTP ${res.status}`);
      }
      toast.success(payload.personalizada ? "Especificaciones guardadas" : "Volviste a las del catálogo");
      onSaved({
        item_id: item.id,
        especificaciones: payload.personalizada ? payload.especificaciones : null,
        especificaciones_personalizada: payload.personalizada,
      });
      onOpenChange(false);
    } catch (e: any) {
      toast.error(e.message || "No se pudieron guardar las especificaciones");
    } finally {
      setSaving(false);
    }
  };

  // Guardar en el CATÁLOGO del equipo: sobreescribe equipos.especificaciones y deja
  // este presupuesto heredando del catálogo (ya actualizado). Afecta presupuestos futuros.
  const saveToCatalogo = async () => {
    if (!item) return;
    if (!item.equipo_id) {
      toast.error("Este ítem no está vinculado a un equipo del catálogo");
      return;
    }
    setSaving(true);
    try {
      const r1 = await fetch(`/api/equipos/${item.equipo_id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ especificaciones: specs }),
      });
      if (!r1.ok) {
        const err = await r1.json().catch(() => ({}));
        throw new Error(err.error || `HTTP ${r1.status}`);
      }
      // El presupuesto vuelve a heredar del catálogo (que ahora tiene las nuevas specs).
      const r2 = await fetch("/api/presupuestos-equipos/items", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          item_id: item.id,
          especificaciones: null,
          especificaciones_personalizada: false,
        }),
      });
      if (!r2.ok) {
        const err = await r2.json().catch(() => ({}));
        throw new Error(err.error || `HTTP ${r2.status}`);
      }
      toast.success("Guardado en el catálogo del equipo");
      onSaved({
        item_id: item.id,
        especificaciones: null,
        especificaciones_personalizada: false,
        catalogo_especificaciones: specs,
      });
      onOpenChange(false);
    } catch (e: any) {
      toast.error(e.message || "No se pudo guardar en el catálogo");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[85vh] flex flex-col p-0">
        <DialogHeader className="px-6 pt-6 pb-4 border-b">
          <DialogTitle>Especificaciones — {item?.descripcion || "Equipo"}</DialogTitle>
          <DialogDescription>
            Por defecto se guardan solo en este presupuesto (PDF y envío). También
            podés guardarlas en el catálogo del equipo, lo que afecta a los
            presupuestos futuros.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-6 py-4">
          <EspecificacionesEditor
            value={specs}
            onChange={setSpecs}
            categoria={item?.equipo_categoria || undefined}
            disabled={saving}
          />
        </div>

        {confirmCatalogo ? (
          <div className="px-6 py-4 border-t bg-amber-50 dark:bg-amber-950/30 space-y-3">
            <div className="flex items-start gap-2.5">
              <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
              <div className="text-sm text-amber-800 dark:text-amber-200">
                <p className="font-semibold">Vas a sobreescribir las especificaciones del equipo en el catálogo.</p>
                <p className="text-xs mt-0.5">
                  Reemplaza las del catálogo de <strong>{item?.descripcion || "este equipo"}</strong> y
                  afecta a <strong>todos los presupuestos futuros</strong> de ese equipo. No se puede deshacer.
                </p>
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button htmlType="button" type="outline" disabled={saving} onClick={() => setConfirmCatalogo(false)}>
                Cancelar
              </Button>
              <Button
                htmlType="button"
                type="primary"
                loading={saving}
                className="!bg-amber-600 hover:!bg-amber-700 !border-amber-600"
                onClick={saveToCatalogo}
              >
                Sí, sobreescribir el equipo
              </Button>
            </div>
          </div>
        ) : (
          <DialogFooter className="px-6 py-4 border-t bg-muted/20 flex items-center justify-between gap-2">
            <div>
              {item?.especificaciones_personalizada && (
                <Button
                  htmlType="button"
                  type="text"
                  size="small"
                  disabled={saving}
                  onClick={() => patch({ especificaciones: null, personalizada: false })}
                >
                  <RotateCcw className="h-4 w-4 mr-1.5" />
                  Volver al catálogo
                </Button>
              )}
            </div>
            <div className="flex gap-2">
              <Button htmlType="button" type="outline" disabled={saving} onClick={() => onOpenChange(false)}>
                Cancelar
              </Button>
              {item?.equipo_id && (
                <Button
                  htmlType="button"
                  type="default"
                  disabled={saving}
                  onClick={() => setConfirmCatalogo(true)}
                >
                  Guardar en catálogo
                </Button>
              )}
              <Button
                htmlType="button"
                type="primary"
                loading={saving}
                onClick={() => patch({ especificaciones: specs, personalizada: true })}
              >
                Guardar en presupuesto
              </Button>
            </div>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}
