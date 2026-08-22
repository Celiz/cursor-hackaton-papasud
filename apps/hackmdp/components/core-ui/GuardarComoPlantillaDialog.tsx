"use client";
import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

/** Mini-diálogo para nombrar una plantilla al guardar la estructura de un presupuesto-equipo. */
export function GuardarComoPlantillaDialog({
  open,
  onOpenChange,
  onGuardar,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onGuardar: (nombre: string, categoria: string) => Promise<void>;
}) {
  const [nombre, setNombre] = useState("");
  const [categoria, setCategoria] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setNombre("");
      setCategoria("");
    }
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[420px]">
        <DialogHeader>
          <DialogTitle>Guardar como plantilla</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 py-2">
          <div className="space-y-1.5">
            <Label>Nombre *</Label>
            <Input
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              autoFocus
              placeholder="Ej: Diestro + insumos mensual"
            />
          </div>
          <div className="space-y-1.5">
            <Label>Categoría</Label>
            <Input
              value={categoria}
              onChange={(e) => setCategoria(e.target.value)}
              placeholder="(opcional)"
            />
          </div>
          <p className="text-xs text-muted-foreground">
            Se guarda la estructura (equipos, cantidades, condiciones y textos). Los precios se
            re-calculan del catálogo cada vez que crees un presupuesto desde esta plantilla.
          </p>
        </div>
        <DialogFooter>
          <Button variant="outline" type="button" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancelar
          </Button>
          <Button
            type="button"
            disabled={saving || !nombre.trim()}
            onClick={async () => {
              setSaving(true);
              try {
                await onGuardar(nombre.trim(), categoria.trim());
                onOpenChange(false);
              } finally {
                setSaving(false);
              }
            }}
          >
            {saving ? "Guardando..." : "Guardar plantilla"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
