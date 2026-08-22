"use client";

import React, { useState, useEffect } from "react";
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
import { Loader2, UserPlus } from "lucide-react";
import { toast } from "sonner";

interface CrearClienteRapidoDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: (clienteId: string, clienteInfo: {
    nombre: string;
    email?: string;
    cuit?: string;
  }) => void;
}

const CONDICIONES_IVA = [
  { value: "consumidor_final", label: "Consumidor Final" },
  { value: "monotributista", label: "Monotributista" },
  { value: "responsable_inscripto", label: "Responsable Inscripto" },
  { value: "exento", label: "Exento" },
];

export function CrearClienteRapidoDialog({
  open,
  onOpenChange,
  onSuccess,
}: CrearClienteRapidoDialogProps) {
  const [loading, setLoading] = useState(false);
  const [nombre, setNombre] = useState("");
  const [email, setEmail] = useState("");
  const [telefono, setTelefono] = useState("");
  const [cuit, setCuit] = useState("");
  const [condicionIva, setCondicionIva] = useState("consumidor_final");

  useEffect(() => {
    if (!open) {
      setNombre("");
      setEmail("");
      setTelefono("");
      setCuit("");
      setCondicionIva("consumidor_final");
    }
  }, [open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!nombre.trim()) {
      toast.error("El nombre es requerido");
      return;
    }

    setLoading(true);

    try {
      const body: Record<string, any> = {
        nombre: nombre.trim(),
        condicion_iva: condicionIva,
      };

      if (email.trim()) body.email = email.trim();
      if (telefono.trim()) body.telefono = telefono.trim();
      if (cuit.trim()) {
        body.cuit = cuit.trim();
        body.documento_tipo = "CUIT";
        body.documento_nro = cuit.trim();
      }

      const res = await fetch("/api/clientes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        let errorMsg = "Error al crear cliente";
        try {
          const err = await res.json();
          errorMsg = err.error || errorMsg;
        } catch {}
        throw new Error(errorMsg);
      }

      const cliente = await res.json();

      toast.success(`Cliente ${nombre.trim()} creado`);

      onSuccess(cliente.id, {
        nombre: cliente.nombre || nombre.trim(),
        email: email.trim() || undefined,
        cuit: cuit.trim() || undefined,
      });

      onOpenChange(false);
    } catch (error: any) {
      console.error("Error:", error);
      toast.error(error.message || "Error al crear cliente");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5 text-purple-600" />
            Crear Cliente Rápido
          </DialogTitle>
          <DialogDescription>
            Crea un nuevo cliente con datos mínimos
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="nombre">Nombre *</Label>
            <Input
              id="nombre"
              autoFocus
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              placeholder="Nombre del cliente"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="email@ejemplo.com"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="telefono">Teléfono</Label>
              <Input
                id="telefono"
                value={telefono}
                onChange={(e) => setTelefono(e.target.value)}
                placeholder="11-1234-5678"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="cuit">CUIT</Label>
              <Input
                id="cuit"
                value={cuit}
                onChange={(e) => setCuit(e.target.value)}
                placeholder="20-12345678-9"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="condicion_iva">Condición IVA</Label>
              <Select value={condicionIva} onValueChange={setCondicionIva}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar" />
                </SelectTrigger>
                <SelectContent>
                  {CONDICIONES_IVA.map((c) => (
                    <SelectItem key={c.value} value={c.value}>
                      {c.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter className="pt-4">
            <Button
              type="outline"
              htmlType="button"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Cancelar
            </Button>
            <Button type="primary" htmlType="submit" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Crear Cliente
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
