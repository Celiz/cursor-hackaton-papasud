"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
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
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

interface QuickAddEstadoDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tipo: "servicio" | "contable";
  title: string;
  onSuccess: (value: string) => void;
}

const COLORES_DISPONIBLES = [
  { value: "blue", label: "Azul" },
  { value: "green", label: "Verde" },
  { value: "yellow", label: "Amarillo" },
  { value: "red", label: "Rojo" },
  { value: "purple", label: "Morado" },
  { value: "orange", label: "Naranja" },
  { value: "gray", label: "Gris" },
  { value: "pink", label: "Rosa" },
];

export function QuickAddEstadoDialog({
  open,
  onOpenChange,
  tipo,
  title,
  onSuccess,
}: QuickAddEstadoDialogProps) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    value: "",
    label: "",
    color: "blue",
    descripcion: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.value || !formData.label) {
      toast.error("Por favor completa los campos requeridos");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch("/api/configuracion-estados", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          tipo,
          value: formData.value,
          label: formData.label,
          color: formData.color,
          descripcion: formData.descripcion || null,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Error al crear el estado");
      }

      toast.success(`Estado "${formData.label}" creado exitosamente`);

      // Call onSuccess with the value
      onSuccess(formData.value);

      // Reset form and close dialog
      setFormData({
        value: "",
        label: "",
        color: "blue",
        descripcion: "",
      });
      onOpenChange(false);
    } catch (error) {
      console.error("Error creating estado:", error);
      toast.error(
        error instanceof Error ? error.message : "Error al crear el estado"
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 overflow-y-auto flex-1 pr-1">
          <div className="space-y-2">
            <Label htmlFor="value">
              Valor <span className="text-destructive">*</span>
            </Label>
            <Input
              id="value"
              value={formData.value}
              onChange={(e) =>
                setFormData({ ...formData, value: e.target.value })
              }
              placeholder="ej: en_revision"
              required
            />
            <p className="text-xs text-muted-foreground">
              Identificador único (sin espacios, usar guiones bajos)
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="label">
              Etiqueta <span className="text-destructive">*</span>
            </Label>
            <Input
              id="label"
              value={formData.label}
              onChange={(e) =>
                setFormData({ ...formData, label: e.target.value })
              }
              placeholder="ej: En Revisión"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="color">Color</Label>
            <Select
              value={formData.color}
              onValueChange={(value) =>
                setFormData({ ...formData, color: value })
              }
            >
              <SelectTrigger id="color">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {COLORES_DISPONIBLES.map((color) => (
                  <SelectItem key={color.value} value={color.value}>
                    {color.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="descripcion">Descripción</Label>
            <Input
              id="descripcion"
              value={formData.descripcion}
              onChange={(e) =>
                setFormData({ ...formData, descripcion: e.target.value })
              }
              placeholder="Descripción opcional"
            />
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t flex-shrink-0">
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
              Crear
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
