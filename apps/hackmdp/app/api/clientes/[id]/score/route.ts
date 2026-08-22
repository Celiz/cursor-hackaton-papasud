import { query } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { calcularScoreCliente } from '@/lib/crm/score';

export const revalidate = 0;

/**
 * GET — calcula (y persiste) el score del cliente.
 * La lógica vive en @/lib/crm/score (reusada por el recálculo masivo).
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
    const result = await calcularScoreCliente(id, session.org_id);
    if (!result) {
      return NextResponse.json({ error: 'Cliente no encontrado' }, { status: 404 });
    }

    return NextResponse.json(result);
  } catch (error: any) {
    console.error('Error calculating client score:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

/**
 * POST — recalcula el score de TODOS los clientes del org, en proceso.
 * (Antes se auto-llamaba por HTTP sin cookie → 401 y no guardaba nada.)
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session?.org_id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const clientes = await query(`SELECT id FROM clientes WHERE org_id = $1`, [session.org_id]);

    let procesados = 0;
    let conScore = 0;
    let sinDatos = 0;
    for (const cliente of clientes.rows) {
      try {
        const r = await calcularScoreCliente(cliente.id, session.org_id);
        if (r) {
          procesados++;
          if (r.score === null) sinDatos++; else conScore++;
        }
      } catch (err) {
        console.error(`Error score cliente ${cliente.id}:`, err);
      }
    }

    return NextResponse.json({ procesados, con_score: conScore, sin_datos: sinDatos });
  } catch (error: any) {
    console.error('Error recalculating scores:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
