"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Equipo } from "@/lib/types";
import { Loader2 } from "lucide-react";

interface CreateEquipoDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (data: Partial<Equipo>) => Promise<void>;
}

export function CreateEquipoDialog({ open, onOpenChange, onSave }: CreateEquipoDialogProps) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    marca: "",
    modelo: "",
    tipo: "",
    estado: "Disponible",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await onSave(formData);
      setFormData({
        marca: "",
        modelo: "",
        tipo: "",
        estado: "Disponible",
      });
      onOpenChange(false);
    } catch (error) {
      console.error("Error creating equipo:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Crear Nuevo Equipo</DialogTitle>
            <DialogDescription>
              Completa los datos del nuevo equipo. Los campos marcados con * son obligatorios.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="marca">Marca *</Label>
              <Input
                id="marca"
                value={formData.marca}
                onChange={(e) => setFormData({ ...formData, marca: e.target.value })}
                required
                placeholder="Marca del equipo"
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="modelo">Modelo *</Label>
              <Input
                id="modelo"
                value={formData.modelo}
                onChange={(e) => setFormData({ ...formData, modelo: e.target.value })}
                required
                placeholder="Modelo del equipo"
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="tipo">Tipo *</Label>
              <Input
                id="tipo"
                value={formData.tipo}
                onChange={(e) => setFormData({ ...formData, tipo: e.target.value })}
                required
                placeholder="Tipo de equipo"
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="estado">Estado</Label>
              <Select value={formData.estado} onValueChange={(value) => setFormData({ ...formData, estado: value })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Disponible">Disponible</SelectItem>
                  <SelectItem value="En Uso">En Uso</SelectItem>
                  <SelectItem value="En Mantenimiento">En Mantenimiento</SelectItem>
                  <SelectItem value="Retirado">Retirado</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button htmlType="button" type="outline" onClick={() => onOpenChange(false)} disabled={loading}>
              Cancelar
            </Button>
            <Button htmlType="submit" disabled={loading} iconLeft={loading ? <Loader2 className="h-4 w-4 animate-spin" /> : undefined}>
              Crear Equipo
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
