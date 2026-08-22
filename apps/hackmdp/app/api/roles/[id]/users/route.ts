import { query } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';

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

    const result = await query(
      `SELECT COUNT(*) as count FROM perfiles WHERE rol_id = $1 AND org_id = $2`,
      [id, session.org_id]
    );

    const count = parseInt(result.rows[0]?.count || '0');

    return NextResponse.json({ count });
  } catch (error: any) {
    console.error('Error in GET /api/roles/[id]/users:', error);
    return NextResponse.json(
      { error: 'Error al contar usuarios', details: error.message },
      { status: 500 }
    );
  }
}
