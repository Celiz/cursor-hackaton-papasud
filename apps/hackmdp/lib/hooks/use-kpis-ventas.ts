"use client";

import useSWR from "swr";
import type {
  KpisResumenResponse,
  KpisClientesResponse,
  KpisProductosResponse,
  KpisRentabilidadResponse,
  KpisEficienciaResponse,
} from "@/lib/types/ventas-kpis";

const fetcher = async (url: string) => {
  const res = await fetch(url);
  if (!res.ok) throw new Error("Error al cargar KPIs");
  return res.json();
};

const OPTS = { revalidateOnFocus: false, dedupingInterval: 5 * 60_000 } as const;

export function useKpisResumen(qs: string) {
  const { data, error, isLoading } = useSWR<KpisResumenResponse>(
    `/api/ventas-kpis/resumen?${qs}`,
    fetcher,
    OPTS
  );
  return { kpis: data, isLoading, error };
}

export function useKpisClientes(qs: string) {
  const { data, error, isLoading } = useSWR<KpisClientesResponse>(
    `/api/ventas-kpis/clientes?${qs}`,
    fetcher,
    OPTS
  );
  return { kpis: data, isLoading, error };
}

export function useKpisProductos(qs: string) {
  const { data, error, isLoading } = useSWR<KpisProductosResponse>(
    `/api/ventas-kpis/productos?${qs}`,
    fetcher,
    OPTS
  );
  return { kpis: data, isLoading, error };
}

export interface ProductoEvolucionMes {
  mes: string;
  cantidad: number;
  facturacion: number;
}

/** Serie mensual de ventas de un producto. No fetchea hasta que hay productoId. */
export function useKpisProductoEvolucion(productoId: string | null, qs: string) {
  const { data, error, isLoading } = useSWR<ProductoEvolucionMes[]>(
    productoId ? `/api/ventas-kpis/productos/evolucion?producto_id=${productoId}&${qs}` : null,
    fetcher,
    OPTS
  );
  return { serie: data, isLoading, error };
}

export function useKpisRentabilidad(qs: string) {
  const { data, error, isLoading } = useSWR<KpisRentabilidadResponse>(
    `/api/ventas-kpis/rentabilidad?${qs}`,
    fetcher,
    OPTS
  );
  return { kpis: data, isLoading, error };
}

export function useKpisEficiencia(qs: string) {
  const { data, error, isLoading } = useSWR<KpisEficienciaResponse>(
    `/api/ventas-kpis/eficiencia?${qs}`,
    fetcher,
    OPTS
  );
  return { kpis: data, isLoading, error };
}
