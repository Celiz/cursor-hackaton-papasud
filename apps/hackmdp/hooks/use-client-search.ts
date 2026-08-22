import { ComboboxOption } from "@/components/ui/searchable-combobox"

export interface ClienteComboboxOption extends ComboboxOption {
  badge?: string // Para el identificador único como badge
  secondaryLabel?: string // Para el nombre secundario
  data?: {
    nombre: string
    nombre_fantasia?: string
    identificador_unico?: string
    identificador_legacy?: string
    cuit: string
    email?: string[]
    telefono?: string[]
    localidad?: string
    provincia?: string
    condicion_iva?: string
    tipo_entidad?: string
  }
}

export async function searchClientes(query: string): Promise<ClienteComboboxOption[]> {
  try {
    const params = new URLSearchParams()
    if (query) {
      params.append('search', query)
    }
    params.append('limit', '50') // Limit results for performance
    params.append('view', 'principal')

    const response = await fetch(`/api/clientes?${params.toString()}`)

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      console.error('Error response:', errorData)
      throw new Error(errorData.error || 'Error al buscar clientes')
    }

    const data = await response.json()

    // Check if response has error property
    if (data.error) {
      console.error('API Error:', data.error)
      throw new Error(data.error)
    }

    // Ensure we have an array
    const clientes: any[] = Array.isArray(data) ? data : []

    return clientes.map((cliente) => {
      // Nombre principal: preferir nombre_fantasia si existe, fallback a nombre
      const nombrePrincipal = cliente.nombre_fantasia || cliente.nombre || 'Sin nombre'
      // Nombre secundario: mostrar el otro nombre si es diferente
      const nombreSecundario = cliente.nombre_fantasia && cliente.nombre && cliente.nombre !== cliente.nombre_fantasia
        ? cliente.nombre
        : null
      // ID para badge - persona-based clients may not have identificador_unico
      const idDisplay = cliente.identificador_unico || cliente.identificador_legacy
        || (cliente.documento_nro ? cliente.documento_nro : `#${cliente.id.slice(0, 6)}`)

      // Construir secondaryLabel con más info
      const infoPartes: string[] = []
      if (cliente.identificador_legacy) infoPartes.push(`CLI-${cliente.identificador_legacy}`)
      if (nombreSecundario) infoPartes.push(nombreSecundario)
      if (cliente.localidad) infoPartes.push(cliente.localidad)
      if (cliente.cuit && !nombreSecundario) infoPartes.push(`CUIT: ${cliente.cuit}`)
      if (!cliente.cuit && cliente.documento_nro && !nombreSecundario) infoPartes.push(`DNI: ${cliente.documento_nro}`)

      return {
        label: nombrePrincipal,
        value: cliente.id,
        badge: idDisplay,
        secondaryLabel: infoPartes.join(' • ') || cliente.cuit || cliente.documento_nro || undefined,
        subtitle: infoPartes.join(' • ') || cliente.cuit || cliente.documento_nro || undefined,
        data: {
          nombre: cliente.nombre,
          nombre_fantasia: cliente.nombre_fantasia,
          identificador_unico: cliente.identificador_unico,
          identificador_legacy: cliente.identificador_legacy,
          cuit: cliente.cuit,
          email: cliente.email,
          telefono: cliente.telefono,
          localidad: cliente.localidad,
          provincia: cliente.provincia,
          condicion_iva: cliente.condicion_iva,
          tipo_entidad: cliente.tipo_entidad,
        }
      }
    })
  } catch (error) {
    console.error('Error searching clientes:', error)
    return []
  }
}
