"use client";

import useSWR from "swr";
import type { CrearGastoInput, GastoConOrigen } from "@/lib/types/ventas-kpis";

const fetcher = async (url: string) => {
  const res = await fetch(url);
  if (!res.ok) throw new Error("Error al cargar gastos");
  return res.json();
};

export function useGastosComerciales(params: { desde?: string; hasta?: string }) {
  const qs = new URLSearchParams();
  if (params.desde) qs.set("desde", params.desde);
  if (params.hasta) qs.set("hasta", params.hasta);

  const { data, error, isLoading, mutate } = useSWR<GastoConOrigen[]>(
    `/api/ventas-kpis/gastos?${qs.toString()}`,
    fetcher,
    { revalidateOnFocus: false, dedupingInterval: 60_000 }
  );

  return {
    gastos: data ?? [],
    isLoading,
    error,
    mutate,
  };
}

export async function crearGasto(input: CrearGastoInput): Promise<GastoConOrigen> {
  const res = await fetch("/api/ventas-kpis/gastos", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "Error al crear" }));
    throw new Error(err.error ?? "Error al crear gasto");
  }
  return res.json();
}

export async function editarGasto(
  id: string,
  input: Partial<CrearGastoInput>
): Promise<GastoConOrigen> {
  const res = await fetch(`/api/ventas-kpis/gastos/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "Error al editar" }));
    throw new Error(err.error ?? "Error al editar gasto");
  }
  return res.json();
}

export async function borrarGasto(id: string): Promise<void> {
  const res = await fetch(`/api/ventas-kpis/gastos/${id}`, { method: "DELETE" });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "Error al borrar" }));
    throw new Error(err.error ?? "Error al borrar gasto");
  }
}
