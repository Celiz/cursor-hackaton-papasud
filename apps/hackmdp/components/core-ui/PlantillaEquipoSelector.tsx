"use client";
import { useState } from "react";
import useSWR from "swr";
import { SearchableCombobox, type ComboboxOption } from "@/components/ui/searchable-combobox";
import { toast } from "sonner";

const fetcher = (u: string) => fetch(u).then((r) => r.json());

interface PlantillaRow {
  id: string;
  nombre: string;
  categoria?: string | null;
}

/** Selector "Desde plantilla": lista las plantillas de la org y, al elegir una,
 *  pide al backend los items con precios frescos y los entrega al formulario. */
export function PlantillaEquipoSelector({
  clienteId,
  onAplicar,
}: {
  clienteId: string | null;
  onAplicar: (items: any[], defaults: any, warnings: string[]) => void;
}) {
  const { data } = useSWR<PlantillaRow[]>("/api/presupuestos-equipos/plantillas", fetcher);
  const [aplicando, setAplicando] = useState(false);

  const options: ComboboxOption[] = Array.isArray(data)
    ? data.map((p) => ({ value: p.id, label: p.nombre, secondaryLabel: p.categoria || undefined }))
    : [];

  if (!Array.isArray(data) || data.length === 0) return null;

  return (
    <SearchableCombobox
      value=""
      preloadedOptions={options}
      enableLocalSearch
      placeholder={aplicando ? "Aplicando plantilla..." : "Crear desde plantilla..."}
      emptyMessage="No hay plantillas"
      onValueChange={async (id) => {
        if (!id || aplicando) return;
        setAplicando(true);
        try {
          const res = await fetch(`/api/presupuestos-equipos/plantillas/${id}/aplicar`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ cliente_id: clienteId }),
          });
          const d = await res.json();
          if (!res.ok) throw new Error(d?.error || "Error al aplicar la plantilla");
          onAplicar(d.items ?? [], d.defaults ?? {}, d.warnings ?? []);
        } catch (err: any) {
          toast.error(err.message || "Error al aplicar la plantilla");
        } finally {
          setAplicando(false);
        }
      }}
    />
  );
}
