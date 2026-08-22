"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { CheckCircle, Loader2 } from "lucide-react";

interface QuickAddConfigDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tipo: "tecnico" | "tipo_servicio" | "modo_contacto";
  title: string;
  placeholder: string;
  onSuccess: (nombre: string) => void;
}

export function QuickAddConfigDialog({
  open,
  onOpenChange,
  tipo,
  title,
  placeholder,
  onSuccess,
}: QuickAddConfigDialogProps) {
  const [loading, setLoading] = useState(false);
  const [nombre, setNombre] = useState("");

  const handleSubmit = async () => {
    if (!nombre.trim()) {
      toast.error("El nombre es requerido");
      return;
    }

    setLoading(true);
    try {
      const response = await fetch("/api/servicios-configuracion", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tipo,
          nombre: nombre.trim(),
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Error al crear configuración");
      }

      const config = await response.json();

      toast.success(
        <div className="flex items-center gap-2">
          <CheckCircle className="h-4 w-4" />
          <p>
            <strong>{nombre}</strong> agregado correctamente
          </p>
        </div>
      );

      onSuccess(config.nombre);
      setNombre("");
      onOpenChange(false);
    } catch (error) {
      console.error("Error creating config:", error);
      toast.error(error instanceof Error ? error.message : "Error al crear configuración");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[400px] max-h-[90vh] flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4 overflow-y-auto flex-1">
          <div className="space-y-2">
            <Label>Nombre *</Label>
            <Input
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              placeholder={placeholder}
              disabled={loading}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !loading && nombre.trim()) {
                  handleSubmit();
                }
              }}
            />
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-4 border-t flex-shrink-0">
          <Button type="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            Cancelar
          </Button>
          <Button type="primary" onClick={handleSubmit} disabled={loading || !nombre.trim()}>
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Guardando...
              </>
            ) : (
              "Agregar"
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
