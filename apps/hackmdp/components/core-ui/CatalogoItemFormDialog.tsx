"use client";

import { useState, useEffect } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Loader2 } from "lucide-react";
import { CatalogoItem } from "@/lib/types";
import { toast } from "sonner";

interface CatalogoItemFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  proveedorId: string;
  item?: CatalogoItem | null;
  onSuccess: () => void;
}

export function CatalogoItemFormDialog({
  open, onOpenChange, proveedorId, item, onSuccess,
}: CatalogoItemFormDialogProps) {
  const isEdit = !!item?.id;
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    codigo_proveedor: "",
    nombre: "",
    descripcion: "",
    categoria: "",
    unidad: "",
    url_referencia: "",
  });

  useEffect(() => {
    if (item?.id) {
      setForm({
        codigo_proveedor: item.codigo_proveedor || "",
        nombre: item.nombre || "",
        descripcion: item.descripcion || "",
        categoria: item.categoria || "",
        unidad: item.unidad || "",
        url_referencia: item.url_referencia || "",
      });
    } else {
      setForm({ codigo_proveedor: "", nombre: "", descripcion: "", categoria: "", unidad: "", url_referencia: "" });
    }
  }, [item]);

  const handleSubmit = async () => {
    if (!form.nombre.trim()) {
      toast.error("El nombre es requerido");
      return;
    }

    setLoading(true);
    try {
      const url = "/api/catalogo-items";
      const method = isEdit ? "PATCH" : "POST";
      const body = isEdit
        ? { id: item!.id, ...form }
        : { proveedor_id: proveedorId, ...form };

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Error al guardar");
      }

      toast.success(isEdit ? "Item actualizado" : "Item creado");
      onSuccess();
      onOpenChange(false);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Editar item" : "Agregar item al catálogo"}</DialogTitle>
          <DialogDescription>
            {isEdit ? "Modificá los datos del item." : "Cargá un nuevo item manualmente."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-2">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>Código proveedor</Label>
              <Input
                value={form.codigo_proveedor}
                onChange={(e) => setForm({ ...form, codigo_proveedor: e.target.value })}
                placeholder="SKU-001"
              />
            </div>
            <div className="space-y-1">
              <Label>Unidad</Label>
              <Input
                value={form.unidad}
                onChange={(e) => setForm({ ...form, unidad: e.target.value })}
                placeholder="unidad, caja, ml..."
              />
            </div>
          </div>

          <div className="space-y-1">
            <Label>Nombre *</Label>
            <Input
              value={form.nombre}
              onChange={(e) => setForm({ ...form, nombre: e.target.value })}
              placeholder="Nombre del producto"
            />
          </div>

          <div className="space-y-1">
            <Label>Descripción</Label>
            <Textarea
              value={form.descripcion}
              onChange={(e) => setForm({ ...form, descripcion: e.target.value })}
              placeholder="Especificaciones, detalles..."
              rows={2}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>Categoría</Label>
              <Input
                value={form.categoria}
                onChange={(e) => setForm({ ...form, categoria: e.target.value })}
                placeholder="Tubos, Reactivos..."
              />
            </div>
            <div className="space-y-1">
              <Label>URL referencia</Label>
              <Input
                value={form.url_referencia}
                onChange={(e) => setForm({ ...form, url_referencia: e.target.value })}
                placeholder="https://..."
              />
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={loading || !form.nombre.trim()}>
            {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            {isEdit ? "Guardar" : "Agregar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
