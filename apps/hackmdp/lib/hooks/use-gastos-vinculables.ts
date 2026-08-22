"use client";

import useSWR from "swr";
import type { GastoVinculable } from "@/lib/types/ventas-kpis";

const fetcher = async (url: string) => {
  const res = await fetch(url);
  if (!res.ok) throw new Error("Error al cargar vinculables");
  return res.json();
};

export function useGastosVinculables(search: string) {
  const qs = new URLSearchParams();
  if (search) qs.set("search", search);

  const { data, error, isLoading } = useSWR<GastoVinculable[]>(
    `/api/ventas-kpis/gastos/vinculables?${qs.toString()}`,
    fetcher,
    { revalidateOnFocus: false, dedupingInterval: 30_000 }
  );

  return { vinculables: data ?? [], isLoading, error };
}
