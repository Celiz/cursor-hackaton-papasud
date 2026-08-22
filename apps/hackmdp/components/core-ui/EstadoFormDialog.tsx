"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

interface EstadoFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  estado?: any | null;
  tipo: "servicio" | "contable";
  onSuccess: () => void;
}

const colorOptions = [
  { value: "success", label: "Verde (Éxito)", preview: "success" },
  { value: "warning", label: "Amarillo (Advertencia)", preview: "warning" },
  { value: "info", label: "Azul (Información)", preview: "info" },
  { value: "purple", label: "Morado", preview: "purple" },
  { value: "destructive", label: "Rojo (Peligro)", preview: "destructive" },
  { value: "default", label: "Primario", preview: "default" },
  { value: "secondary", label: "Secundario", preview: "secondary" },
  { value: "outline", label: "Contorno", preview: "outline" },
];

const iconOptions = [
  "CheckCircle",
  "CheckCircle2",
  "CircleCheckBig",
  "AlertCircle",
  "Clock",
  "Truck",
  "Package",
  "FileText",
  "DollarSign",
  "Wrench",
  "XCircle",
  "ArrowUpIcon",
  "Info",
];

export function EstadoFormDialog({
  open,
  onOpenChange,
  estado,
  tipo,
  onSuccess,
}: EstadoFormDialogProps) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    label: "",
    value: "",
    color: "default",
    icon: "",
  });

  useEffect(() => {
    if (estado) {
      setFormData({
        label: estado.label || "",
        value: estado.value || "",
        color: estado.color || "default",
        icon: estado.icon || "",
      });
    } else {
      setFormData({
        label: "",
        value: "",
        color: "default",
        icon: "",
      });
    }
  }, [estado, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.label || !formData.value || !formData.color) {
      toast.error("Por favor completa todos los campos requeridos");
      return;
    }

    setLoading(true);

    try {
      const url = "/api/configuracion/estados";
      const method = estado ? "PATCH" : "POST";
      const body = estado
        ? { id: estado.id, ...formData }
        : { tipo, ...formData };

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Error al guardar estado");
      }

      toast.success(
        estado ? "Estado actualizado correctamente" : "Estado creado correctamente"
      );
      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      console.error("Error saving estado:", error);
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  // Auto-generar value desde label
  const handleLabelChange = (label: string) => {
    setFormData({
      ...formData,
      label,
      value: !estado ? label : formData.value, // Solo auto-generar en creación
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>
              {estado ? "Editar Estado" : "Nuevo Estado"}
            </DialogTitle>
            <DialogDescription>
              {estado
                ? "Modifica la información del estado"
                : `Crea un nuevo estado ${tipo === "servicio" ? "de servicio" : "contable"}`}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Label */}
            <div className="space-y-2">
              <Label htmlFor="label">
                Nombre del estado <span className="text-destructive">*</span>
              </Label>
              <Input
                id="label"
                value={formData.label}
                onChange={(e) => handleLabelChange(e.target.value)}
                placeholder="Ej: En reparación"
                required
              />
            </div>

            {/* Value */}
            <div className="space-y-2">
              <Label htmlFor="value">
                Valor (identificador único) <span className="text-destructive">*</span>
              </Label>
              <Input
                id="value"
                value={formData.value}
                onChange={(e) =>
                  setFormData({ ...formData, value: e.target.value })
                }
                placeholder="Ej: En reparación"
                required
                disabled={!!estado} // No permitir cambiar el value en edición
              />
              {estado && (
                <p className="text-xs text-muted-foreground">
                  El valor no se puede modificar para mantener la consistencia
                </p>
              )}
            </div>

            {/* Color */}
            <div className="space-y-2">
              <Label htmlFor="color">
                Color <span className="text-destructive">*</span>
              </Label>
              <Select
                value={formData.color}
                onValueChange={(value) =>
                  setFormData({ ...formData, color: value })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {colorOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      <div className="flex items-center gap-2">
                        <Badge variant={option.preview as any}>
                          {option.label}
                        </Badge>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Icon */}
            <div className="space-y-2">
              <Label htmlFor="icon">Icono (opcional)</Label>
              <Select
                value={formData.icon}
                onValueChange={(value) =>
                  setFormData({ ...formData, icon: value })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar icono..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Sin icono</SelectItem>
                  {iconOptions.map((icon) => (
                    <SelectItem key={icon} value={icon}>
                      {icon}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Vista previa */}
            <div className="space-y-2">
              <Label>Vista previa</Label>
              <div className="p-4 border rounded-lg bg-muted/50">
                <Badge variant={formData.color as any}>
                  {formData.label || "Estado de ejemplo"}
                </Badge>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {estado ? "Actualizar" : "Crear"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
