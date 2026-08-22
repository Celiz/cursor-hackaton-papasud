import { z } from 'zod'
import { query } from '@locus/db'
import { register } from '../registry'
import { fetchUnreadEmails } from '../email/imap'
import type { CatalogEntry, QueryResult } from '../types'

const SALUDOS = [
  '☀️ Arrancamos con todo:',
  '☕ Tu resumen del día:',
  '🚀 Acá va lo de hoy:',
  '💪 Mirá cómo viene la cosa:',
  '🌅 Arranquemos:',
]

interface Turno {
  hora_inicio: string
  tipo: string
  estado: string
  contacto_nombre: string
  motivo: string | null
}

interface GoogleEvent {
  summary: string
  start: string
  end: string
}

async function fetchTurnos(orgId: string): Promise<Turno[]> {
  try {
    const res = await query<Turno>(`
      SELECT
        t.hora_inicio::text,
        t.tipo,
        t.estado,
        COALESCE(p.nombre, 'Sin nombre') AS contacto_nombre,
        t.motivo
      FROM turnos t
      LEFT JOIN org_contacts oc ON t.contacto_id = oc.id
      LEFT JOIN personas p ON oc.persona_id = p.id
      WHERE t.org_id = $1
        AND t.fecha = CURRENT_DATE
        AND t.estado NOT IN ('cancelada', 'rechazada', 'no_asistio', 'completada')
      ORDER BY t.hora_inicio
    `, [orgId])
    return res.rows
  } catch {
    return []
  }
}

async function fetchGoogleCalendarEvents(personaId: string): Promise<GoogleEvent[]> {
  try {
    // Check for active Google Calendar integration
    const intRes = await query<{
      access_token: string
      refresh_token: string
      calendar_id: string | null
    }>(`
      SELECT access_token, refresh_token, calendar_id
      FROM integraciones_google
      WHERE user_id = $1 AND tipo = 'calendar' AND estado = 'active'
      LIMIT 1
    `, [personaId])

    if (intRes.rows.length === 0 || !intRes.rows[0].access_token) return []

    const { access_token, calendar_id } = intRes.rows[0]
    const calId = calendar_id || 'primary'

    // Fetch today's events via Google Calendar REST API
    const now = new Date()
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const endOfDay = new Date(startOfDay.getTime() + 24 * 60 * 60 * 1000)

    const params = new URLSearchParams({
      timeMin: startOfDay.toISOString(),
      timeMax: endOfDay.toISOString(),
      singleEvents: 'true',
      orderBy: 'startTime',
      maxResults: '10',
    })

    const res = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calId)}/events?${params}`,
      {
        headers: { Authorization: `Bearer ${access_token}` },
        signal: AbortSignal.timeout(5000),
      }
    )

    if (!res.ok) return []

    const data = await res.json() as {
      items?: Array<{
        summary?: string
        start?: { dateTime?: string; date?: string }
        end?: { dateTime?: string; date?: string }
      }>
    }

    return (data.items || [])
      .filter(e => e.summary)
      .map(e => ({
        summary: e.summary!,
        start: e.start?.dateTime || e.start?.date || '',
        end: e.end?.dateTime || e.end?.date || '',
      }))
  } catch {
    return []
  }
}

async function fetchDolar(): Promise<{ blue_venta: number; oficial_venta: number } | null> {
  try {
    // Try from DB first (today's cotizaciones)
    const dbRes = await query<{ tipo: string; valor_venta: string }>(`
      SELECT tipo, valor_venta::text
      FROM cotizaciones
      WHERE fecha = CURRENT_DATE AND tipo IN ('blue', 'oficial')
    `, [])
    if (dbRes.rows.length >= 2) {
      const map: Record<string, number> = {}
      for (const r of dbRes.rows) map[r.tipo] = Number(r.valor_venta)
      return { blue_venta: map['blue'], oficial_venta: map['oficial'] }
    }

    // Fallback: fetch live from dolarapi.com
    const res = await fetch('https://dolarapi.com/v1/dolares', {
      signal: AbortSignal.timeout(5000),
    })
    if (!res.ok) return null
    const data = await res.json() as Array<{ casa: string; venta: number }>
    const blue = data.find(d => d.casa === 'blue')
    const oficial = data.find(d => d.casa === 'oficial')
    if (!blue || !oficial) return null
    return { blue_venta: blue.venta, oficial_venta: oficial.venta }
  } catch {
    return null
  }
}

const entry: CatalogEntry = {
  id: 'resumen_matutino_ventas',
  type: 'query',
  description:
    'Resumen matutino para ventas: dólar, turnos del día, calendario Google, CRM seguimiento, emails, contratos.',
  params: z.object({
    persona_id: z.string().optional(),
  }),
  async execute(orgId, params): Promise<QueryResult> {
    const personaId = params?.persona_id

    const [dolar, seguimientoRes, contratosRes, pipelineRes, unreadEmails, turnos, gcalEvents, nombreRes, actividadesCrmRes] = await Promise.all([
      fetchDolar(),

      // Oportunidades sin actividad en 7+ días (asignadas al vendedor si hay persona_id)
      query<{ nombre: string; cliente_nombre: string; etapa: string; dias: string; monto: string }>(`
        SELECT
          ov.nombre,
          COALESCE(c.nombre, ov.empresa_nombre, 'Sin cliente') AS cliente_nombre,
          ov.etapa,
          EXTRACT(DAY FROM NOW() - COALESCE(
            (SELECT MAX(oa.created_at) FROM oportunidades_actividades oa WHERE oa.oportunidad_id = ov.id),
            ov.created_at
          ))::int::text AS dias,
          COALESCE(ov.monto_estimado, 0)::text AS monto
        FROM oportunidades_venta ov
        LEFT JOIN clientes c ON ov.cliente_id = c.id
        WHERE ov.org_id = $1
          AND ov.estado NOT IN ('ganado', 'perdido', 'cancelado')
          ${personaId ? 'AND (ov.usuario_asignado_id = $2 OR ov.vendedor_id = $2)' : ''}
          AND NOT EXISTS (
            SELECT 1 FROM oportunidades_actividades oa
            WHERE oa.oportunidad_id = ov.id
              AND oa.created_at > NOW() - INTERVAL '7 days'
          )
        ORDER BY ov.monto_estimado DESC NULLS LAST
        LIMIT 5
      `, personaId ? [orgId, personaId] : [orgId]),

      // Contratos de equipos próximos a vencer (30 días)
      query<{ count: string }>(`
        SELECT COUNT(*)::text AS count
        FROM equipos_contratos ec
        JOIN equipos_unidades eu ON eu.id = ec.equipo_unidad_id
        WHERE eu.org_id = $1
          AND ec.estado = 'activo'
          AND ec.fecha_fin IS NOT NULL
          AND ec.fecha_fin BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '30 days'
      `, [orgId]),

      // Pipeline abierto resumen
      query<{ total: string; valor: string }>(`
        SELECT
          COUNT(*)::text AS total,
          COALESCE(SUM(monto_estimado::numeric), 0)::text AS valor
        FROM oportunidades_venta
        WHERE org_id = $1
          AND estado NOT IN ('ganado', 'perdido', 'cancelado')
          ${personaId ? 'AND (usuario_asignado_id = $2 OR vendedor_id = $2)' : ''}
      `, personaId ? [orgId, personaId] : [orgId]),

      // Emails no leídos (IMAP)
      personaId ? fetchUnreadEmails(orgId, personaId) : Promise.resolve({ connected: false, emails: [] }),

      // Turnos del día
      fetchTurnos(orgId),

      // Google Calendar events (silently skips if no integration)
      personaId ? fetchGoogleCalendarEvents(personaId) : Promise.resolve([]),

      // Nombre del usuario (para saludo dinámico)
      personaId
        ? query<{ nombre: string }>(`SELECT SPLIT_PART(nombre, ' ', 1) AS nombre FROM personas WHERE id = $1`, [personaId])
        : Promise.resolve({ rows: [] as { nombre: string }[] }),

      // Actividades CRM pendientes para hoy o vencidas
      query<{ tipo: string; titulo: string; fecha_limite: string; oportunidad_nombre: string | null; cliente_nombre: string | null }>(`
        SELECT
          ca.tipo,
          COALESCE(ca.titulo, ca.tipo) AS titulo,
          ca.fecha_limite::text,
          ov.nombre AS oportunidad_nombre,
          c.nombre AS cliente_nombre
        FROM crm_actividades ca
        LEFT JOIN oportunidades_venta ov ON ca.oportunidad_id = ov.id
        LEFT JOIN clientes c ON ca.cliente_id = c.id
        WHERE ca.org_id = $1
          AND ca.estado = 'pendiente'
          AND ca.fecha_limite <= CURRENT_DATE
        ORDER BY ca.fecha_limite ASC, ca.prioridad DESC
        LIMIT 10
      `, [orgId]),
    ])

    // Build message
    const nombre = nombreRes.rows[0]?.nombre || ''
    const saludoBase = SALUDOS[Math.floor(Math.random() * SALUDOS.length)]
    const saludo = nombre ? `Buen día ${nombre}! ${saludoBase}` : `Buen día! ${saludoBase}`
    const sections: string[] = []

    // Dólar
    if (dolar) {
      sections.push(`💵 **Dólar**: Blue $${dolar.blue_venta.toLocaleString('es-AR')} | Oficial $${dolar.oficial_venta.toLocaleString('es-AR')}`)
    }

    // Turnos del día
    if (turnos.length > 0) {
      const lines = turnos.map(t => {
        const hora = t.hora_inicio.slice(0, 5) // HH:MM
        const motivo = t.motivo ? ` — ${t.motivo}` : ''
        return `  • ${hora} ${t.contacto_nombre} (${t.tipo})${motivo}`
      })
      sections.push(`📅 **Turnos hoy** (${turnos.length}):\n${lines.join('\n')}`)
    }

    // Google Calendar events
    if (gcalEvents.length > 0) {
      const lines = gcalEvents.map(e => {
        const start = e.start.includes('T')
          ? new Date(e.start).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit', hour12: false })
          : 'Todo el día'
        return `  • ${start} ${e.summary}`
      })
      sections.push(`🗓️ **Calendario** (${gcalEvents.length}):\n${lines.join('\n')}`)
    }

    // Pipeline resumen
    const totalOps = Number(pipelineRes.rows[0]?.total || 0)
    const valorPipeline = Number(pipelineRes.rows[0]?.valor || 0)
    if (totalOps > 0) {
      sections.push(`📊 **Pipeline**: ${totalOps} oportunidad(es) abierta(s) por $${valorPipeline.toLocaleString('es-AR')}`)
    }

    // Seguimiento pendiente
    const pendientes = seguimientoRes.rows
    if (pendientes.length > 0) {
      const lines = pendientes.map(p =>
        `  • ${p.cliente_nombre} — "${p.nombre}" (${p.etapa}, ${p.dias}d sin contacto)`
      )
      sections.push(`📞 **Para llamar** (${pendientes.length} sin contacto hace +7 días):\n${lines.join('\n')}`)
    } else {
      sections.push(`📞 **Seguimiento**: Todo al día, crack! 🎯`)
    }

    // Actividades CRM pendientes
    const actsCrm = actividadesCrmRes.rows
    if (actsCrm.length > 0) {
      const lines = actsCrm.map(a => {
        const ctx = a.oportunidad_nombre || a.cliente_nombre || ''
        return `  • ${a.titulo}${ctx ? ` — ${ctx}` : ''}`
      })
      sections.push(`📌 **Actividades CRM para hoy** (${actsCrm.length}):\n${lines.join('\n')}`)
    }

    // Emails
    const imapResult = unreadEmails
    if (imapResult.connected && imapResult.emails.length > 0) {
      const lines = imapResult.emails.slice(0, 5).map(e =>
        `  • ${e.from} — "${e.subject}"`
      )
      const extra = imapResult.emails.length > 5 ? `\n  ...y ${imapResult.emails.length - 5} más` : ''
      sections.push(`📧 **Emails sin leer** (${imapResult.emails.length}):\n${lines.join('\n')}${extra}`)
    } else if (imapResult.connected) {
      sections.push(`📧 **Emails**: Bandeja limpia! ✨`)
    }
    // If !connected, silently skip the email section

    // Contratos
    const contratosVencer = Number(contratosRes.rows[0]?.count || 0)
    if (contratosVencer > 0) {
      sections.push(`📋 **Contratos**: ${contratosVencer} próximo(s) a vencer en 30 días`)
    }

    const message = `${saludo}\n\n${sections.join('\n\n')}\n\n¿Querés que te detalle algo?`

    return { type: 'text', message }
  },
}

register(entry)
export default entry
