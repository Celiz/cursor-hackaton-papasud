"use client";

import useSWR from "swr";
import type { KpisGastosCacResponse } from "@/lib/types/ventas-kpis";

const fetcher = async (url: string) => {
  const res = await fetch(url);
  if (!res.ok) throw new Error("Error al cargar KPIs de gastos");
  return res.json();
};

export function useKpisGastosCac(qs: string) {
  const { data, error, isLoading, mutate } = useSWR<KpisGastosCacResponse>(
    `/api/ventas-kpis/gastos-cac?${qs}`,
    fetcher,
    { revalidateOnFocus: false, dedupingInterval: 5 * 60_000 }
  );

  return {
    kpis: data,
    isLoading,
    error,
    mutate,
  };
}
