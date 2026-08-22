import { ComboboxOption } from "@/components/ui/searchable-combobox"

export interface ContactoComboboxOption extends ComboboxOption {
  secondaryLabel?: string
  data?: {
    persona_id: string
    nombre: string
    apellido: string | null
    email: string
    cliente_nombre: string | null
  }
}

/**
 * Busca contactos (personas) que todavía no están en la lista dada.
 * Las listas de email trabajan siempre sobre contactos, nunca sobre clientes.
 */
export async function searchContactos(
  listaId: string,
  q: string,
): Promise<ContactoComboboxOption[]> {
  const params = new URLSearchParams()
  if (q) params.append("search", q)

  const response = await fetch(
    `/api/email/listas/${listaId}/contactos-crm?${params.toString()}`,
  )
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}))
    throw new Error(errorData.error || "Error al buscar contactos")
  }

  const data = await response.json()
  const contactos: any[] = Array.isArray(data) ? data : []

  return contactos.map((c) => {
    const nombreCompleto =
      [c.nombre, c.apellido].filter(Boolean).join(" ") || c.email
    const info = [c.email, c.cliente_nombre].filter(Boolean).join(" • ")
    return {
      label: nombreCompleto,
      value: c.persona_id,
      secondaryLabel: info || undefined,
      subtitle: info || undefined,
      data: {
        persona_id: c.persona_id,
        nombre: c.nombre,
        apellido: c.apellido,
        email: c.email,
        cliente_nombre: c.cliente_nombre,
      },
    }
  })
}
