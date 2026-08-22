"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { SearchableCombobox, ComboboxOption } from "@/components/ui/searchable-combobox";
import { Loader2, Link as LinkIcon } from "lucide-react";
import { toast } from "sonner";

interface VincularEquipoDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clienteId: string;
  clienteNombre?: string;
  // Se llama tras vincular con éxito para que el padre refresque la lista.
  onVinculado: () => void | Promise<void>;
}

// Busca UNIDADES sueltas (categoria=stock_disponible => sin cliente ni
// laboratorio) para asignarlas a este cliente SIN crear una unidad nueva.
async function searchUnidadesSueltas(query: string): Promise<ComboboxOption[]> {
  const params = new URLSearchParams();
  params.set("categoria", "stock_disponible");
  if (query) params.set("search", query);
  params.set("limit", "50");
  const res = await fetch(`/api/equipos-unidades?${params.toString()}`);
  if (!res.ok) return [];
  const data = await res.json();
  const list = Array.isArray(data) ? data : [];
  return list.map((u: any) => {
    const marca = u.equipos?.marca || u.marca || "Sin marca";
    const modelo = u.equipos?.modelo || u.modelo || "";
    const serie = u.numero_serie || u.codigo || "s/n";
    return {
      value: u.id,
      label: `${marca} ${modelo} — S/N: ${serie}`.replace(/\s+/g, " ").trim(),
      badge: u.equipos?.tipo || u.tipo || undefined,
      data: u,
    } as ComboboxOption;
  });
}

export function VincularEquipoDialog({
  open,
  onOpenChange,
  clienteId,
  clienteNombre,
  onVinculado,
}: VincularEquipoDialogProps) {
  const [selectedId, setSelectedId] = useState("");
  const [loading, setLoading] = useState(false);

  const reset = () => setSelectedId("");

  const handleVincular = async () => {
    if (!selectedId) {
      toast.error("Elegí un equipo suelto para vincular");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`/api/equipos-unidades/${selectedId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cliente_id: clienteId }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.error || "No se pudo vincular el equipo");
      }
      toast.success("Equipo vinculado al cliente");
      reset();
      await onVinculado();
      onOpenChange(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Error al vincular el equipo");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) reset();
        onOpenChange(o);
      }}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Vincular equipo existente</DialogTitle>
          <DialogDescription>
            Asigná una unidad que ya está cargada y sin dueño
            {clienteNombre ? ` a ${clienteNombre}` : ""}. No se crea un equipo nuevo.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2 py-2">
          <Label>Equipo suelto (sin cliente)</Label>
          <SearchableCombobox
            value={selectedId}
            onValueChange={(v) => setSelectedId(v)}
            searchFn={searchUnidadesSueltas}
            placeholder="Buscar por marca, modelo o n° de serie..."
            emptyMessage="No hay equipos sueltos que coincidan"
          />
          <p className="text-[11px] text-muted-foreground">
            Solo aparecen unidades sin cliente asignado. Si el equipo ya está en
            otro cliente, primero quitalo de ahí.
          </p>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={loading}
          >
            Cancelar
          </Button>
          <Button onClick={handleVincular} disabled={loading || !selectedId}>
            {loading ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <LinkIcon className="h-4 w-4 mr-2" />
            )}
            Vincular
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
