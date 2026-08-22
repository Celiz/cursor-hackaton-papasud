"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { CheckCircle, Loader2 } from "lucide-react";

interface QuickAddClienteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: (clienteId: string, clienteNombre: string) => void;
}

export function QuickAddClienteDialog({ open, onOpenChange, onSuccess }: QuickAddClienteDialogProps) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    nombre: "",
    nombre_fantasia: "",
    cuit: "",
    dni: "",
    email: "",
    telefono: "",
    direccion: "",
    localidad: "",
    provincia: "",
  });

  const handleSubmit = async () => {
    if (!formData.nombre.trim()) {
      toast.error("El nombre (razón social) es requerido");
      return;
    }

    setLoading(true);
    try {
      const response = await fetch("/api/clientes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nombre: formData.nombre.trim(),
          nombre_fantasia: formData.nombre_fantasia.trim() || null,
          cuit: formData.cuit.trim() || null,
          dni: formData.dni.trim() || null,
          email: formData.email.trim() ? [formData.email.trim()] : [],
          telefono: formData.telefono.trim() ? [formData.telefono.trim()] : [],
          direccion: formData.direccion.trim() || null,
          localidad: formData.localidad.trim() || null,
          provincia: formData.provincia.trim() || null,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Error al crear cliente");
      }

      const cliente = await response.json();

      toast.success(
        <div className="flex items-center gap-2">
          <CheckCircle className="h-4 w-4" />
          <p>
            Cliente <strong>{formData.nombre}</strong> creado correctamente
          </p>
        </div>
      );

      onSuccess(cliente.id, cliente.nombre);
      setFormData({
        nombre: "",
        nombre_fantasia: "",
        cuit: "",
        dni: "",
        email: "",
        telefono: "",
        direccion: "",
        localidad: "",
        provincia: "",
      });
      onOpenChange(false);
    } catch (error) {
      console.error("Error creating cliente:", error);
      toast.error(error instanceof Error ? error.message : "Error al crear cliente");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle>Nuevo Cliente</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4 overflow-y-auto flex-1 pr-1">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2 col-span-2">
              <Label>Razón Social / Nombre *</Label>
              <Input
                value={formData.nombre}
                onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                placeholder="Nombre legal del cliente"
                disabled={loading}
              />
            </div>

            <div className="space-y-2 col-span-2">
              <Label>Nombre Fantasía (opcional)</Label>
              <Input
                value={formData.nombre_fantasia}
                onChange={(e) => setFormData({ ...formData, nombre_fantasia: e.target.value })}
                placeholder="Nombre comercial"
                disabled={loading}
              />
            </div>

            <div className="space-y-2">
              <Label>CUIT</Label>
              <Input
                value={formData.cuit}
                onChange={(e) => setFormData({ ...formData, cuit: e.target.value })}
                placeholder="XX-XXXXXXXX-X"
                disabled={loading}
              />
            </div>

            <div className="space-y-2">
              <Label>DNI</Label>
              <Input
                value={formData.dni}
                onChange={(e) => setFormData({ ...formData, dni: e.target.value })}
                placeholder="Número de DNI"
                disabled={loading}
              />
            </div>

            <div className="space-y-2">
              <Label>Email</Label>
              <Input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="cliente@ejemplo.com"
                disabled={loading}
              />
            </div>

            <div className="space-y-2">
              <Label>Teléfono</Label>
              <Input
                value={formData.telefono}
                onChange={(e) => setFormData({ ...formData, telefono: e.target.value })}
                placeholder="+54 9 11 XXXX-XXXX"
                disabled={loading}
              />
            </div>

            <div className="space-y-2 col-span-2">
              <Label>Dirección</Label>
              <Input
                value={formData.direccion}
                onChange={(e) => setFormData({ ...formData, direccion: e.target.value })}
                placeholder="Calle, número, piso, depto"
                disabled={loading}
              />
            </div>

            <div className="space-y-2">
              <Label>Localidad</Label>
              <Input
                value={formData.localidad}
                onChange={(e) => setFormData({ ...formData, localidad: e.target.value })}
                placeholder="Ciudad"
                disabled={loading}
              />
            </div>

            <div className="space-y-2">
              <Label>Provincia</Label>
              <Input
                value={formData.provincia}
                onChange={(e) => setFormData({ ...formData, provincia: e.target.value })}
                placeholder="Provincia"
                disabled={loading}
              />
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-4 border-t flex-shrink-0">
          <Button type="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            Cancelar
          </Button>
          <Button type="primary" onClick={handleSubmit} disabled={loading || !formData.nombre.trim()}>
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Guardando...
              </>
            ) : (
              "Crear cliente"
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
