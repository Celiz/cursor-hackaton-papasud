import { ComboboxOption } from "@/components/ui/searchable-combobox";

export interface LaboratorioComboboxOption extends ComboboxOption {
  data?: {
    nombre: string;
    codigo?: string;
    direccion?: string;
    localidad?: string;
    provincia?: string;
    tipo?: string;
    razon_social_id?: string;
  };
}

export async function searchLaboratorios(
  query: string,
  clienteId?: string
): Promise<LaboratorioComboboxOption[]> {
  try {
    const params = new URLSearchParams({
      search: query,
      limit: "50",
    });

    // Si se proporciona clienteId, filtrar por ese cliente
    if (clienteId) {
      params.append("razon_social_id", clienteId);
    }

    const response = await fetch(`/api/laboratorios?${params.toString()}`);

    if (!response.ok) {
      console.error("Error fetching laboratorios:", response.statusText);
      return [];
    }

    const data = await response.json();

    if (!Array.isArray(data)) {
      return [];
    }

    return data.map((lab: any) => ({
      value: lab.id,
      label: lab.nombre || "Sin nombre",
      badge: lab.codigo || undefined,
      secondaryLabel: lab.localidad
        ? `${lab.localidad}${lab.provincia ? `, ${lab.provincia}` : ""}`
        : lab.tipo || undefined,
      data: {
        nombre: lab.nombre,
        codigo: lab.codigo,
        direccion: lab.direccion,
        localidad: lab.localidad,
        provincia: lab.provincia,
        tipo: lab.tipo,
        razon_social_id: lab.razon_social_id,
      },
    }));
  } catch (error) {
    console.error("Error searching laboratorios:", error);
    return [];
  }
}
