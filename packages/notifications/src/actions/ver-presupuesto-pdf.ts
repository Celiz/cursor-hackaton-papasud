import { z } from 'zod'
import { query } from '@locus/db'
import { register } from '../registry'
import type { CatalogEntry, QueryResult } from '../types'

const entry: CatalogEntry = {
  id: 'ver_presupuesto',
  type: 'action',
  description:
    'Ver detalle de un presupuesto veterinario con items. Param requerido: presupuesto_id.',
  params: z.object({
    presupuesto_id: z.string().uuid(),
  }),
  async execute(orgId, params): Promise<QueryResult> {
    const { presupuesto_id } = params

    const presSql = `
      SELECT
        vp.numero,
        vp.titulo,
        vp.observaciones,
        vp.estado,
        vp.subtotal,
        vp.descuento_pct,
        vp.total,
        vp.vigencia_dias,
        vp.firmado,
        vp.fecha_firma,
        vp.created_at,
        p_cli.nombre AS cliente_nombre,
        COALESCE(p_cli.apellido, '') AS cliente_apellido,
        p_cli.telefono AS cliente_telefono,
        p_vet.nombre AS veterinario_nombre
      FROM vet_presupuestos vp
      JOIN personas p_cli ON p_cli.id = vp.cliente_id
      JOIN personas p_vet ON p_vet.id = vp.veterinario_id
      WHERE vp.id = $1 AND vp.org_id = $2 AND vp.deleted_at IS NULL
    `

    const pres = await query<{
      numero: string | null
      titulo: string
      observaciones: string | null
      estado: string
      subtotal: string | null
      descuento_pct: string
      total: string | null
      vigencia_dias: number
      firmado: boolean
      fecha_firma: string | null
      created_at: string
      cliente_nombre: string
      cliente_apellido: string
      cliente_telefono: string | null
      veterinario_nombre: string
    }>(presSql, [presupuesto_id, orgId])

    if (pres.rows.length === 0) {
      return { type: 'text', message: '\u274C Presupuesto no encontrado.' }
    }

    const p = pres.rows[0]

    const itemsSql = `
      SELECT
        vpi.tipo,
        vpi.descripcion,
        vpi.cantidad,
        vpi.precio_unitario,
        vpi.subtotal
      FROM vet_presupuesto_items vpi
      WHERE vpi.presupuesto_id = $1
      ORDER BY vpi.orden, vpi.id
    `

    const items = await query<{
      tipo: string
      descripcion: string
      cantidad: string
      precio_unitario: string
      subtotal: string
    }>(itemsSql, [presupuesto_id])

    const itemLines = items.rows.map((it, i) => {
      const cant = Number(it.cantidad)
      const precio = Number(it.precio_unitario)
      const sub = Number(it.subtotal)
      return `  ${i + 1}. [${it.tipo}] ${it.descripcion}\n     ${cant} x $${precio.toLocaleString('es-AR')} = $${sub.toLocaleString('es-AR')}`
    })

    const clienteNombre = p.cliente_apellido
      ? `${p.cliente_nombre} ${p.cliente_apellido}`
      : p.cliente_nombre
    const fecha = new Date(p.created_at).toLocaleDateString('es-AR')
    const descuento = Number(p.descuento_pct)
    const firmaInfo = p.firmado
      ? `\u2705 Firmado el ${new Date(p.fecha_firma!).toLocaleDateString('es-AR')}`
      : '\u23F3 Sin firmar'

    const msg = [
      `\u{1F4CB} Presupuesto ${p.numero ?? '(sin nro)'} - ${p.titulo}`,
      `Estado: ${p.estado} | Vigencia: ${p.vigencia_dias} dias`,
      `Fecha: ${fecha}`,
      `Cliente: ${clienteNombre}${p.cliente_telefono ? ` | Tel: ${p.cliente_telefono}` : ''}`,
      `Veterinario: ${p.veterinario_nombre}`,
      '',
      'Items:',
      ...itemLines,
      '',
      p.subtotal ? `Subtotal: $${Number(p.subtotal).toLocaleString('es-AR')}` : null,
      descuento > 0 ? `Descuento: ${descuento}%` : null,
      p.total ? `Total: $${Number(p.total).toLocaleString('es-AR')}` : null,
      '',
      firmaInfo,
      p.observaciones ? `\nObs: ${p.observaciones}` : null,
    ]
      .filter((l) => l !== null)
      .join('\n')

    return { type: 'text', message: msg }
  },
}

register(entry)
export default entry
