import { z } from 'zod'
import { register } from '../registry'
import type { CatalogEntry, QueryResult } from '../types'
import { queryClientesZona, extractContact } from '../helpers'

const entry: CatalogEntry = {
  id: 'clientes_por_zona',
  type: 'action',
  description:
    'Buscar clientes por zona geográfica (localidad o provincia). Útil para viajes comerciales. Muestra nombre, dirección, teléfono y equipos que tienen.',
  params: z.object({
    localidad: z.string().optional(),
    provincia: z.string().optional(),
  }),
  async execute(orgId, params): Promise<QueryResult> {
    const { localidad, provincia } = params

    if (!localidad && !provincia) {
      return { type: 'text', message: 'Necesito al menos una localidad o provincia para buscar.' }
    }

    const clientes = await queryClientesZona(orgId, { localidad, provincia })

    if (clientes.length === 0) {
      const zona = localidad || provincia
      return { type: 'text', message: `No encontré clientes activos en "${zona}".` }
    }

    const zona = localidad || provincia
    const lines = clientes.map(r => {
      const tel = extractContact(r.telefono)
      const email = extractContact(r.email)
      const dir = r.direccion ? `${r.direccion}` : ''
      const loc = [dir, r.localidad, r.provincia].filter(Boolean).join(', ')
      const equipos = r.equipos_count > 0 ? `${r.equipos_detalle}` : 'sin equipos'
      const contacto = [tel, email].filter(Boolean).join(' | ')

      return `• **${r.nombre}**\n  ${loc}\n  ${contacto}\n  Equipos: ${equipos}`
    })

    return {
      type: 'text',
      message: `${clientes.length} cliente(s) en "${zona}":\n\n${lines.join('\n\n')}`,
    }
  },
}

register(entry)
export default entry
