import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { query } from '@/lib/db';

export const revalidate = 0;

/**
 * GET /api/notificaciones
 * Lista las notificaciones del usuario actual.
 * ?unread_only=true → solo no leídas
 * ?limit=N → default 20
 * Incluye metadata.url para navegación al hacer click.
 */
export async function GET(request: Request) {
  try {
    const session = await getSession();
    if (!session?.persona_id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const url = new URL(request.url);
    const unreadOnly = url.searchParams.get('unread_only') === 'true';
    const limit = Math.min(parseInt(url.searchParams.get('limit') || '20', 10), 100);

    const result = await query(
      `SELECT id, titulo, mensaje, tipo, leida, metadata, created_at
       FROM notificaciones
       WHERE persona_id = $1
         ${unreadOnly ? 'AND leida = false' : ''}
       ORDER BY created_at DESC
       LIMIT $2`,
      [session.persona_id, limit]
    );

    // Además devolvemos el count de no leídas para el badge del header
    const unreadCountRes = await query(
      `SELECT COUNT(*)::int AS count
       FROM notificaciones
       WHERE persona_id = $1 AND leida = false`,
      [session.persona_id]
    );

    return NextResponse.json({
      notificaciones: result.rows,
      unread_count: unreadCountRes.rows[0]?.count || 0,
    });
  } catch (error: any) {
    console.error('Error GET /api/notificaciones:', error);
    return NextResponse.json({ error: error?.message }, { status: 500 });
  }
}

/**
 * PATCH /api/notificaciones
 * Marca una o varias notificaciones como leídas.
 * Body: { ids: string[] } o { all: true } para marcar todas
 */
export async function PATCH(request: Request) {
  try {
    const session = await getSession();
    if (!session?.persona_id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const body = await request.json();

    if (body.all === true) {
      await query(
        `UPDATE notificaciones SET leida = true WHERE persona_id = $1 AND leida = false`,
        [session.persona_id]
      );
      return NextResponse.json({ ok: true });
    }

    if (!Array.isArray(body.ids) || body.ids.length === 0) {
      return NextResponse.json({ error: 'ids[] o all:true requerido' }, { status: 400 });
    }

    await query(
      `UPDATE notificaciones SET leida = true
       WHERE id = ANY($1::uuid[]) AND persona_id = $2`,
      [body.ids, session.persona_id]
    );
    return NextResponse.json({ ok: true });
  } catch (error: any) {
    console.error('Error PATCH /api/notificaciones:', error);
    return NextResponse.json({ error: error?.message }, { status: 500 });
  }
}

/**
 * DELETE /api/notificaciones?id=xxx
 * Elimina una notificación.
 */
export async function DELETE(request: Request) {
  try {
    const session = await getSession();
    if (!session?.persona_id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const id = new URL(request.url).searchParams.get('id');
    if (!id) {
      return NextResponse.json({ error: 'id requerido' }, { status: 400 });
    }

    await query(
      `DELETE FROM notificaciones WHERE id = $1 AND persona_id = $2`,
      [id, session.persona_id]
    );
    return NextResponse.json({ ok: true });
  } catch (error: any) {
    console.error('Error DELETE /api/notificaciones:', error);
    return NextResponse.json({ error: error?.message }, { status: 500 });
  }
}
