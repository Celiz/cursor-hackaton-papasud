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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import type { CrmActividad } from "@/lib/types";

/** Normaliza fecha_limite ('YYYY-MM-DD' o ISO) a 'YYYY-MM-DD' para el input date. */
function toYmd(v?: string | null): string {
  if (!v) return "";
  const s = String(v);
  return s.length >= 10 ? s.slice(0, 10) : s;
}

// ============ Editar actividad ============
export function EditarActividadDialog({
  open,
  onOpenChange,
  actividad,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  actividad: CrmActividad | null;
  onSaved: () => void;
}) {
  const [titulo, setTitulo] = useState("");
  const [fechaLimite, setFechaLimite] = useState("");
  const [hora, setHora] = useState("");
  const [prioridad, setPrioridad] = useState("normal");
  const [nota, setNota] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open && actividad) {
      setTitulo(actividad.titulo || "");
      setFechaLimite(toYmd(actividad.fecha_limite));
      setHora(actividad.hora ? String(actividad.hora).slice(0, 5) : "");
      setPrioridad(actividad.prioridad || "normal");
      setNota(actividad.nota || "");
    }
  }, [open, actividad?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const guardar = async () => {
    if (!actividad) return;
    if (!fechaLimite) {
      toast.error("La fecha límite es obligatoria");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/crm/actividades-programadas", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: actividad.id,
          titulo: titulo.trim() || null,
          fecha_limite: fechaLimite,
          hora: hora || null,
          prioridad,
          nota: nota.trim() || null,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || `HTTP ${res.status}`);
      }
      toast.success("Actividad actualizada");
      onSaved();
      onOpenChange(false);
    } catch (e: any) {
      toast.error(e.message || "No se pudo actualizar la actividad");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Editar actividad</DialogTitle>
          <DialogDescription>Modificá el nombre, la fecha y demás datos.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3 py-2">
          <div>
            <Label className="text-xs">Nombre</Label>
            <Input
              value={titulo}
              onChange={(e) => setTitulo(e.target.value)}
              placeholder="Nombre de la actividad"
              className="mt-1"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Fecha límite</Label>
              <Input type="date" value={fechaLimite} onChange={(e) => setFechaLimite(e.target.value)} className="mt-1" />
            </div>
            <div>
              <Label className="text-xs">Hora</Label>
              <Input type="time" value={hora} onChange={(e) => setHora(e.target.value)} className="mt-1" />
            </div>
          </div>
          <div>
            <Label className="text-xs">Prioridad</Label>
            <Select value={prioridad} onValueChange={setPrioridad}>
              <SelectTrigger className="mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="baja">Baja</SelectItem>
                <SelectItem value="normal">Normal</SelectItem>
                <SelectItem value="alta">Alta</SelectItem>
                <SelectItem value="urgente">Urgente</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">Nota</Label>
            <Textarea value={nota} onChange={(e) => setNota(e.target.value)} rows={2} className="mt-1 resize-none" placeholder="Detalle (opcional)" />
          </div>
        </div>
        <DialogFooter>
          <Button htmlType="button" type="outline" disabled={saving} onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button htmlType="button" type="primary" loading={saving} onClick={guardar}>
            Guardar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ============ Completar actividad con comentario ============
export function CompletarActividadDialog({
  open,
  onOpenChange,
  actividad,
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  actividad: CrmActividad | null;
  /** Recibe el comentario de finalización (puede ser ''). */
  onConfirm: (comentario: string) => Promise<void> | void;
}) {
  const [comentario, setComentario] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) setComentario("");
  }, [open, actividad?.id]);

  const confirmar = async () => {
    setSaving(true);
    try {
      await onConfirm(comentario.trim());
      onOpenChange(false);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Completar actividad</DialogTitle>
          <DialogDescription>
            {actividad?.titulo ? `"${actividad.titulo}". ` : ""}Podés dejar un comentario de
            finalización (queda en la actividad y en el historial).
          </DialogDescription>
        </DialogHeader>
        <div className="py-2">
          <Label className="text-xs">Comentario de finalización (opcional)</Label>
          <Textarea
            autoFocus
            value={comentario}
            onChange={(e) => setComentario(e.target.value)}
            rows={3}
            className="mt-1 resize-none"
            placeholder="Ej: el cliente confirmó la compra…"
          />
        </div>
        <DialogFooter>
          <Button htmlType="button" type="outline" disabled={saving} onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button htmlType="button" type="success" loading={saving} onClick={confirmar}>
            Marcar completada
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
