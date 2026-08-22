/**
 * Colores y tipos de los lotes, separados del componente de mapa: importar
 * MapaLotes.tsx arrastra leaflet, que toca `window` y revienta en el server.
 */

export interface ParcelaMapa {
  id: string
  codigo: string
  nombre: string | null
  superficie_ha: string | number
  estado: string
  tiene_riego: boolean
  latitud: string | number | null
  longitud: string | number | null
  tipo_suelo: string | null
  establecimiento: string | null
  localidad: string | null
  ultima_tarea: string | null
  ultima_fecha: string | null
  dias_sin_actividad: number | null
  variedad: string | null
  ultimo_rinde: string | number | null
}

/** El color dice el estado del lote; el radio en el mapa dice la superficie. */
const COLOR_ESTADO: Record<string, string> = {
  sembrado: '#16a34a',    // verde
  en_cosecha: '#f59e0b',  // ámbar
  descanso: '#94a3b8',    // gris
  disponible: '#3b82f6',  // azul
}

export const LEYENDA = [
  { estado: 'sembrado', label: 'Sembrado' },
  { estado: 'en_cosecha', label: 'En cosecha' },
  { estado: 'disponible', label: 'Disponible' },
  { estado: 'descanso', label: 'En descanso' },
]

export function colorDeEstado(estado: string): string {
  return COLOR_ESTADO[estado] ?? '#64748b'
}
