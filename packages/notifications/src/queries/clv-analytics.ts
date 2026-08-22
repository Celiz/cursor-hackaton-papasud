import { z } from 'zod'
import { query } from '@locus/db'
import { register } from '../registry'
import type { CatalogEntry, QueryResult } from '../types'

const clvEntry: CatalogEntry = {
  id: 'clv_clientes',
  type: 'query',
  params: z.object({
    limite: z.string().optional(),
    orden: z.string().optional(),
  }),
  description:
    'Customer Lifetime Value — ranking de clientes por valor total facturado. Muestra facturación total, antigüedad, frecuencia de compra e ingreso mensual promedio. Params: limite (default 15), orden ("total", "mensual", "frecuencia").',
  execute: async (orgId: string, params: Record<string, any>): Promise<QueryResult> => {
    const limite = parseInt(params.limite) || 15
    const orden = params.orden || 'total'

    const orderBy = orden === 'mensual'
      ? 'ingreso_mensual_promedio DESC'
      : orden === 'frecuencia'
        ? 'dias_entre_compras ASC NULLS LAST'
        : 'facturacion_total DESC'

    // Try to refresh the materialized view first (best-effort)
    try { await query('SELECT refresh_clv()') } catch {}

    const result = await query(`
      SELECT cliente_nombre, total_facturas,
             facturacion_total::numeric(15,2),
             primera_compra, ultima_compra,
             dias_como_cliente,
             ingreso_mensual_promedio::numeric(15,2) as ing_mensual,
             dias_entre_compras::int
      FROM mv_cliente_clv
      WHERE org_id = $1 AND total_facturas > 0
      ORDER BY ${orderBy}
      LIMIT $2
    `, [orgId, limite])

    if (result.rows.length === 0) {
      return { type: 'text', message: 'No hay datos de facturación para calcular CLV.' }
    }

    const fmt = (n: number) => `$${Number(n).toLocaleString('es-AR', { maximumFractionDigits: 0 })}`

    const lines = result.rows.map((r: any, i: number) => {
      const años = Math.round(r.dias_como_cliente / 365 * 10) / 10
      const freq = r.dias_entre_compras ? `cada ${r.dias_entre_compras}d` : 'única compra'
      return `${i + 1}. **${r.cliente_nombre}** — CLV: ${fmt(r.facturacion_total)} (${r.total_facturas} facturas en ${años} años, ${freq}, ~${fmt(r.ing_mensual)}/mes)`
    })

    // Summary stats
    const totales = await query(`
      SELECT COUNT(*) as clientes,
             SUM(facturacion_total)::numeric(15,0) as total,
             AVG(facturacion_total)::numeric(15,0) as promedio_clv,
             AVG(ingreso_mensual_promedio)::numeric(15,0) as promedio_mensual
      FROM mv_cliente_clv
      WHERE org_id = $1 AND total_facturas > 0
    `, [orgId])

    const t = totales.rows[0] as any

    return {
      type: 'text',
      message: `📊 **Customer Lifetime Value — Top ${limite}**\n\n${lines.join('\n')}\n\n---\n**Resumen**: ${t.clientes} clientes con compras | CLV promedio: ${fmt(t.promedio_clv)} | Ingreso mensual promedio: ${fmt(t.promedio_mensual)}/mes`,
    }
  },
}

const cacEntry: CatalogEntry = {
  id: 'cac_analytics',
  type: 'query',
  params: z.object({
    meses: z.string().optional(),
  }),
  description:
    'Customer Acquisition Cost — costo de adquisición de clientes. Divide los gastos comerciales del período por la cantidad de clientes nuevos. Params: meses (default 12, últimos N meses).',
  execute: async (orgId: string, params: Record<string, any>): Promise<QueryResult> => {
    const meses = parseInt(params.meses) || 12

    // Clientes nuevos por mes (primera factura en ese mes)
    const clientesNuevos = await query(`
      SELECT
        DATE_TRUNC('month', primera_compra)::date as mes,
        COUNT(*) as nuevos
      FROM mv_cliente_clv
      WHERE org_id = $1
        AND primera_compra >= NOW() - INTERVAL '1 month' * $2
        AND total_facturas > 0
      GROUP BY DATE_TRUNC('month', primera_compra)
      ORDER BY mes
    `, [orgId, meses])

    // Gastos comerciales por mes
    const gastos = await query(`
      SELECT periodo, categoria,
             SUM(monto) as total
      FROM gastos_comerciales
      WHERE org_id = $1
        AND periodo >= NOW() - INTERVAL '1 month' * $2
      GROUP BY periodo, categoria
      ORDER BY periodo
    `, [orgId, meses])

    const totalNuevos = clientesNuevos.rows.reduce((s: number, r: any) => s + parseInt(r.nuevos), 0)
    const totalGastos = gastos.rows.reduce((s: number, r: any) => s + parseFloat(r.total), 0)

    const fmt = (n: number) => `$${Number(n).toLocaleString('es-AR', { maximumFractionDigits: 0 })}`

    let message = `📊 **Customer Acquisition Cost — Últimos ${meses} meses**\n\n`

    if (totalGastos === 0) {
      message += `**Clientes nuevos**: ${totalNuevos}\n`
      message += `**Gastos comerciales**: Sin datos cargados\n`
      message += `**CAC**: No se puede calcular sin gastos comerciales.\n\n`
      message += `Para calcular el CAC, hay que cargar los gastos de ventas y marketing en la sección de gastos comerciales (salarios del equipo de ventas, publicidad, comisiones, ferias, etc.).`

      if (clientesNuevos.rows.length > 0) {
        message += `\n\n**Clientes nuevos por mes:**\n`
        for (const r of clientesNuevos.rows as any[]) {
          const mesStr = new Date(r.mes).toLocaleDateString('es-AR', { month: 'short', year: 'numeric' })
          message += `• ${mesStr}: ${r.nuevos} nuevos\n`
        }
      }
    } else {
      const cac = totalNuevos > 0 ? totalGastos / totalNuevos : 0

      message += `**Clientes nuevos**: ${totalNuevos}\n`
      message += `**Gastos comerciales**: ${fmt(totalGastos)}\n`
      message += `**CAC**: ${fmt(cac)} por cliente\n\n`

      // Monthly breakdown
      const mesesMap = new Map<string, { gastos: number; nuevos: number }>()

      for (const r of gastos.rows as any[]) {
        const key = new Date(r.periodo).toISOString().slice(0, 7)
        const entry = mesesMap.get(key) || { gastos: 0, nuevos: 0 }
        entry.gastos += parseFloat(r.total)
        mesesMap.set(key, entry)
      }
      for (const r of clientesNuevos.rows as any[]) {
        const key = new Date(r.mes).toISOString().slice(0, 7)
        const entry = mesesMap.get(key) || { gastos: 0, nuevos: 0 }
        entry.nuevos += parseInt(r.nuevos)
        mesesMap.set(key, entry)
      }

      message += `**Detalle mensual:**\n`
      for (const [mes, data] of [...mesesMap.entries()].sort()) {
        const mesStr = new Date(mes + '-01').toLocaleDateString('es-AR', { month: 'short', year: 'numeric' })
        const cacMes = data.nuevos > 0 ? fmt(data.gastos / data.nuevos) : 'N/A'
        message += `• ${mesStr}: ${data.nuevos} nuevos, ${fmt(data.gastos)} gastados, CAC: ${cacMes}\n`
      }

      // Gastos by category
      const categorias = new Map<string, number>()
      for (const r of gastos.rows as any[]) {
        categorias.set(r.categoria, (categorias.get(r.categoria) || 0) + parseFloat(r.total))
      }
      if (categorias.size > 0) {
        message += `\n**Por categoría:**\n`
        for (const [cat, total] of [...categorias.entries()].sort((a, b) => b[1] - a[1])) {
          message += `• ${cat}: ${fmt(total)}\n`
        }
      }
    }

    return { type: 'text', message }
  },
}

register(clvEntry)
register(cacEntry)
