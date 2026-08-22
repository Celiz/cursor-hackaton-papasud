"use client";

import { useState, useEffect } from "react";
import useSWR from "swr";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
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
import { SearchableCombobox, ComboboxOption } from "@/components/ui/searchable-combobox";
import { toast } from "sonner";
import { Loader2, Wallet } from "lucide-react";
import { useCallback } from "react";

interface CreateChequeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: () => void;
  /** Pre-selecciona un cliente (ej. desde el detail sheet de una empresa). */
  defaultClienteId?: string;
  /** Pre-selecciona tipo (tercero/propio). Default 'tercero'. */
  defaultTipo?: "tercero" | "propio";
}

interface ClienteLite {
  id: string;
  nombre: string;
  cuit?: string | null;
}

const fetcher = (url: string) => fetch(url).then((r) => r.json());

/**
 * Dialog para crear un cheque nuevo.
 *
 * El flujo más común: cheque de tercero recibido de un cliente. El usuario
 * elige cliente, completa número + banco + monto + fecha_pago. El estado
 * inicial es "en_cartera". Después, desde el detail sheet, avanza por el
 * ciclo de vida (depositar, cobrar, rechazar).
 */
export function CreateChequeDialog({
  open,
  onOpenChange,
  onCreated,
  defaultClienteId,
  defaultTipo = "tercero",
}: CreateChequeDialogProps) {
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    tipo: defaultTipo as "tercero" | "propio",
    numero: "",
    monto: "",
    banco: "",
    sucursal_banco: "",
    cuit_librador: "",
    nombre_librador: "",
    fecha_emision: "",
    fecha_recepcion: new Date().toISOString().slice(0, 10),
    fecha_pago: "",
    cliente_id: defaultClienteId || "",
    observaciones: "",
  });

  useEffect(() => {
    if (open) {
      setForm((f) => ({
        ...f,
        tipo: defaultTipo,
        cliente_id: defaultClienteId || "",
      }));
    }
  }, [open, defaultClienteId, defaultTipo]);

  // Búsqueda on-demand de clientes. El SearchableCombobox llama a este searchFn
  // con lo que el usuario tipea y espera una lista de ComboboxOption.
  const searchClientes = useCallback(async (query: string): Promise<ComboboxOption[]> => {
    const params = new URLSearchParams({ limit: "30" });
    if (query.trim()) params.set("search", query.trim());
    params.set("view", "principal");
    const res = await fetch(`/api/clientes?${params.toString()}`);
    if (!res.ok) return [];
    const data: ClienteLite[] = await res.json();
    return (Array.isArray(data) ? data : []).map((c) => ({
      value: c.id,
      label: c.nombre + (c.cuit ? ` · ${c.cuit}` : ""),
    }));
  }, []);

  const resetForm = () => {
    setForm({
      tipo: "tercero",
      numero: "",
      monto: "",
      banco: "",
      sucursal_banco: "",
      cuit_librador: "",
      nombre_librador: "",
      fecha_emision: "",
      fecha_recepcion: new Date().toISOString().slice(0, 10),
      fecha_pago: "",
      cliente_id: "",
      observaciones: "",
    });
  };

  const handleSubmit = async () => {
    // Validaciones cliente-side (el backend re-valida).
    if (!form.numero.trim()) {
      toast.error("El número es obligatorio");
      return;
    }
    const montoNum = Number(form.monto);
    if (!montoNum || montoNum <= 0) {
      toast.error("El monto debe ser mayor a 0");
      return;
    }

    setLoading(true);
    try {
      const payload = {
        tipo: form.tipo,
        numero: form.numero.trim(),
        monto: montoNum,
        banco: form.banco.trim() || null,
        sucursal_banco: form.sucursal_banco.trim() || null,
        cuit_librador: form.cuit_librador.trim() || null,
        nombre_librador: form.nombre_librador.trim() || null,
        fecha_emision: form.fecha_emision || null,
        fecha_recepcion: form.fecha_recepcion || null,
        fecha_pago: form.fecha_pago || null,
        cliente_id: form.cliente_id || null,
        observaciones: form.observaciones.trim() || null,
      };

      const res = await fetch("/api/cheques", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Error al crear cheque");
      }

      resetForm();
      onCreated();
      onOpenChange(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error al crear cheque");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[640px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Wallet className="h-5 w-5 text-primary" />
            Nuevo cheque
          </DialogTitle>
          <DialogDescription>
            Ingreso en cartera. Después podés avanzar el estado (depositar, cobrar, etc.)
            desde el detalle.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Tipo */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Tipo</Label>
              <Select
                value={form.tipo}
                onValueChange={(value) =>
                  setForm({ ...form, tipo: value as "tercero" | "propio" })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="tercero">De tercero (recibido)</SelectItem>
                  <SelectItem value="propio">Propio (emitido)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Número *</Label>
              <Input
                value={form.numero}
                onChange={(e) => setForm({ ...form, numero: e.target.value })}
                placeholder="Ej: 65491256"
                className="font-mono"
              />
            </div>
          </div>

          {/* Monto + Banco */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Monto *</Label>
              <Input
                type="number"
                step="0.01"
                min="0"
                value={form.monto}
                onChange={(e) => setForm({ ...form, monto: e.target.value })}
                placeholder="0.00"
                className="font-mono"
              />
            </div>
            <div>
              <Label>Banco</Label>
              <Input
                value={form.banco}
                onChange={(e) => setForm({ ...form, banco: e.target.value })}
                placeholder="Ej: Banco Galicia"
              />
            </div>
          </div>

          {/* Librador (solo tercero) */}
          {form.tipo === "tercero" && (
            <div className="space-y-4 p-4 bg-muted/30 rounded-lg border">
              <p className="text-xs font-medium text-muted-foreground uppercase">
                Librador del cheque
              </p>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>CUIT del librador</Label>
                  <Input
                    value={form.cuit_librador}
                    onChange={(e) => setForm({ ...form, cuit_librador: e.target.value })}
                    placeholder="XX-XXXXXXXX-X"
                    className="font-mono"
                  />
                </div>
                <div>
                  <Label>Nombre del librador</Label>
                  <Input
                    value={form.nombre_librador}
                    onChange={(e) => setForm({ ...form, nombre_librador: e.target.value })}
                    placeholder="Razón social o persona"
                  />
                </div>
              </div>
              <div>
                <Label>Cliente vinculado (opcional)</Label>
                <SearchableCombobox
                  value={form.cliente_id || undefined}
                  onValueChange={(value) => setForm({ ...form, cliente_id: value || "" })}
                  searchFn={searchClientes}
                  placeholder="Buscar cliente..."
                  emptyMessage="Escribí para buscar"
                />
                <p className="text-[11px] text-muted-foreground mt-1">
                  Si el cheque corresponde a un cliente existente, vinculalo para trackear
                  su cuenta corriente.
                </p>
              </div>
            </div>
          )}

          {/* Fechas */}
          <div className="grid grid-cols-3 gap-4">
            <div>
              <Label>Fecha emisión</Label>
              <Input
                type="date"
                value={form.fecha_emision}
                onChange={(e) => setForm({ ...form, fecha_emision: e.target.value })}
              />
            </div>
            <div>
              <Label>Recepción</Label>
              <Input
                type="date"
                value={form.fecha_recepcion}
                onChange={(e) => setForm({ ...form, fecha_recepcion: e.target.value })}
              />
            </div>
            <div>
              <Label>Fecha de pago</Label>
              <Input
                type="date"
                value={form.fecha_pago}
                onChange={(e) => setForm({ ...form, fecha_pago: e.target.value })}
              />
            </div>
          </div>
          <p className="text-[11px] text-muted-foreground -mt-2">
            La fecha de pago es cuándo el cheque se puede cobrar (diferido: puede ser futura).
          </p>

          {/* Observaciones */}
          <div>
            <Label>Observaciones</Label>
            <Textarea
              value={form.observaciones}
              onChange={(e) => setForm({ ...form, observaciones: e.target.value })}
              placeholder="Notas opcionales..."
              rows={2}
            />
          </div>
        </div>

        <DialogFooter>
          <Button type="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
            Crear cheque
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
