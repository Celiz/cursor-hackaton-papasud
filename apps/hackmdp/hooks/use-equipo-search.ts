import { ComboboxOption } from "@/components/ui/searchable-combobox"

export async function searchEquipos(query: string): Promise<ComboboxOption[]> {
  try {
    const params = new URLSearchParams()
    if (query) {
      params.append('search', query)
    }
    params.append('limit', '50')

    const response = await fetch(`/api/equipos?${params.toString()}`)
    if (!response.ok) {
      throw new Error('Error al buscar equipos')
    }

    const equipos = await response.json()

    return equipos.map((equipo: any) => ({
      label: `${equipo.marca || ''} ${equipo.modelo || ''}`.trim() || 'Sin nombre',
      value: equipo.id,
      badge: equipo.tipo || undefined,
      secondaryLabel: equipo.tipo ? `Tipo: ${equipo.tipo}` : undefined,
    }))
  } catch (error) {
    console.error('Error searching equipos:', error)
    return []
  }
}

export async function searchEquiposUnidades(
  query: string,
  clienteId?: string,
  laboratorioId?: string
): Promise<ComboboxOption[]> {
  try {
    const params = new URLSearchParams()
    if (query) {
      params.append('search', query)
    }
    // Pasamos ambos: con cliente + laboratorio, la API devuelve los equipos del
    // lab MÁS los del cliente sin laboratorio (huérfanos), así no se pierde
    // ninguno del cliente (ej. un equipo cargado sin lab asignado).
    if (clienteId) {
      params.append('cliente_id', clienteId)
    }
    if (laboratorioId) {
      params.append('laboratorio_id', laboratorioId)
    }
    params.append('limit', '50')

    const response = await fetch(`/api/equipos-unidades?${params.toString()}`)

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      console.error('Error response:', errorData)
      throw new Error(errorData.error || 'Error al buscar unidades de equipos')
    }

    const data = await response.json()

    // Check if response has error property
    if (data.error) {
      console.error('API Error:', data.error)
      throw new Error(data.error)
    }

    // Ensure we have an array
    const unidades = Array.isArray(data) ? data : []

    return unidades.map((unidad: any) => {
      // Acceder a los datos de equipo (similar a selectedRowData?.equipo_id?.equipo_id)
      const equipoData = unidad.equipos // Relación directa desde equipos_unidades -> equipos
      const marca = equipoData?.marca || 'Sin marca'
      const modelo = equipoData?.modelo || 'Sin modelo'
      const numeroSerie = unidad.numero_serie || 'Sin N/S'

      // Formato visual:
      // Label principal: Modelo (negrita)
      // Secondary label: Marca y N° Serie (texto gris, abajo del label)
      // NO se muestra badge: el código interno (equipos_unidades.codigo) es
      // autogenerado (EQU-000xxx / EQ-<serie> / IMP-...) y confundía al usuario.

      const secondaryText = [marca]
      if (numeroSerie !== 'Sin N/S') {
        secondaryText.push(`N° Serie: ${numeroSerie}`)
      }

      return {
        label: modelo, // Modelo como label principal (en negrita)
        value: unidad.id,
        secondaryLabel: secondaryText.join(' • '), // Marca y N° Serie
      }
    })
  } catch (error) {
    console.error('Error searching equipos unidades:', error)
    return []
  }
}
