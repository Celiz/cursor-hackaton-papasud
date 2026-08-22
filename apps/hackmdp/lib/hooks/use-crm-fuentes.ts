import useSWR from "swr";
import {
  CRM_FUENTES, buildFuenteConfig, resolveFuente,
  type FuenteConfig, type FuenteLeadCustom,
} from "@/lib/crm-fuentes-config";
import { mergeVisibles } from "@/lib/crm-listas";

const fetcher = (url: string) =>
  fetch(url).then((r) => {
    if (!r.ok) throw new Error("Error al cargar fuentes");
    return r.json();
  });

/**
 * Devuelve las fuentes de lead administradas de la org.
 * - `fuentesSelector`: lista efectiva (predeterminadas no-ocultas + propias) para el <Select>.
 * - `resolve(id)`: config de una fuente por id contra el mapa completo (para mostrar el valor guardado).
 */
export function useCrmFuentes(enabled = true) {
  const { data, mutate, isLoading } = useSWR<{ custom: FuenteLeadCustom[]; ocultas: string[] }>(
    enabled ? "/api/crm/fuentes-lead" : null,
    fetcher,
  );
  const custom = data?.custom ?? [];
  const ocultas = data?.ocultas ?? [];
  const fuentesSelector: FuenteConfig[] = mergeVisibles(CRM_FUENTES, custom.map(buildFuenteConfig), ocultas);
  return {
    fuentesSelector,
    resolve: (id?: string | null) => resolveFuente(id, custom),
    custom,
    ocultas,
    mutate,
    isLoading,
  };
}
