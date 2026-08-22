import type { ComboboxOption } from "@/components/ui/searchable-combobox";

export interface PersonaComboboxOption extends ComboboxOption {
  data?: {
    nombre?: string;
    nombre_completo?: string;
    apellido?: string;
    email?: string | string[];
    telefono?: string | string[];
    documento_nro?: string;
  };
}

/**
 * Busca personas (contactos globales de la org) para comboboxes.
 * Devuelve label, secondaryLabel y data completo para autofillear.
 */
export async function searchPersonas(query: string): Promise<PersonaComboboxOption[]> {
  try {
    const params = new URLSearchParams();
    if (query) params.append("search", query);
    params.append("limit", "30");

    const res = await fetch(`/api/personas?${params.toString()}`);
    if (!res.ok) return [];
    const data = await res.json();
    const personas: any[] = Array.isArray(data) ? data : Array.isArray(data?.data) ? data.data : [];

    return personas.map((p) => {
      const label =
        p.nombre_completo ||
        `${p.nombre || ""} ${p.apellido || ""}`.trim() ||
        "Sin nombre";

      const emailStr = Array.isArray(p.email) ? p.email[0] : p.email;
      const telStr = Array.isArray(p.telefono) ? p.telefono[0] : p.telefono;
      const infoParts: string[] = [];
      if (emailStr) infoParts.push(emailStr);
      if (telStr) infoParts.push(telStr);
      if (p.documento_nro) infoParts.push(`${p.documento_tipo || "Doc"} ${p.documento_nro}`);

      return {
        value: p.id,
        label,
        secondaryLabel: infoParts.join(" · ") || undefined,
        subtitle: infoParts.join(" · ") || undefined,
        data: {
          nombre: p.nombre,
          nombre_completo: p.nombre_completo,
          apellido: p.apellido,
          email: p.email,
          telefono: p.telefono,
          documento_nro: p.documento_nro,
        },
      };
    });
  } catch (err) {
    console.error("Error searching personas:", err);
    return [];
  }
}
