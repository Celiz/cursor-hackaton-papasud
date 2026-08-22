"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
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
import { PlanMantenimiento } from "@/app/dashboard/mantenimiento/planes/columns";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

interface PlanMantenimientoFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  plan?: PlanMantenimiento | null;
  onSuccess?: () => void;
}

const initialForm = {
  codigo: "",
  nombre: "",
  descripcion: "",
  tipo: "preventivo",
  categoria: "",
  frecuencia_tipo: "meses",
  frecuencia_valor: 6,
  duracion_estimada_horas: "",
  tecnicos_requeridos: 1,
  costo_mano_obra_estimado: "",
  costo_repuestos_estimado: "",
};

export function PlanMantenimientoFormDialog({
  open,
  onOpenChange,
  plan,
  onSuccess,
}: PlanMantenimientoFormDialogProps) {
  const [form, setForm] = useState(initialForm);
  const [saving, setSaving] = useState(false);
  const isEditing = !!plan;

  useEffect(() => {
    if (plan) {
      setForm({
        codigo: plan.codigo || "",
        nombre: plan.nombre || "",
        descripcion: plan.descripcion || "",
        tipo: plan.tipo || "preventivo",
        categoria: plan.categoria || "",
        frecuencia_tipo: plan.frecuencia_tipo || "meses",
        frecuencia_valor: plan.frecuencia_valor || 6,
        duracion_estimada_horas: plan.duracion_estimada_horas?.toString() || "",
        tecnicos_requeridos: plan.tecnicos_requeridos || 1,
        costo_mano_obra_estimado: plan.costo_mano_obra_estimado?.toString() || "",
        costo_repuestos_estimado: plan.costo_repuestos_estimado?.toString() || "",
      });
    } else {
      setForm(initialForm);
    }
  }, [plan, open]);

  const handleChange = (field: string, value: string | number) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!form.codigo || !form.nombre || !form.tipo || !form.frecuencia_tipo || !form.frecuencia_valor) {
      toast.error("Código, nombre, tipo y frecuencia son requeridos");
      return;
    }

    setSaving(true);
    try {
      const body: Record<string, unknown> = {
        codigo: form.codigo,
        nombre: form.nombre,
        descripcion: form.descripcion || null,
        tipo: form.tipo,
        categoria: form.categoria || null,
        frecuencia_tipo: form.frecuencia_tipo,
        frecuencia_valor: Number(form.frecuencia_valor),
        duracion_estimada_horas: form.duracion_estimada_horas ? Number(form.duracion_estimada_horas) : null,
        tecnicos_requeridos: Number(form.tecnicos_requeridos) || 1,
        costo_mano_obra_estimado: form.costo_mano_obra_estimado ? Number(form.costo_mano_obra_estimado) : null,
        costo_repuestos_estimado: form.costo_repuestos_estimado ? Number(form.costo_repuestos_estimado) : null,
      };

      if (isEditing) {
        body.id = plan!.id;
      }

      const res = await fetch("/api/mantenimiento/planes", {
        method: isEditing ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Error al guardar plan");
      }

      toast.success(isEditing ? "Plan actualizado" : "Plan creado");
      onSuccess?.();
      onOpenChange(false);
    } catch (error: any) {
      toast.error(error.message || "Error al guardar");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? "Editar" : "Crear"} Plan de Mantenimiento
          </DialogTitle>
          <DialogDescription>
            {isEditing
              ? `Editando plan: ${plan!.nombre}`
              : "Crear un nuevo plan de mantenimiento"}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Código y Nombre */}
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="pm-codigo">Código *</Label>
              <Input
                id="pm-codigo"
                placeholder="PM-001"
                value={form.codigo}
                onChange={(e) => handleChange("codigo", e.target.value)}
                required
              />
            </div>
            <div className="col-span-2 space-y-1.5">
              <Label htmlFor="pm-nombre">Nombre *</Label>
              <Input
                id="pm-nombre"
                placeholder="Mantenimiento preventivo trimestral"
                value={form.nombre}
                onChange={(e) => handleChange("nombre", e.target.value)}
                required
              />
            </div>
          </div>

          {/* Descripción */}
          <div className="space-y-1.5">
            <Label htmlFor="pm-descripcion">Descripción</Label>
            <Textarea
              id="pm-descripcion"
              placeholder="Detalle del plan de mantenimiento..."
              value={form.descripcion}
              onChange={(e) => handleChange("descripcion", e.target.value)}
              rows={2}
            />
          </div>

          {/* Tipo y Categoría */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Tipo *</Label>
              <Select value={form.tipo} onValueChange={(v) => handleChange("tipo", v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="preventivo">Preventivo</SelectItem>
                  <SelectItem value="correctivo">Correctivo</SelectItem>
                  <SelectItem value="predictivo">Predictivo</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="pm-categoria">Categoría</Label>
              <Input
                id="pm-categoria"
                placeholder="Ej: equipos_medicos"
                value={form.categoria}
                onChange={(e) => handleChange("categoria", e.target.value)}
              />
            </div>
          </div>

          {/* Frecuencia */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Frecuencia *</Label>
              <Select
                value={form.frecuencia_tipo}
                onValueChange={(v) => handleChange("frecuencia_tipo", v)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="dias">Días</SelectItem>
                  <SelectItem value="meses">Meses</SelectItem>
                  <SelectItem value="años">Años</SelectItem>
                  <SelectItem value="horas_uso">Horas de uso</SelectItem>
                  <SelectItem value="kilometros">Kilómetros</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="pm-frecuencia-valor">Cada *</Label>
              <Input
                id="pm-frecuencia-valor"
                type="number"
                min={1}
                value={form.frecuencia_valor}
                onChange={(e) => handleChange("frecuencia_valor", e.target.value)}
                required
              />
            </div>
          </div>

          {/* Duración y Técnicos */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="pm-duracion">Duración estimada (horas)</Label>
              <Input
                id="pm-duracion"
                type="number"
                min={0}
                step={0.5}
                placeholder="Ej: 2"
                value={form.duracion_estimada_horas}
                onChange={(e) => handleChange("duracion_estimada_horas", e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="pm-tecnicos">Técnicos requeridos</Label>
              <Input
                id="pm-tecnicos"
                type="number"
                min={1}
                value={form.tecnicos_requeridos}
                onChange={(e) => handleChange("tecnicos_requeridos", e.target.value)}
              />
            </div>
          </div>

          {/* Costos */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="pm-costo-mo">Costo mano de obra ($)</Label>
              <Input
                id="pm-costo-mo"
                type="number"
                min={0}
                step={100}
                placeholder="0"
                value={form.costo_mano_obra_estimado}
                onChange={(e) => handleChange("costo_mano_obra_estimado", e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="pm-costo-rep">Costo repuestos ($)</Label>
              <Input
                id="pm-costo-rep"
                type="number"
                min={0}
                step={100}
                placeholder="0"
                value={form.costo_repuestos_estimado}
                onChange={(e) => handleChange("costo_repuestos_estimado", e.target.value)}
              />
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={saving}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {isEditing ? "Guardar cambios" : "Crear plan"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
