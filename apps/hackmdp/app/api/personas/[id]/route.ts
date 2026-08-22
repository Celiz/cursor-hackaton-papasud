import { query } from '@/lib/db';
import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { parseContactList } from '@/lib/contact-fields';

export const revalidate = 0;

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session?.org_id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { id } = await params;
    const result = await query(
      `SELECT p.*
         FROM personas p
        WHERE p.id = $1 AND p.org_id = $2
        LIMIT 1`,
      [id, session.org_id]
    );

    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'Persona no encontrada' }, { status: 404 });
    }
    const persona = result.rows[0];
    return NextResponse.json({
      ...persona,
      email: parseContactList(persona.email),
      telefono: parseContactList(persona.telefono),
    });
  } catch (error: any) {
    console.error('Error in GET /api/personas/[id]:', error);
    return NextResponse.json(
      { error: 'Error al cargar persona', details: error.message },
      { status: 500 }
    );
  }
}
