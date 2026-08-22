import { query } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';

export const revalidate = 0;

/**
 * GET /api/clientes/[id]/emails
 * Lista el historial de emails enviados a un cliente específico
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session?.org_id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { id } = await params;
    const searchParams = request.nextUrl.searchParams;
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    // Primero obtener los emails del cliente (verificando org_id)
    const clienteResult = await query(
      `SELECT email FROM clientes WHERE id = $1 AND org_id = $2`,
      [id, session.org_id]
    );

    if (clienteResult.rows.length === 0) {
      return NextResponse.json({ error: 'Cliente no encontrado' }, { status: 404 });
    }

    const clienteEmails = clienteResult.rows[0].email || [];

    if (clienteEmails.length === 0) {
      return NextResponse.json({
        emails: [],
        total: 0,
        limit,
        offset,
        cliente_emails: [],
      });
    }

    // Buscar emails enviados a cualquiera de los emails del cliente
    // El campo 'para' es JSON con array de emails
    const emailsResult = await query(
      `SELECT
        em.id,
        em.subject AS asunto,
        em.body_html AS cuerpo_html,
        em.body_text AS cuerpo_texto,
        CASE WHEN em.is_sent THEN 'enviado' ELSE 'borrador' END AS estado,
        em.to_emails AS para,
        em.cc_emails AS cc,
        em.bcc_emails AS bcc,
        em.gmail_message_id,
        em.internal_date AS enviado_at,
        em.created_at,
        (em.opened_at IS NOT NULL) AS abierto,
        em.opened_at AS abierto_at,
        COALESCE(jsonb_array_length(em.clicked_links), 0) AS clicks,
        json_build_object(
          'email', ea.email,
          'nombre', ea.nombre
        ) as cuenta_remitente
      FROM email_messages em
      JOIN email_accounts ea ON em.account_id = ea.id
      WHERE ea.org_id = $2
        AND em.is_sent = true
        AND EXISTS (
          SELECT 1 FROM unnest($1::text[]) ce
          WHERE em.to_emails::text ILIKE '%' || ce || '%'
        )
      ORDER BY em.internal_date DESC NULLS LAST, em.created_at DESC
      LIMIT $3 OFFSET $4`,
      [clienteEmails, session.org_id, limit, offset]
    );

    // Contar total
    const countResult = await query(
      `SELECT COUNT(*) as total
       FROM email_messages em
       JOIN email_accounts ea ON em.account_id = ea.id
       WHERE ea.org_id = $2
         AND em.is_sent = true
         AND EXISTS (
           SELECT 1 FROM unnest($1::text[]) ce
           WHERE em.to_emails::text ILIKE '%' || ce || '%'
         )`,
      [clienteEmails, session.org_id]
    );

    // Obtener estadísticas
    const statsResult = await query(
      `SELECT
        COUNT(*) as total_enviados,
        COUNT(*) FILTER (WHERE em.is_sent) as enviados_exitosos,
        0 as con_error,
        COUNT(*) FILTER (WHERE em.opened_at IS NOT NULL) as abiertos,
        COALESCE(SUM(jsonb_array_length(em.clicked_links)), 0) as total_clicks,
        MIN(em.internal_date) as primer_email,
        MAX(em.internal_date) as ultimo_email
      FROM email_messages em
      JOIN email_accounts ea ON em.account_id = ea.id
      WHERE ea.org_id = $2
        AND em.is_sent = true
        AND EXISTS (
          SELECT 1 FROM unnest($1::text[]) ce
          WHERE em.to_emails::text ILIKE '%' || ce || '%'
        )`,
      [clienteEmails, session.org_id]
    );

    const stats = statsResult.rows[0] || {};

    // Calcular tasa de apertura
    const tasaApertura = parseInt(stats.total_enviados) > 0
      ? (parseInt(stats.abiertos) / parseInt(stats.total_enviados)) * 100
      : 0;

    return NextResponse.json({
      emails: emailsResult.rows.map((email: any) => ({
        ...email,
        para: typeof email.para === 'string' ? JSON.parse(email.para) : email.para,
        cc: email.cc ? (typeof email.cc === 'string' ? JSON.parse(email.cc) : email.cc) : null,
        bcc: email.bcc ? (typeof email.bcc === 'string' ? JSON.parse(email.bcc) : email.bcc) : null,
      })),
      total: parseInt(countResult.rows[0].total),
      limit,
      offset,
      cliente_emails: clienteEmails,
      estadisticas: {
        total_enviados: parseInt(stats.total_enviados) || 0,
        enviados_exitosos: parseInt(stats.enviados_exitosos) || 0,
        con_error: parseInt(stats.con_error) || 0,
        abiertos: parseInt(stats.abiertos) || 0,
        total_clicks: parseInt(stats.total_clicks) || 0,
        tasa_apertura: Math.round(tasaApertura * 10) / 10,
        primer_email: stats.primer_email,
        ultimo_email: stats.ultimo_email,
      },
    });
  } catch (error: any) {
    console.error('Error fetching client emails:', error);
    return NextResponse.json(
      { error: 'Error al obtener historial de emails', details: error.message },
      { status: 500 }
    );
  }
}
